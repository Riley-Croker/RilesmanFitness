// Shared types used across the app.

// ---- Exercise catalogue (free-exercise-db dataset) ----

export interface Exercise {
  exerciseId: string;
  name: string;
  images: string[]; // demonstration photos (start + end position)
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
  exercises: WorkoutExerciseInput[];
}

export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
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
  targetSets: number;
  targetReps: number;
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
