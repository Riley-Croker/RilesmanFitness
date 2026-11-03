// Shared SQL query helpers used by both API routes and server components.

import { db } from "@/lib/db";
import { DEFAULT_UNIT, type WeightUnit } from "@/lib/units";
import { HISTORY_SESSIONS, type ExerciseHistory } from "@/lib/exercise-history";
import type {
  PersonalRecord,
  ProgressPoint,
  Template,
  Workout,
  WorkoutSummary,
} from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// The user's preferred display unit ("lbs" default). Weights in the DB
// are always lbs; conversion happens at the display/input boundary.
export async function getWeightUnit(userId: string): Promise<WeightUnit> {
  const [rows] = await db.execute("SELECT weight_unit FROM users WHERE id = ?", [userId]);
  const unit = (rows as any[])[0]?.weight_unit;
  return unit === "kg" ? "kg" : DEFAULT_UNIT;
}

export async function getWorkoutSummaries(userId: string, limit?: number): Promise<WorkoutSummary[]> {
  const limitClause = limit ? ` LIMIT ${Math.floor(limit)}` : "";
  const [rows] = await db.execute(
    `SELECT w.id, w.name, w.date, w.notes,
            COUNT(DISTINCT we.id) AS exerciseCount,
            COUNT(s.id) AS setCount,
            COALESCE(SUM(s.reps * s.weight), 0) AS totalVolume
     FROM workouts w
     LEFT JOIN workout_exercises we ON we.workout_id = w.id
     LEFT JOIN sets s ON s.workout_exercise_id = we.id
     WHERE w.user_id = ?
     GROUP BY w.id, w.name, w.date, w.notes
     ORDER BY w.date DESC${limitClause}`,
    [userId]
  );
  return (rows as any[]).map((r) => ({
    ...r,
    date: new Date(r.date).toISOString(),
    totalVolume: Number(r.totalVolume),
    exerciseCount: Number(r.exerciseCount),
    setCount: Number(r.setCount),
  }));
}

export async function getWorkoutDetail(userId: string, workoutId: string): Promise<Workout | null> {
  const [wRows] = await db.execute(
    "SELECT id, name, date, notes, started_at, finished_at FROM workouts WHERE id = ? AND user_id = ?",
    [workoutId, userId]
  );
  const workout = (wRows as any[])[0];
  if (!workout) return null;

  const [exRows] = await db.execute(
    `SELECT we.id, we.exercise_id, we.name, we.body_part, we.equipment, we.target_muscle,
            s.id AS set_id, s.reps, s.weight, s.sort_order AS set_order
     FROM workout_exercises we
     LEFT JOIN sets s ON s.workout_exercise_id = we.id
     WHERE we.workout_id = ?
     ORDER BY we.sort_order, s.sort_order`,
    [workoutId]
  );

  const exercises = new Map<string, Workout["exercises"][number]>();
  for (const row of exRows as any[]) {
    if (!exercises.has(row.id)) {
      exercises.set(row.id, {
        id: row.id,
        exerciseId: row.exercise_id,
        name: row.name,
        bodyPart: row.body_part,
        equipment: row.equipment,
        targetMuscle: row.target_muscle,
        sets: [],
      });
    }
    if (row.set_id) {
      exercises.get(row.id)!.sets.push({
        id: row.set_id,
        reps: Number(row.reps),
        weight: Number(row.weight),
      });
    }
  }

  return {
    id: workout.id,
    name: workout.name,
    date: new Date(workout.date).toISOString(),
    notes: workout.notes,
    startedAt: workout.started_at ? new Date(workout.started_at).toISOString() : null,
    finishedAt: workout.finished_at ? new Date(workout.finished_at).toISOString() : null,
    exercises: [...exercises.values()],
  };
}

// How often the user has done each catalogue exercise: exerciseId -> number
// of their workouts it appeared in (not sets - 4 sets in one workout counts
// once). Drives the "what you do most comes first" ranking and the "You: 12×"
// badge in exercise search. Custom exercises have no id, so they're skipped.
export async function getExerciseUsage(userId: string): Promise<Map<string, number>> {
  const [rows] = await db.execute(
    `SELECT we.exercise_id, COUNT(DISTINCT we.workout_id) AS times
     FROM workout_exercises we
     JOIN workouts w ON w.id = we.workout_id
     WHERE w.user_id = ? AND we.exercise_id IS NOT NULL
     GROUP BY we.exercise_id`,
    [userId]
  );
  return new Map((rows as any[]).map((r) => [r.exercise_id, Number(r.times)]));
}

// The best weighted set per exercise from every workout logged BEFORE the
// given one, keyed by exercise name - what the summary compares against to
// award a PR badge. "Best" and "weighted only" follow getPersonalRecords
// exactly, so the badge and the Records page never disagree. "Before" means
// an earlier date, or the same date but saved earlier.
export async function getPreviousBests(
  userId: string,
  workoutId: string
): Promise<Map<string, { weight: number; reps: number }>> {
  const [rows] = await db.execute(
    `SELECT name, weight, reps FROM (
       SELECT we.name, s.weight, s.reps,
              ROW_NUMBER() OVER (PARTITION BY we.name ORDER BY s.weight DESC, s.reps DESC) AS rn
       FROM workouts cur
       JOIN workouts w ON w.user_id = cur.user_id AND w.id <> cur.id
                      AND (w.date < cur.date OR (w.date = cur.date AND w.created_at < cur.created_at))
       JOIN workout_exercises we ON we.workout_id = w.id
       JOIN sets s ON s.workout_exercise_id = we.id
       WHERE cur.id = ? AND cur.user_id = ? AND s.weight > 0
     ) ranked
     WHERE rn = 1`,
    [workoutId, userId]
  );
  return new Map(
    (rows as any[]).map((r) => [r.name, { weight: Number(r.weight), reps: Number(r.reps) }])
  );
}

export async function getTemplates(userId: string): Promise<Template[]> {
  const [tRows] = await db.execute(
    "SELECT id, name, description FROM templates WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  const templates = (tRows as any[]).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    exercises: [] as Template["exercises"],
  }));
  if (templates.length === 0) return [];

  const ids = templates.map((t) => t.id);
  const placeholders = ids.map(() => "?").join(",");
  const [eRows] = await db.execute(
    `SELECT id, template_id, exercise_id, name, body_part, equipment, target_muscle, target_sets, target_reps
     FROM template_exercises WHERE template_id IN (${placeholders}) ORDER BY sort_order`,
    ids
  );
  const byTemplate = new Map(templates.map((t) => [t.id, t]));
  for (const row of eRows as any[]) {
    byTemplate.get(row.template_id)?.exercises.push({
      id: row.id,
      exerciseId: row.exercise_id,
      name: row.name,
      bodyPart: row.body_part,
      equipment: row.equipment,
      targetMuscle: row.target_muscle,
      targetSets: Number(row.target_sets),
      targetReps: Number(row.target_reps),
    });
  }
  return templates;
}

export async function getTemplate(userId: string, templateId: string): Promise<Template | null> {
  const templates = await getTemplates(userId);
  return templates.find((t) => t.id === templateId) ?? null;
}

// Time series for one exercise (matched by name): max weight, session
// volume, and estimated one-rep max (Epley formula) per workout date.
export async function getExerciseProgress(userId: string, exerciseName: string): Promise<ProgressPoint[]> {
  const [rows] = await db.execute(
    `SELECT w.date,
            MAX(s.weight) AS maxWeight,
            SUM(s.reps * s.weight) AS volume,
            MAX(s.weight * (1 + s.reps / 30)) AS est1rm
     FROM workouts w
     JOIN workout_exercises we ON we.workout_id = w.id
     JOIN sets s ON s.workout_exercise_id = we.id
     WHERE w.user_id = ? AND we.name = ?
     GROUP BY w.id, w.date
     ORDER BY w.date`,
    [userId, exerciseName]
  );
  return (rows as any[]).map((r) => ({
    date: new Date(r.date).toISOString(),
    maxWeight: Number(r.maxWeight),
    volume: Number(r.volume),
    est1rm: Math.round(Number(r.est1rm) * 10) / 10,
  }));
}

// Distinct exercises the user has logged (for progress-page dropdown).
export async function getLoggedExerciseNames(userId: string): Promise<string[]> {
  const [rows] = await db.execute(
    `SELECT DISTINCT we.name
     FROM workout_exercises we
     JOIN workouts w ON w.id = we.workout_id
     WHERE w.user_id = ?
     ORDER BY we.name`,
    [userId]
  );
  return (rows as any[]).map((r) => r.name);
}

// Best (heaviest) set per exercise, with estimated 1RM.
export async function getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  const [rows] = await db.execute(
    `SELECT exercise, exerciseId, weight, reps, date, est1rm FROM (
       SELECT we.name AS exercise, we.exercise_id AS exerciseId,
              s.weight, s.reps, w.date,
              ROUND(s.weight * (1 + s.reps / 30), 1) AS est1rm,
              ROW_NUMBER() OVER (PARTITION BY we.name ORDER BY s.weight DESC, s.reps DESC) AS rn
       FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN workouts w ON w.id = we.workout_id
       WHERE w.user_id = ? AND s.weight > 0
     ) ranked
     WHERE rn = 1
     ORDER BY weight DESC`,
    [userId]
  );
  return (rows as any[]).map((r) => ({
    exercise: r.exercise,
    exerciseId: r.exerciseId,
    weight: Number(r.weight),
    reps: Number(r.reps),
    date: new Date(r.date).toISOString(),
    est1rm: Number(r.est1rm),
  }));
}

// Workouts grouped by calendar day for a given month (1-12).
export async function getMonthWorkouts(userId: string, year: number, month: number) {
  const [rows] = await db.execute(
    `SELECT id, name, date FROM workouts
     WHERE user_id = ? AND YEAR(date) = ? AND MONTH(date) = ?
     ORDER BY date`,
    [userId, year, month]
  );
  const byDay = new Map<number, { id: string; name: string }[]>();
  for (const r of rows as any[]) {
    const day = new Date(r.date).getDate();
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push({ id: r.id, name: r.name });
  }
  return byDay;
}

// Dashboard headline numbers.
export async function getDashboardStats(userId: string) {
  const [rows] = await db.execute(
    `SELECT
       (SELECT COUNT(*) FROM workouts WHERE user_id = ?) AS totalWorkouts,
       (SELECT COUNT(*) FROM workouts WHERE user_id = ? AND date >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS workoutsThisWeek,
       (SELECT COALESCE(SUM(s.reps * s.weight), 0)
          FROM sets s
          JOIN workout_exercises we ON we.id = s.workout_exercise_id
          JOIN workouts w ON w.id = we.workout_id
          WHERE w.user_id = ? AND w.date >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS volumeThisWeek,
       (SELECT COUNT(*)
          FROM sets s
          JOIN workout_exercises we ON we.id = s.workout_exercise_id
          JOIN workouts w ON w.id = we.workout_id
          WHERE w.user_id = ?) AS totalSets`,
    [userId, userId, userId, userId]
  );
  const r = (rows as any[])[0];
  return {
    totalWorkouts: Number(r.totalWorkouts),
    workoutsThisWeek: Number(r.workoutsThisWeek),
    volumeThisWeek: Number(r.volumeThisWeek),
    totalSets: Number(r.totalSets),
  };
}

// The last few sessions and all-time best set of several exercises at once,
// for the workout logger (see src/lib/exercise-history.ts). `keys` come from
// historyKey(): "id:<exerciseId>" for catalogue exercises, "name:<lowercase
// name>" for custom ones. Every key asked for gets an entry, empty if never
// logged, so the browser can tell "nothing yet" from "still loading".
export async function getRecentExerciseHistory(
  userId: string,
  keys: string[]
): Promise<Record<string, ExerciseHistory>> {
  const result: Record<string, ExerciseHistory> = {};
  const ids: string[] = [];
  const names: string[] = [];
  for (const key of keys) {
    result[key] = { sessions: [], best: null };
    if (key.startsWith("id:")) ids.push(key.slice(3));
    else if (key.startsWith("name:")) names.push(key.slice(5));
  }
  if (ids.length === 0 && names.length === 0) return result;

  // The same key expression the client builds, computed per row in SQL.
  // Names compare case-insensitively under the table's default collation.
  const keyExpr = `CASE WHEN we.exercise_id IS NOT NULL THEN CONCAT('id:', we.exercise_id)
                        ELSE CONCAT('name:', LOWER(TRIM(we.name))) END`;
  const filters: string[] = [];
  if (ids.length) filters.push(`we.exercise_id IN (${ids.map(() => "?").join(", ")})`);
  if (names.length) {
    filters.push(`(we.exercise_id IS NULL AND TRIM(we.name) IN (${names.map(() => "?").join(", ")}))`);
  }
  const where = `w.user_id = ? AND (${filters.join(" OR ")})`;
  const params = [userId, ...ids, ...names];

  // Sessions: number each exercise's workouts newest first and keep the top
  // few. DENSE_RANK over the workout gives an exercise logged twice in one
  // workout the same number, so it still counts as one session. Exercises
  // whose sets were all left empty (and so not saved) are skipped.
  const [sessionRows] = await db.execute(
    `SELECT r.k, r.workoutId, r.workoutName, r.date, s.reps, s.weight
     FROM (
       SELECT ${keyExpr} AS k, we.id AS weId, we.sort_order AS exOrder,
              w.id AS workoutId, w.name AS workoutName, w.date, w.created_at,
              DENSE_RANK() OVER (
                PARTITION BY ${keyExpr}
                ORDER BY w.date DESC, w.created_at DESC, w.id
              ) AS rk
       FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
       WHERE ${where}
         AND EXISTS (SELECT 1 FROM sets x WHERE x.workout_exercise_id = we.id)
     ) r
     JOIN sets s ON s.workout_exercise_id = r.weId
     WHERE r.rk <= ?
     ORDER BY r.k, r.date DESC, r.created_at DESC, r.workoutId, r.exOrder, s.sort_order`,
    [...params, HISTORY_SESSIONS]
  );
  for (const r of sessionRows as any[]) {
    const entry = result[r.k];
    if (!entry) continue;
    let session = entry.sessions[entry.sessions.length - 1];
    if (session?.workoutId !== r.workoutId) {
      session = {
        workoutId: r.workoutId,
        workoutName: r.workoutName,
        date: new Date(r.date).toISOString(),
        sets: [],
      };
      entry.sessions.push(session);
    }
    session.sets.push({ reps: Number(r.reps), weight: Number(r.weight) });
  }

  // All-time best: heaviest set, then most reps, earliest on a tie (the
  // day the record was first set).
  const [bestRows] = await db.execute(
    `SELECT k, reps, weight, date, workoutId FROM (
       SELECT ${keyExpr} AS k, s.reps, s.weight, w.date, w.id AS workoutId,
              ROW_NUMBER() OVER (
                PARTITION BY ${keyExpr}
                ORDER BY s.weight DESC, s.reps DESC, w.date
              ) AS rn
       FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN workouts w ON w.id = we.workout_id
       WHERE ${where}
     ) b
     WHERE rn = 1`,
    params
  );
  for (const r of bestRows as any[]) {
    const entry = result[r.k];
    if (!entry) continue;
    entry.best = {
      reps: Number(r.reps),
      weight: Number(r.weight),
      date: new Date(r.date).toISOString(),
      workoutId: r.workoutId,
    };
  }

  return result;
}

// Recent history of one exercise (by ExerciseDB id) for the detail page.
export async function getExerciseHistory(userId: string, exerciseDbId: string) {
  const [rows] = await db.execute(
    `SELECT w.id AS workoutId, w.name AS workoutName, w.date, s.reps, s.weight
     FROM sets s
     JOIN workout_exercises we ON we.id = s.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE w.user_id = ? AND we.exercise_id = ?
     ORDER BY w.date DESC, s.sort_order
     LIMIT 30`,
    [userId, exerciseDbId]
  );
  return (rows as any[]).map((r) => ({
    workoutId: r.workoutId as string,
    workoutName: r.workoutName as string,
    date: new Date(r.date).toISOString(),
    reps: Number(r.reps),
    weight: Number(r.weight),
  }));
}
