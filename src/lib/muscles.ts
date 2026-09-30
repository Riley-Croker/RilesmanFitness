// Turns the exercises in a workout into "muscles worked": which body regions
// were trained and how hard, for the summary's body map and muscle list.
//
// ExerciseDB names muscles anatomically ("pectorals", "latissimus dorsi",
// "rear deltoids") and inconsistently between target and secondary lists
// ("abdominals" vs "core"). Each name maps to one or more BODY REGIONS - the
// shapes drawn by the body map - and each region belongs to one display
// GROUP, the label shown in the list.
//
// Scoring: every set counts 1 towards the exercise's target muscles and 0.5
// towards its secondary muscles. So a set of bench press is 1 for chest and
// 0.5 each for triceps and shoulders. A region shared by two groups (none
// today) would be credited to each.

import { getExercise } from "@/lib/exercise-library";

export type BodyRegion =
  | "chest" | "front-deltoids" | "back-deltoids" | "biceps" | "triceps" | "forearms"
  | "abs" | "obliques" | "trapezius" | "upper-back" | "lower-back" | "neck"
  | "glutes" | "quadriceps" | "hamstrings" | "adductors" | "calves";

// ExerciseDB muscle name -> regions it lights up. Names not listed here
// (cardiovascular system, ankles, feet, rotator cuff, …) have no shape on the
// body map and are ignored.
const MUSCLE_REGIONS: Record<string, BodyRegion[]> = {
  pectorals: ["chest"],
  // "deltoids" covers presses (front), raises (side) and face pulls (rear), so
  // it lights both views; "rear deltoids" is specific.
  deltoids: ["front-deltoids", "back-deltoids"],
  "rear deltoids": ["back-deltoids"],
  biceps: ["biceps"],
  brachialis: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearms"],
  "wrist flexors": ["forearms"],
  "wrist extensors": ["forearms"],
  wrists: ["forearms"],
  "grip muscles": ["forearms"],
  hands: ["forearms"],
  abdominals: ["abs"],
  core: ["abs"],
  obliques: ["obliques"],
  "serratus anterior": ["obliques"], // no shape of its own; it sits over the side ribs
  "latissimus dorsi": ["upper-back"],
  "upper back": ["upper-back"],
  rhomboids: ["upper-back"],
  back: ["upper-back"],
  trapezius: ["trapezius"],
  "levator scapulae": ["trapezius"],
  "erector spinae": ["lower-back"],
  sternocleidomastoid: ["neck"],
  glutes: ["glutes"],
  abductors: ["glutes"], // glute medius; the map has no outer-hip shape
  "hip flexors": ["quadriceps"],
  quadriceps: ["quadriceps"],
  hamstrings: ["hamstrings"],
  adductors: ["adductors"],
  calves: ["calves"],
  soleus: ["calves"],
};

// Region -> the label used in the muscle list. Front and rear delts share
// "Shoulders" so a lateral raise isn't listed twice.
const REGION_GROUP: Record<BodyRegion, string> = {
  chest: "Chest",
  "front-deltoids": "Shoulders",
  "back-deltoids": "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  obliques: "Obliques",
  trapezius: "Traps",
  "upper-back": "Back",
  "lower-back": "Lower back",
  neck: "Neck",
  glutes: "Glutes",
  quadriceps: "Quads",
  hamstrings: "Hamstrings",
  adductors: "Adductors",
  calves: "Calves",
};

export interface MuscleGroupScore {
  group: string;
  sets: number; // weighted: 1 per set as a target, 0.5 as a secondary
}

export interface MusclesWorked {
  // Region -> intensity 0..1 relative to the most-worked region, for colouring.
  regions: Partial<Record<BodyRegion, number>>;
  // Most-worked first.
  groups: MuscleGroupScore[];
}

interface ExerciseForMuscles {
  exerciseId: string | null;
  targetMuscle: string | null; // what the workout row stored (the first target)
  setCount: number;
}

export async function getMusclesWorked(exercises: ExerciseForMuscles[]): Promise<MusclesWorked> {
  const regionScore = new Map<BodyRegion, number>();
  const groupScore = new Map<string, number>();

  const credit = (muscles: string[], amount: number) => {
    // A group or region is credited once per muscle list, even if two of
    // its muscle names appear (e.g. "biceps" and "brachialis").
    const regions = new Set(muscles.flatMap((m) => MUSCLE_REGIONS[m.toLowerCase()] ?? []));
    const groups = new Set([...regions].map((r) => REGION_GROUP[r]));
    regions.forEach((r) => regionScore.set(r, (regionScore.get(r) ?? 0) + amount));
    groups.forEach((g) => groupScore.set(g, (groupScore.get(g) ?? 0) + amount));
  };

  for (const ex of exercises) {
    if (ex.setCount === 0) continue;
    // Prefer the full catalogue entry (all targets + secondaries). Custom
    // exercises, or ids no longer in the catalogue, fall back to the one
    // target muscle stored with the workout, if any.
    const catalogue = ex.exerciseId ? await getExercise(ex.exerciseId) : null;
    const targets = catalogue?.targetMuscles ?? (ex.targetMuscle ? [ex.targetMuscle] : []);
    const secondaries = (catalogue?.secondaryMuscles ?? []).filter((m) => !targets.includes(m));
    credit(targets, ex.setCount);
    credit(secondaries, ex.setCount * 0.5);
  }

  const max = Math.max(0, ...regionScore.values());
  const regions: MusclesWorked["regions"] = {};
  regionScore.forEach((score, region) => {
    regions[region] = max > 0 ? score / max : 0;
  });

  const groups = [...groupScore.entries()]
    .map(([group, sets]) => ({ group, sets }))
    .sort((a, b) => b.sets - a.sets || a.group.localeCompare(b.group));

  return { regions, groups };
}
