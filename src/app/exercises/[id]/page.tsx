// Exercise detail — GIF demo, instructions, muscles worked, and (when
// logged in) your recent history with this exercise.

import Link from "next/link";
import { notFound } from "next/navigation";
import ExerciseImage from "@/components/exercise-image";
import { auth } from "@/lib/auth";
import { getExercise } from "@/lib/exercise-library";
import { getExerciseHistory, getWeightUnit } from "@/lib/queries";
import { toDisplayWeight } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [exercise, session] = await Promise.all([getExercise(id), auth()]);
  if (!exercise) notFound();

  const [history, unit] = session?.user?.id
    ? await Promise.all([
        getExerciseHistory(session.user.id, id),
        getWeightUnit(session.user.id),
      ])
    : [[], "lbs" as const];

  const chip = (label: string, accent = false) => (
    <span
      key={label}
      className={`rounded-full px-3 py-1 text-sm capitalize ${
        accent ? "bg-lime-400/10 text-lime-400" : "bg-zinc-800 text-zinc-300"
      }`}
    >
      {label}
    </span>
  );

  return (
    <div>
      <Link href="/exercises" className="text-sm text-zinc-400 hover:text-lime-400">
        ← Back to library
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div className="h-fit overflow-hidden rounded-xl border border-zinc-800 bg-white">
          <ExerciseImage
            images={exercise.images}
            alt={exercise.name}
            className="aspect-[3/2] w-full object-cover"
          />
        </div>

        <div>
          <h1 className="text-3xl font-bold capitalize tracking-tight">{exercise.name}</h1>

          <div className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-zinc-500">Body part</span>
              {exercise.bodyParts.map((b) => chip(b))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-zinc-500">Equipment</span>
              {exercise.equipments.map((e) => chip(e, true))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-zinc-500">Target</span>
              {exercise.targetMuscles.map((m) => chip(m, true))}
            </div>
            {exercise.secondaryMuscles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-28 text-zinc-500">Secondary</span>
                {exercise.secondaryMuscles.map((m) => chip(m))}
              </div>
            )}
            {(exercise.level || exercise.category) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-28 text-zinc-500">Difficulty</span>
                {exercise.level && chip(exercise.level)}
                {exercise.category && chip(exercise.category)}
              </div>
            )}
          </div>

          {session?.user && (
            <Link
              href={`/workouts/new?exercise=${exercise.exerciseId}`}
              className="mt-6 inline-block rounded-lg bg-lime-400 px-5 py-2.5 font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
            >
              + Log this exercise
            </Link>
          )}

          <h2 className="mt-8 text-xl font-semibold">How to perform</h2>
          <ol className="mt-3 flex list-none flex-col gap-2.5">
            {exercise.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-zinc-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-400/10 text-xs font-bold text-lime-400">
                  {i + 1}
                </span>
                {step.replace(/^Step:\d+\s*/, "")}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Your history with this exercise */}
      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Your recent sets</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Workout</th>
                  <th className="px-4 py-3">Reps</th>
                  <th className="px-4 py-3">Weight ({unit})</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-t border-zinc-800">
                    <td className="px-4 py-2.5 text-zinc-400">
                      {new Date(h.date).toLocaleDateString("en-AU")}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/workouts/${h.workoutId}`} className="hover:text-lime-400">
                        {h.workoutName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{h.reps}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {h.weight > 0 ? toDisplayWeight(h.weight, unit) : "BW"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
