// GET  /api/workouts — list the signed-in user's workouts (summaries)
// POST /api/workouts — create a workout with exercises and sets

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { WorkoutInput } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
     ORDER BY w.date DESC`,
    [session.user.id]
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as WorkoutInput;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Workout name is required" }, { status: 400 });
  }
  if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
    return NextResponse.json({ error: "Add at least one exercise" }, { status: 400 });
  }

  const workoutId = crypto.randomUUID();
  // A bare YYYY-MM-DD would be parsed as UTC midnight and can land on the
  // previous local day — pin date-only values to local noon instead.
  const date = body.date
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(body.date) ? `${body.date}T12:00:00` : body.date)
    : new Date();

  await db.execute(
    "INSERT INTO workouts (id, user_id, name, date, notes) VALUES (?, ?, ?, ?, ?)",
    [workoutId, session.user.id, body.name.trim(), date, body.notes?.trim() || null]
  );

  for (let i = 0; i < body.exercises.length; i++) {
    const ex = body.exercises[i];
    const exId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO workout_exercises (id, workout_id, exercise_id, name, body_part, equipment, target_muscle, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [exId, workoutId, ex.exerciseId || null, ex.name, ex.bodyPart || null, ex.equipment || null, ex.targetMuscle || null, i]
    );
    const sets = (ex.sets || []).filter((s) => s.reps > 0);
    for (let j = 0; j < sets.length; j++) {
      await db.execute(
        "INSERT INTO sets (id, workout_exercise_id, reps, weight, sort_order) VALUES (?, ?, ?, ?, ?)",
        [crypto.randomUUID(), exId, Math.floor(sets[j].reps), Math.max(0, sets[j].weight || 0), j]
      );
    }
  }

  return NextResponse.json({ id: workoutId }, { status: 201 });
}
