// Your past sessions of an exercise, for the workout logger: the "Last time"
// line on each card, the grey hints in empty set boxes, and the history sheet
// that opens when you tap an exercise.
//
// Shared by the server (getRecentExerciseHistory in queries.ts, the
// /api/stats/exercise-history route) and the browser (the logger), so it
// imports nothing server-only.

import { toDisplayWeight, type WeightUnit } from "@/lib/units";

export interface HistorySession {
  workoutId: string;
  workoutName: string;
  date: string; // ISO
  sets: { reps: number; weight: number }[]; // weight in stored lbs, 0 = bodyweight
}

export interface ExerciseHistory {
  sessions: HistorySession[]; // newest first, at most HISTORY_SESSIONS
  // Heaviest set ever (most reps breaks ties; for bodyweight-only exercises
  // that makes it the most reps). Can be older than the sessions shown.
  best: { reps: number; weight: number; date: string; workoutId: string } | null;
}

export const HISTORY_SESSIONS = 5;

// Which history an exercise in the logger belongs to. Catalogue exercises
// match by ExerciseDB id, so history survives a rename of the exercise.
// Custom exercises have no id and match by name, ignoring case.
export function historyKey(ex: { exerciseId: string | null; name: string }): string {
  return ex.exerciseId ? `id:${ex.exerciseId}` : `name:${ex.name.trim().toLowerCase()}`;
}

// "135 × 8", or "BW × 12" for a bodyweight set, in the user's unit.
export function formatSet(set: { reps: number; weight: number }, unit: WeightUnit): string {
  return `${set.weight > 0 ? toDisplayWeight(set.weight, unit) : "BW"} × ${set.reps}`;
}

// "10/28" this year, "10/28/2025" for older dates.
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    ...(d.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
  });
}

// The best set within one list of sets: heaviest, then most reps.
export function bestSetIndex(sets: { reps: number; weight: number }[]): number {
  let best = -1;
  sets.forEach((s, i) => {
    const b = sets[best];
    if (!b || s.weight > b.weight || (s.weight === b.weight && s.reps > b.reps)) best = i;
  });
  return best;
}
