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
import type { Exercise, ExercisePage } from "@/types";

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

export async function getExercises(query: ExerciseQuery = {}): Promise<ExercisePage> {
  const limit = Math.min(Math.max(query.limit ?? 12, 1), 50);

  let results = EXERCISES;
  if (query.bodyPart) results = results.filter((e) => e.bodyParts.includes(query.bodyPart!));
  if (query.equipment) results = results.filter((e) => e.equipments.includes(query.equipment!));
  if (query.muscle) results = results.filter((e) => e.targetMuscles.includes(query.muscle!));

  if (query.search) {
    const words = normalise(query.search).split(" ").filter(Boolean);
    const scored = results
      .map((e) => {
        const name = normalise(e.name);
        const haystack = `${name} ${e.targetMuscles.join(" ")} ${e.equipments.join(" ")}`;
        if (!words.every((w) => haystack.includes(w))) return null;
        // Rank: exact name > name starts with query > all words in name > matched via muscles/equipment.
        const joined = words.join(" ");
        let score = 3;
        if (name === joined) score = 0;
        else if (name.startsWith(joined)) score = 1;
        else if (words.every((w) => name.includes(w))) score = 2;
        return { e, score };
      })
      .filter((x): x is { e: Exercise; score: number } => x !== null)
      .sort((a, b) => a.score - b.score || a.e.name.localeCompare(b.e.name));
    results = scored.map((x) => x.e);
  }

  const offset = Math.max(0, parseInt(query.after ?? "0", 10) || 0);
  const page = results.slice(offset, offset + limit);
  const hasNextPage = offset + limit < results.length;

  return {
    exercises: page,
    total: results.length,
    hasNextPage,
    nextCursor: hasNextPage ? String(offset + limit) : null,
  };
}

export async function getExercise(exerciseId: string): Promise<Exercise | null> {
  return BY_ID.get(exerciseId) ?? null;
}
