// Local exercise catalogue backed by ExerciseDB's free tier
// (https://oss.exercisedb.dev): 1,285 exercises, each with an animated GIF,
// instructions, target/secondary muscles, body parts and equipment.
//
// The JSON lives in src/data/exercisedb.json, so browsing and search never
// call ExerciseDB — the free API is rate limited and not meant for runtime
// use. Only the GIFs load from ExerciseDB's CDN, in the browser. To refresh
// the data (it's already de-duplicated and GIF-checked): npm run data:exercises
//
// This is the third source. The app started on the ExerciseDB API, moved to
// free-exercise-db (public-domain photos) when ExerciseDB's GIF CDN went
// offline in July 2026, and came back here in Sep 2026 once the CDN
// returned — for the animations and the wider catalogue.

import rawData from "@/data/exercisedb.json";
import { COMMON, STAPLE } from "@/data/exercise-popularity";
import type { Exercise, ExercisePage } from "@/types";

// Popularity tier per exercise id: 0 = staple, 1 = common, missing = the rest.
const TIER = new Map<string, number>([
  ...STAPLE.map((id) => [id, 0] as const),
  ...COMMON.map((id) => [id, 1] as const),
]);
const tierOf = (id: string) => TIER.get(id) ?? 2;

interface RawExercise {
  exerciseId: string;
  name: string;
  gifUrl: string;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

const EXERCISES: Exercise[] = (rawData as RawExercise[]).map((raw) => ({
  exerciseId: raw.exerciseId,
  name: raw.name,
  images: [raw.gifUrl],
  bodyParts: raw.bodyParts,
  equipments: raw.equipments,
  targetMuscles: raw.targetMuscles,
  secondaryMuscles: raw.secondaryMuscles,
  instructions: raw.instructions,
}));

const BY_ID = new Map(EXERCISES.map((e) => [e.exerciseId, e]));

export async function getBodyParts(): Promise<string[]> {
  return [...new Set(EXERCISES.flatMap((e) => e.bodyParts))].sort();
}

export async function getEquipments(): Promise<string[]> {
  return [...new Set(EXERCISES.flatMap((e) => e.equipments))].sort();
}

export async function getMuscles(): Promise<string[]> {
  return [...new Set(EXERCISES.flatMap((e) => e.targetMuscles))].sort();
}

export interface ExerciseQuery {
  search?: string;
  bodyPart?: string;
  equipment?: string;
  muscle?: string;
  after?: string; // numeric offset cursor
  limit?: number;
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// How well an exercise matches the search words, or null if it doesn't:
// 0 exact name, 1 name starts with the query, 2 every word is in the name,
// 3 matched via target muscles/equipment.
function textScore(e: Exercise, words: string[]): number | null {
  const name = normalise(e.name);
  const haystack = `${name} ${e.targetMuscles.join(" ")} ${e.equipments.join(" ")}`;
  if (!words.every((w) => haystack.includes(w))) return null;
  const joined = words.join(" ");
  if (name === joined) return 0;
  if (name.startsWith(joined)) return 1;
  if (words.every((w) => name.includes(w))) return 2;
  return 3;
}

// `usage` is the signed-in user's exercise history: exerciseId -> number of
// workouts it appeared in (getExerciseUsage in queries.ts). Omit it for
// logged-out visitors; ranking then starts at popularity.
//
// Order, each step only breaking ties in the one before:
//   1. what you've done most
//   2. popularity tier: staple, common, the rest (src/data/exercise-popularity.ts)
//   3. how well the name matches the search, if there is one
//   4. alphabetical
// So searching "bench" or filtering to chest leads with barbell bench press,
// unless you've been doing something else more.
export async function getExercises(
  query: ExerciseQuery = {},
  usage?: ReadonlyMap<string, number>
): Promise<ExercisePage> {
  const limit = Math.min(Math.max(query.limit ?? 12, 1), 50);

  let results = EXERCISES;
  if (query.bodyPart) results = results.filter((e) => e.bodyParts.includes(query.bodyPart!));
  if (query.equipment) results = results.filter((e) => e.equipments.includes(query.equipment!));
  if (query.muscle) results = results.filter((e) => e.targetMuscles.includes(query.muscle!));

  const words = query.search ? normalise(query.search).split(" ").filter(Boolean) : [];
  const ranked = results
    .map((e) => ({ e, text: words.length ? textScore(e, words) : 0 }))
    .filter((x): x is { e: Exercise; text: number } => x.text !== null)
    .map((x) => ({ ...x, done: usage?.get(x.e.exerciseId) ?? 0, tier: tierOf(x.e.exerciseId) }))
    .sort(
      (a, b) =>
        b.done - a.done || a.tier - b.tier || a.text - b.text || a.e.name.localeCompare(b.e.name)
    );

  const offset = Math.max(0, parseInt(query.after ?? "0", 10) || 0);
  // Copies, so the shared catalogue objects never carry one user's count.
  const page = ranked
    .slice(offset, offset + limit)
    .map(({ e, done }) => (done > 0 ? { ...e, timesDone: done } : e));
  const hasNextPage = offset + limit < ranked.length;

  return {
    exercises: page,
    total: ranked.length,
    hasNextPage,
    nextCursor: hasNextPage ? String(offset + limit) : null,
  };
}

export async function getExercise(exerciseId: string): Promise<Exercise | null> {
  return BY_ID.get(exerciseId) ?? null;
}
