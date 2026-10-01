// Keeps the workout you're logging in the browser's localStorage, so it
// survives a reload, an accidental tab close, or a phone discarding the tab
// while it's locked between sets - timer included.
//
// Browser-only: localStorage doesn't exist on the server, which is why the
// logger is rendered client-side only (see workout-logger-loader.tsx).
// Every access is wrapped in try/catch because storage can be unavailable
// (private browsing, storage full, blocked by settings); the logger then just
// works without persistence, as it did before.

import type { WeightUnit } from "@/lib/units";
import type { WorkoutExerciseInput } from "@/types";

export interface DraftExercise extends WorkoutExerciseInput {
  images?: string[];
  // Stable client-side id so the logger can tell exercises apart when they
  // are reordered. Optional because drafts saved before reordering existed
  // don't have one; the logger fills in any that are missing.
  uid?: string;
}

export interface WorkoutDraft {
  version: 1;
  name: string;
  date: string; // YYYY-MM-DD, used only when the workout isn't timed
  notes: string;
  exercises: DraftExercise[];
  startedAt: number | null; // epoch ms when Start was pressed
  unit: WeightUnit; // unit the set weights were typed in
  savedAt: number; // epoch ms of the last change
}

// Per user, so two accounts on one phone never see each other's workout.
const key = (userId: string) => `rilesman-fitness:workout-draft:${userId}`;

export function loadDraft(userId: string): WorkoutDraft | null {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as WorkoutDraft;
    // Ignore anything written by a different (future or broken) format.
    if (draft?.version !== 1 || !Array.isArray(draft.exercises)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function saveDraft(userId: string, draft: Omit<WorkoutDraft, "version" | "savedAt">): void {
  try {
    const full: WorkoutDraft = { ...draft, version: 1, savedAt: Date.now() };
    localStorage.setItem(key(userId), JSON.stringify(full));
  } catch {
    // Storage unavailable: carry on without persistence.
  }
}

export function clearDraft(userId: string): void {
  try {
    localStorage.removeItem(key(userId));
  } catch {
    // Nothing to clear.
  }
}
