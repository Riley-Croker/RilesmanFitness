// Local exercise catalogue backed by the open-source free-exercise-db
// dataset (https://github.com/yuhonas/free-exercise-db, public domain):
// 873 exercises, each with two demonstration photos (start/end position),
// instructions, muscles, equipment, and difficulty level.
//
// The JSON lives in src/data/exercises.json, so browsing and search work
// entirely offline — only the photos load from a CDN (jsDelivr, backed by
// the GitHub repo). This replaced the ExerciseDB API integration after
// its GIF CDN went offline.

import rawData from "@/data/exercises.json";
import type { Exercise, ExercisePage } from "@/types";

const IMAGE_BASE = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/";

// free-exercise-db tags exercises with specific muscles; the app's
// browse-by-body-part filter groups them into ExerciseDB-style regions.
const MUSCLE_TO_BODY_PART: Record<string, string> = {
  biceps: "upper arms",
  triceps: "upper arms",
  forearms: "lower arms",
  quadriceps: "upper legs",
  hamstrings: "upper legs",
  abductors: "upper legs",
  adductors: "upper legs",
  glutes: "upper legs",
  calves: "lower legs",
  chest: "chest",
  lats: "back",
  "middle back": "back",
  "lower back": "back",
  traps: "back",
  shoulders: "shoulders",
  abdominals: "waist",
  neck: "neck",
};

interface RawExercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

const EXERCISES: Exercise[] = (rawData as RawExercise[])
  .map((raw) => ({
    exerciseId: raw.id,
    name: raw.name,
    images: raw.images.map((img) => IMAGE_BASE + encodeURI(img)),
    bodyParts: [...new Set(raw.primaryMuscles.map((m) => MUSCLE_TO_BODY_PART[m]).filter(Boolean))],
    equipments: [raw.equipment ?? "body only"],
    targetMuscles: raw.primaryMuscles,
    secondaryMuscles: raw.secondaryMuscles,
    instructions: raw.instructions,
    level: raw.level,
    category: raw.category,
    force: raw.force,
    mechanic: raw.mechanic,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const BY_ID = new Map(EXERCISES.map((e) => [e.exerciseId, e]));

export async function getBodyParts(): Promise<string[]> {
  return [...new Set(Object.values(MUSCLE_TO_BODY_PART))].sort();
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
