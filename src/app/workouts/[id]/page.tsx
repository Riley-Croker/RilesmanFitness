// Workout detail — full breakdown of one session.
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import DeleteButton from "@/components/delete-button";
import { getWeightUnit, getWorkoutDetail } from "@/lib/queries";
import { toDisplayWeight } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const [workout, unit] = await Promise.all([
    getWorkoutDetail(session.user.id, id),
    getWeightUnit(session.user.id),
  ]);
  if (!workout) notFound();

  const totalVolume = workout.exercises
    .flatMap((e) => e.sets)
    .reduce((sum, s) => sum + s.reps * s.weight, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/workouts" className="text-sm text-zinc-400 hover:text-lime-400">
        ← Back to history
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{workout.name}</h1>
          <p className="mt-1 text-zinc-400">
            {new Date(workout.date).toLocaleDateString("en-US", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {" · "}
            {workout.exercises.length} exercises
            {" · "}
            {Math.round(toDisplayWeight(totalVolume, unit)).toLocaleString()} {unit} total volume
          </p>
        </div>
        <DeleteButton url={`/api/workouts/${workout.id}`} redirectTo="/workouts" />
      </div>

      {workout.notes && (
        <p className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-zinc-300">
          {workout.notes}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {workout.exercises.map((ex) => (
          <div key={ex.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold capitalize">
                  {ex.exerciseId ? (
                    <Link href={`/exercises/${ex.exerciseId}`} className="hover:text-lime-400">
                      {ex.name}
                    </Link>
                  ) : (
                    ex.name
                  )}
                </p>
                {ex.bodyPart && (
                  <p className="text-xs capitalize text-zinc-400">
                    {ex.bodyPart}
                    {ex.equipment ? ` · ${ex.equipment}` : ""}
                  </p>
                )}
              </div>
              {ex.exerciseId && (
                <Link
                  href={`/exercises/${ex.exerciseId}`}
                  className="shrink-0 text-xs text-lime-400 hover:underline"
                >
                  View exercise →
                </Link>
              )}
            </div>

            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-1 font-normal">Set</th>
                  <th className="py-1 font-normal">Reps</th>
                  <th className="py-1 font-normal">Weight ({unit})</th>
                </tr>
              </thead>
              <tbody>
                {ex.sets.map((s, i) => (
                  <tr key={s.id} className="border-t border-zinc-800/60">
                    <td className="py-1.5 text-zinc-500">{i + 1}</td>
                    <td className="py-1.5">{s.reps}</td>
                    <td className="py-1.5 font-medium">
                      {s.weight > 0 ? toDisplayWeight(s.weight, unit) : "Bodyweight"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
