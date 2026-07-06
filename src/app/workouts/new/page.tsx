// Log a new workout. Server component that handles pre-seeding:
//   ?template=<id>  — start from a saved template
//   ?exercise=<id>  — start with one ExerciseDB exercise loaded
// then hands off to the client-side <WorkoutLogger>.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import WorkoutLogger from "@/components/workout-logger";
import { getExercise } from "@/lib/exercise-library";
import { getTemplate, getWeightUnit } from "@/lib/queries";

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
  interface Seeded {
    exerciseId: string | null;
    name: string;
    bodyPart: string | null;
    equipment: string | null;
    targetMuscle: string | null;
    images?: string[];
    sets: { reps: number; weight: number }[];
  }
  const initialExercises: Seeded[] = [];

  if (templateId) {
    const template = await getTemplate(session.user.id, templateId);
    if (template) {
      initialName = template.name;
      for (const ex of template.exercises) {
        const full = ex.exerciseId ? await getExercise(ex.exerciseId) : null;
        initialExercises.push({
          exerciseId: ex.exerciseId,
          name: ex.name,
          bodyPart: ex.bodyPart,
          equipment: ex.equipment,
          targetMuscle: ex.targetMuscle,
          images: full?.images,
          sets: Array.from({ length: ex.targetSets }, () => ({
            reps: ex.targetReps,
            weight: 0,
          })),
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
        sets: [{ reps: 10, weight: 0 }],
      });
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-3xl font-bold tracking-tight">Log Workout</h1>
      <WorkoutLogger
        initialName={initialName}
        initialExercises={initialExercises}
        weightUnit={unit}
      />
    </div>
  );
}
