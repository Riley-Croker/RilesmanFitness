// Shared types used across the app.

// ---- Exercise catalogue (ExerciseDB dataset, see src/lib/exercise-library.ts) ----

export interface Exercise {
  exerciseId: string;
  name: string;
  images: string[]; // demonstration media: one animated GIF per ExerciseDB exercise
  // How many of the signed-in user's workouts included this exercise. Only
  // set on results from getExercises when it was given the user's history.
  timesDone?: number;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  level?: string;
  category?: string;
  force?: string | null;
  mechanic?: string | null;
}

export interface ExercisePage {
  exercises: Exercise[];
  total: number;
  hasNextPage: boolean;
  nextCursor: string | null;
}

// ---- Workout logging ----

export interface SetInput {
  reps: number;
  weight: number; // stored in lbs; 0 = bodyweight
  isWarmup?: boolean; // saved as sets.is_warmup; missing = working set
}

export interface WorkoutExerciseInput {
  exerciseId: string | null; // ExerciseDB id, null for custom exercises
  name: string;
  bodyPart?: string | null;
  equipment?: string | null;
  targetMuscle?: string | null;
  sets: SetInput[];
}

export interface WorkoutInput {
  name: string;
  date: string; // ISO date
  notes?: string;
  // ISO timestamps, sent only when the workout was timed live with
  // Start/Finish. The server uses startedAt as the workout's date.
  startedAt?: string;
  finishedAt?: string;
  exercises: WorkoutExerciseInput[];
}

export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  isWarmup: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string | null;
  name: string;
  bodyPart: string | null;
  equipment: string | null;
  targetMuscle: string | null;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  name: string;
  date: string;
  notes: string | null;
  startedAt: string | null; // ISO; null unless timed live
  finishedAt: string | null;
  exercises: WorkoutExercise[];
}

export interface WorkoutSummary {
  id: string;
  name: string;
  date: string;
  notes: string | null;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
}

// ---- Templates ----

export interface TemplateExercise {
  id: string;
  exerciseId: string | null;
  name: string;
  bodyPart: string | null;
  equipment: string | null;
  targetMuscle: string | null;
  // Fallback plan when `sets` is empty: targetSets sets of targetReps.
  targetSets: number;
  targetReps: number;
  notes: string | null; // a short cue shown under the exercise in the logger
  isOptional: boolean; // dropped first when short on time; false = priority
  sets: TemplateSet[]; // planned sets (template_sets), in order; may be empty
}

// One planned set of a template exercise. Shown in the logger as the grey
// hint in empty boxes - a target, never a pre-filled value.
export interface TemplateSet {
  reps: number;
  weight: number; // lbs; 0 = bodyweight or unspecified
  isWarmup: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  exercises: TemplateExercise[];
}

// ---- Stats ----

export interface ProgressPoint {
  date: string;
  maxWeight: number;
  volume: number;
  est1rm: number;
}

export interface PersonalRecord {
  exercise: string;
  exerciseId: string | null;
  weight: number;
  reps: number;
  date: string;
  est1rm: number;
}
