// Workout history — every logged session, newest first.
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getWeightUnit, getWorkoutSummaries } from "@/lib/queries";
import { toDisplayWeight } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [workouts, unit] = await Promise.all([
    getWorkoutSummaries(session.user.id),
    getWeightUnit(session.user.id),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Workout History</h1>
        <Link
          href="/workouts/new"
          className="rounded-lg bg-lime-400 px-5 py-2.5 font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
        >
          + Log Workout
        </Link>
      </div>

      {workouts.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500">
          Nothing logged yet. Your history will build here as you train.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {workouts.map((w) => (
            <li key={w.id}>
              <Link
                href={`/workouts/${w.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-600"
              >
                <div>
                  <p className="text-lg font-semibold">{w.name}</p>
                  <p className="text-sm text-zinc-400">
                    {new Date(w.date).toLocaleDateString("en-AU", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex gap-6 text-center text-sm">
                  <div>
                    <p className="font-bold text-lime-400">{w.exerciseCount}</p>
                    <p className="text-zinc-500">exercises</p>
                  </div>
                  <div>
                    <p className="font-bold text-lime-400">{w.setCount}</p>
                    <p className="text-zinc-500">sets</p>
                  </div>
                  <div>
                    <p className="font-bold text-lime-400">
                      {Math.round(toDisplayWeight(w.totalVolume, unit)).toLocaleString()}
                    </p>
                    <p className="text-zinc-500">{unit} volume</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
