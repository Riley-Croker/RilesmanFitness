"use client";

// The logger's history sheet: tap an exercise mid-workout to see what you
// did the last few times. Shows the animated demo, your best set ever, and
// your last HISTORY_SESSIONS sessions with each one's best set highlighted.
//
// It doesn't fetch anything itself: the logger already loaded this history
// for the "Last time" line on the card (src/lib/exercise-history.ts) and
// passes it in, so the sheet opens instantly.

import Link from "next/link";
import ExerciseImage from "@/components/exercise-image";
import { bestSetIndex, formatSet, type ExerciseHistory } from "@/lib/exercise-history";
import type { WeightUnit } from "@/lib/units";

export default function ExerciseHistorySheet({
  exercise,
  history,
  weightUnit,
  onClose,
}: {
  exercise: { exerciseId: string | null; name: string; images?: string[] };
  // undefined while loading, "error" if it couldn't be loaded.
  history: ExerciseHistory | "error" | undefined;
  weightUnit: WeightUnit;
  onClose: () => void;
}) {
  const loaded = history && history !== "error" ? history : null;
  const best = loaded?.best ?? null;

  const longDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-16" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Your history: ${exercise.name}`}
        className="flex max-h-[75vh] w-full max-w-lg flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-zinc-800 p-4">
          {/* A bit bigger than the card's thumbnail, for a quick form check. */}
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-white">
            <ExerciseImage images={exercise.images ?? []} alt={exercise.name} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-lg font-semibold capitalize leading-snug">{exercise.name}</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Your history</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="min-h-24 flex-1 overflow-y-auto p-4">
          {history === "error" ? (
            <p className="py-8 text-center text-sm text-red-400">Couldn&apos;t load your history.</p>
          ) : !loaded ? (
            <p className="py-8 text-center text-sm text-zinc-500">Loading…</p>
          ) : loaded.sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              You haven&apos;t logged this one yet. Today sets the bar.
            </p>
          ) : (
            <>
              {best && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-lime-400/30 bg-lime-400/5 px-3 py-2.5">
                  <span className="rounded bg-lime-400 px-1 py-px text-[10px] font-bold text-zinc-950">PR</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold tabular-nums">
                      {formatSet(best, weightUnit)}
                      {best.weight > 0 && <span className="font-normal text-zinc-400"> {weightUnit}</span>}
                    </p>
                    <p className="text-xs text-zinc-400">Best set ever · {longDate(best.date)}</p>
                  </div>
                </div>
              )}

              <ol className="flex flex-col gap-3">
                {loaded.sessions.map((session) => {
                  const bestIdx = bestSetIndex(session.sets);
                  // The PR badge goes on the set that set the record, if
                  // it's one of these sessions.
                  const prIdx =
                    best && best.workoutId === session.workoutId
                      ? session.sets.findIndex((s) => s.weight === best.weight && s.reps === best.reps)
                      : -1;
                  return (
                    <li key={session.workoutId} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="shrink-0 text-sm font-semibold">{longDate(session.date)}</p>
                        <p className="min-w-0 truncate text-xs text-zinc-500">{session.workoutName}</p>
                      </div>
                      <ul className="mt-2 flex flex-wrap gap-1.5 text-sm tabular-nums">
                        {session.sets.map((set, i) => (
                          <li
                            key={i}
                            className={`flex items-center gap-1 rounded-md px-2 py-0.5 ${
                              i === bestIdx
                                ? "border border-lime-400/60 font-semibold text-lime-300"
                                : "border border-zinc-800 text-zinc-300"
                            }`}
                          >
                            {formatSet(set, weightUnit)}
                            {i === prIdx && (
                              <span className="rounded bg-lime-400 px-1 text-[10px] font-bold text-zinc-950">PR</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-3 text-xs text-zinc-500">
                Weights in {weightUnit}. Outlined: the best set of each session.
              </p>
            </>
          )}
        </div>

        {/* Leaving the logger is safe: the workout in progress is saved in
            the browser and picked up again on return. */}
        <div className="flex shrink-0 gap-3 border-t border-zinc-800 p-4">
          {loaded && loaded.sessions.length > 0 && (
            <Link
              href={`/progress?exercise=${encodeURIComponent(exercise.name)}`}
              className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-center text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500"
            >
              Progress chart
            </Link>
          )}
          {exercise.exerciseId && (
            <Link
              href={`/exercises/${exercise.exerciseId}`}
              className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-center text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500"
            >
              How to do it
            </Link>
          )}
          {!exercise.exerciseId && !(loaded && loaded.sessions.length > 0) && (
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
