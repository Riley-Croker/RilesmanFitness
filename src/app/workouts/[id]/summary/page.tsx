// Workout summary - the screen after Finish. One compact card sized for a
// phone: time, totals, each exercise's best set (with a PR badge when it
// beats everything logged before), and the muscles worked. The card can be
// saved as an image or simply screenshotted, so it deliberately contains no
// exercise GIFs (see save-image-button.tsx for why).

import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import BodyMap from "@/components/body-map";
import SaveImageButton from "@/components/save-image-button";
import { formatDuration } from "@/lib/duration";
import { getMusclesWorked } from "@/lib/muscles";
import { getPreviousBests, getWeightUnit, getWorkoutDetail } from "@/lib/queries";
import { toDisplayWeight } from "@/lib/units";
import type { WorkoutSet } from "@/types";

export const dynamic = "force-dynamic";

// Heaviest weight wins, more reps breaks a tie - the same order as the
// Records page. For bodyweight-only exercises every weight is 0, so this
// picks the set with the most reps.
function bestSet(sets: WorkoutSet[]): WorkoutSet | null {
  return sets.reduce<WorkoutSet | null>(
    (best, s) =>
      !best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best,
    null
  );
}

// "8 sets", "3.5 sets", "1 set" - secondary muscles earn half sets.
function setLabel(n: number): string {
  const value = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${value} set${n === 1 ? "" : "s"}`;
}

export default async function WorkoutSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const [workout, unit, previousBests] = await Promise.all([
    getWorkoutDetail(session.user.id, id),
    getWeightUnit(session.user.id),
    getPreviousBests(session.user.id, id),
  ]);
  if (!workout) notFound();

  const muscles = await getMusclesWorked(
    workout.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      targetMuscle: e.targetMuscle,
      setCount: e.sets.length,
    }))
  );
  const topGroups = muscles.groups.slice(0, 5);
  const maxGroupSets = topGroups[0]?.sets ?? 0;

  const rows = workout.exercises.map((ex) => {
    const best = bestSet(ex.sets);
    const prev = previousBests.get(ex.name);
    // Only weighted sets count, as on the Records page, and a first-ever
    // attempt isn't a PR - there's nothing to beat yet.
    const isPR =
      !!best &&
      best.weight > 0 &&
      !!prev &&
      (best.weight > prev.weight || (best.weight === prev.weight && best.reps > prev.reps));
    return { ex, best, isPR };
  });

  const totalSets = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  const totalVolume = workout.exercises
    .flatMap((e) => e.sets)
    .reduce((sum, s) => sum + s.reps * s.weight, 0);
  const durationMs =
    workout.startedAt && workout.finishedAt
      ? new Date(workout.finishedAt).getTime() - new Date(workout.startedAt).getTime()
      : null;
  const prCount = rows.filter((r) => r.isPR).length;

  const when = new Date(workout.startedAt ?? workout.date);
  const dateLine = when.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeLine = workout.startedAt
    ? when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  const stats: { label: string; value: string }[] = [
    durationMs !== null
      ? { label: "Time", value: formatDuration(durationMs) }
      : { label: "Exercises", value: String(workout.exercises.length) },
    { label: "Sets", value: String(totalSets) },
    {
      label: `Volume (${unit})`,
      value: Math.round(toDisplayWeight(totalVolume, unit)).toLocaleString("en-US"),
    },
  ];

  // Local date parts, not toISOString(): that's always UTC, so a late-evening
  // workout would be named after the next day.
  const fileName = `rilesman-fitness-${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-md">
      <Link href={`/workouts/${workout.id}`} className="text-sm text-zinc-400 hover:text-lime-400">
        ← Full workout details
      </Link>

      {/* Everything inside this card is what "Save image" captures. */}
      <section
        id="workout-summary-card"
        className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-lime-400">
          Rilesman Fitness
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight">{workout.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {dateLine}
          {timeLine && ` · ${timeLine}`}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-zinc-900 px-3 py-2.5">
              <p className="text-xl font-bold tabular-nums leading-none">{s.value}</p>
              <p className="mt-1.5 text-[11px] text-zinc-400">{s.label}</p>
            </div>
          ))}
        </div>

        {prCount > 0 && (
          <p className="mt-3 rounded-lg bg-lime-400/10 px-3 py-2 text-sm font-medium text-lime-400">
            🏆 {prCount} new personal record{prCount === 1 ? "" : "s"}
          </p>
        )}

        {/* Exercises: name, sets, best set */}
        <div className="mt-5">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-zinc-800 pb-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
            <span>Exercise</span>
            <span className="text-right">Sets</span>
            <span className="text-right">Best set</span>
          </div>
          {rows.map(({ ex, best, isPR }) => (
            <div
              key={ex.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-b border-zinc-900 py-2 text-sm"
            >
              <span className="truncate font-medium capitalize">{ex.name}</span>
              <span className="text-right tabular-nums text-zinc-400">{ex.sets.length}</span>
              <span className="text-right tabular-nums">
                {isPR && (
                  <span className="mr-1.5 rounded bg-lime-400 px-1 py-px text-[10px] font-bold text-zinc-950">
                    PR
                  </span>
                )}
                {!best ? (
                  <span className="text-zinc-600">—</span>
                ) : best.weight > 0 ? (
                  <>
                    <span className="font-semibold">{toDisplayWeight(best.weight, unit)}</span>
                    <span className="text-zinc-400"> {unit} × {best.reps}</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold">{best.reps}</span>
                    <span className="text-zinc-400"> reps</span>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Muscles worked */}
        {topGroups.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Muscles worked</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="shrink-0">
                <BodyMap regions={muscles.regions} />
              </div>
              <ul className="flex min-w-0 flex-1 flex-col gap-2">
                {topGroups.map((g) => (
                  <li key={g.group}>
                    <div className="flex justify-between gap-2 text-xs">
                      <span className="font-medium">{g.group}</span>
                      <span className="tabular-nums text-zinc-400">{setLabel(g.sets)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-lime-400"
                        style={{ width: `${maxGroupSets > 0 ? (g.sets / maxGroupSets) * 100 : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-[11px] text-zinc-600">rcroker.dev/workout</p>
      </section>

      <div className="mt-4 flex gap-3">
        <SaveImageButton targetId="workout-summary-card" fileName={fileName} />
        <Link
          href="/dashboard"
          className="flex items-center rounded-lg border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition-colors hover:border-zinc-500"
        >
          Done
        </Link>
      </div>
    </div>
  );
}
