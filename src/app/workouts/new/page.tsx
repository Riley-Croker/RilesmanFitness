// Log a new workout. Server component that handles pre-seeding:
//   ?template=<id>  — start from a saved template
//   ?exercise=<id>  — start with one ExerciseDB exercise loaded
// then hands off to the client-side <WorkoutLogger>. If a workout is
// already in progress on this device, the logger resumes that instead.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import WorkoutLogger from "@/components/workout-logger-loader";
import { getExercise } from "@/lib/exercise-library";
import { getTemplate, getWeightUnit } from "@/lib/queries";
import type { DraftExercise } from "@/lib/workout-draft";

export const dynamic = "force-dynamic";

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; exercise?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { template: templateId, exercise: exerciseId } = await searchParams;
  const unit = await getWeightUnit(session.user.id);

  let initialName = "";
  let initialPlan: string | null = null;
  const initialExercises: DraftExercise[] = [];

  if (templateId) {
    const template = await getTemplate(session.user.id, templateId);
    if (template) {
      initialName = template.name;
      initialPlan = template.description?.trim() || null;
      for (const ex of template.exercises) {
        const full = ex.exerciseId ? await getExercise(ex.exerciseId) : null;
        initialExercises.push({
          exerciseId: ex.exerciseId,
          name: ex.name,
          bodyPart: ex.bodyPart,
          equipment: ex.equipment,
          targetMuscle: ex.targetMuscle,
          images: full?.images,
          notes: ex.notes,
          isOptional: ex.isOptional,
          sets: ex.sets.length
            ? // Planned sets: one row each, left EMPTY with the plan as its
              // target. The server drops sets without reps, so a planned set
              // you skip is never saved as done; pre-filling would break that.
              ex.sets.map((s) => ({
                reps: 0,
                weight: 0,
                isWarmup: s.isWarmup,
                target: { reps: s.reps, weight: s.weight },
              }))
            : // Older templates without planned sets: as before, N sets with
              // the target reps filled in.
              Array.from({ length: ex.targetSets }, () => ({ reps: ex.targetReps, weight: 0 })),
        });
      }
    }
  } else if (exerciseId) {
    const ex = await getExercise(exerciseId);
    if (ex) {
      initialExercises.push({
        exerciseId: ex.exerciseId,
        name: ex.name,
        bodyPart: ex.bodyParts[0] ?? null,
        equipment: ex.equipments[0] ?? null,
        targetMuscle: ex.targetMuscles[0] ?? null,
        images: ex.images,
        // Empty, like an exercise added in the logger: the boxes then show
        // last time's numbers as hints.
        sets: [{ reps: 0, weight: 0 }],
      });
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-3xl font-bold tracking-tight">Log Workout</h1>
      <WorkoutLogger
        userId={session.user.id}
        initialName={initialName}
        initialPlan={initialPlan}
        initialExercises={initialExercises}
        weightUnit={unit}
      />
    </div>
  );
}
