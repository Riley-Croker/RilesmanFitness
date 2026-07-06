// Dashboard — headline stats, recent workouts, top personal records.
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getDashboardStats,
  getPersonalRecords,
  getWeightUnit,
  getWorkoutSummaries,
} from "@/lib/queries";
import { toDisplayWeight } from "@/lib/units";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [stats, recent, records, unit] = await Promise.all([
    getDashboardStats(session.user.id),
    getWorkoutSummaries(session.user.id, 5),
    getPersonalRecords(session.user.id),
    getWeightUnit(session.user.id),
  ]);

  const cards = [
    { label: "Workouts this week", value: stats.workoutsThisWeek },
    {
      label: `Volume this week (${unit})`,
      value: Math.round(toDisplayWeight(stats.volumeThisWeek, unit)).toLocaleString(),
    },
    { label: "Total workouts", value: stats.totalWorkouts },
    { label: "Total sets logged", value: stats.totalSets },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Hey, {session.user.name?.split(" ")[0]} 👊
          </h1>
          <p className="mt-1 text-zinc-400">Here&apos;s where your training stands.</p>
        </div>
        <Link
          href="/workouts/new"
          className="rounded-lg bg-lime-400 px-5 py-2.5 font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
        >
          + Log Workout
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-sm text-zinc-400">{c.label}</p>
            <p className="mt-1 text-3xl font-bold text-lime-400">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* Recent workouts */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent workouts</h2>
            <Link href="/workouts" className="text-sm text-lime-400 hover:underline">
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-zinc-800 p-6 text-center text-zinc-500">
              No workouts yet.{" "}
              <Link href="/workouts/new" className="text-lime-400 hover:underline">
                Log your first one
              </Link>
              !
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {recent.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/workouts/${w.id}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-600"
                  >
                    <div>
                      <p className="font-semibold">{w.name}</p>
                      <p className="text-sm text-zinc-400">{formatDate(w.date)}</p>
                    </div>
                    <div className="text-right text-sm text-zinc-400">
                      <p>{w.exerciseCount} exercises · {w.setCount} sets</p>
                      <p>
                        {Math.round(toDisplayWeight(w.totalVolume, unit)).toLocaleString()} {unit} volume
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top PRs */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Personal records</h2>
            <Link href="/records" className="text-sm text-lime-400 hover:underline">
              View all →
            </Link>
          </div>
          {records.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-zinc-800 p-6 text-center text-zinc-500">
              PRs appear automatically once you log weighted sets.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {records.slice(0, 5).map((r) => (
                <li
                  key={r.exercise}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <div>
                    <p className="font-semibold capitalize">{r.exercise}</p>
                    <p className="text-sm text-zinc-400">{formatDate(r.date)}</p>
                  </div>
                  <p className="text-lg font-bold text-lime-400">
                    {toDisplayWeight(r.weight, unit)} {unit} × {r.reps}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
