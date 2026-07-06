// Progress — charts of strength and volume per exercise over time.
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProgressCharts from "@/components/progress-charts";
import { getLoggedExerciseNames, getWeightUnit } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [exerciseNames, unit] = await Promise.all([
    getLoggedExerciseNames(session.user.id),
    getWeightUnit(session.user.id),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
      <p className="mt-1 text-zinc-400">
        Pick an exercise to see your strength and volume trends. Est. 1RM uses the Epley formula.
      </p>
      <ProgressCharts exerciseNames={exerciseNames} weightUnit={unit} />
    </div>
  );
}
