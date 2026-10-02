"use client";

// The workout logger's Swap sheet: "this machine's taken, what else?"
// Lists exercises that can stand in for the given one (chosen and ranked by
// getSubstitutes in src/lib/exercise-library.ts), with equipment chips to
// narrow it down and a way out to the full search.

import { useEffect, useState } from "react";
import ExerciseImage from "@/components/exercise-image";
import { withBasePath } from "@/lib/base-path";
import type { Exercise } from "@/types";

interface SubstitutesResponse {
  base: { name: string; targetMuscle: string | null };
  equipments: string[];
  exercises: Exercise[];
}

// Chip labels for ExerciseDB's equipment names.
const EQUIPMENT_LABEL: Record<string, string> = {
  "leverage machine": "Machine",
  "smith machine": "Smith",
  "EZ bar": "EZ bar",
};
const label = (eq: string) => EQUIPMENT_LABEL[eq] ?? eq.charAt(0).toUpperCase() + eq.slice(1);

export default function SubstitutePicker({
  exerciseId,
  exerciseName,
  onPick,
  onSearchAll,
  onClose,
}: {
  exerciseId: string;
  exerciseName: string;
  onPick: (ex: Exercise) => void;
  onSearchAll: () => void;
  onClose: () => void;
}) {
  const [equipment, setEquipment] = useState(""); // "" = all
  // Each response is stored with the chip it was for, so "loading" is just
  // "the results on screen are for a different chip" - no separate flag to
  // set at the start of the effect.
  const [result, setResult] = useState<(SubstitutesResponse & { key: string }) | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const qs = equipment ? `?equipment=${encodeURIComponent(equipment)}` : "";
    fetch(withBasePath(`/api/exercises/${encodeURIComponent(exerciseId)}/substitutes${qs}`), {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<SubstitutesResponse>;
      })
      .then((data) => {
        setResult({ ...data, key: equipment });
        // The chips come from the unfiltered list and then stay put, so
        // tapping one doesn't make the others disappear.
        if (!equipment) setChips(data.equipments);
      })
      .catch((e) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) setFailedKey(equipment);
      });
    return () => controller.abort();
  }, [exerciseId, equipment]);

  const failed = failedKey === equipment;
  const loading = !failed && result?.key !== equipment;
  const chipClass = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1 text-sm transition-colors ${
      active ? "bg-lime-400 font-semibold text-zinc-950" : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-16"
      onClick={onClose}
    >
      <div
        className="flex max-h-[75vh] w-full max-w-lg flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800 p-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold capitalize">Swap {exerciseName}</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              {result?.base.targetMuscle
                ? `Exercises that also work your ${result.base.targetMuscle}`
                : "Similar exercises"}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100" aria-label="Close">
            ✕
          </button>
        </div>

        {chips.length > 0 && (
          <div
            // shrink-0: this row scrolls sideways, and a scrolling flex item is
            // allowed to shrink below its content. In a short window the sheet
            // squashed it and clipped the chips; the list absorbs the space instead.
            className="flex shrink-0 gap-2 overflow-x-auto p-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Filter by equipment"
          >
            <button onClick={() => setEquipment("")} className={chipClass(equipment === "")} aria-pressed={equipment === ""}>
              All
            </button>
            {chips.map((eq) => (
              <button key={eq} onClick={() => setEquipment(eq)} className={chipClass(equipment === eq)} aria-pressed={equipment === eq}>
                {label(eq)}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-24 flex-1 overflow-y-auto p-4 pt-2">
          {failed ? (
            <p className="py-8 text-center text-sm text-red-400">Couldn&apos;t load substitutes.</p>
          ) : loading ? (
            <p className="py-8 text-center text-sm text-zinc-500">Finding substitutes…</p>
          ) : result!.exercises.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No close substitutes{equipment ? ` using ${label(equipment).toLowerCase()}` : ""}.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {result!.exercises.map((ex) => (
                <li key={ex.exerciseId}>
                  <button
                    onClick={() => onPick(ex)}
                    className="flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-left transition-colors hover:border-lime-400/50"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-white">
                      <ExerciseImage images={ex.images} alt={ex.name} animate={false} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium capitalize">{ex.name}</p>
                      <p className="truncate text-xs capitalize text-zinc-400">
                        {[...ex.bodyParts, ...ex.equipments].join(" · ")}
                      </p>
                    </div>
                    {(ex.timesDone ?? 0) > 0 && (
                      <span className="shrink-0 rounded-full bg-lime-400 px-2 py-0.5 text-xs font-semibold text-zinc-950">
                        You: {ex.timesDone}×
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-zinc-800 p-4">
          <button
            onClick={onSearchAll}
            className="w-full rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500"
          >
            Search all exercises
          </button>
        </div>
      </div>
    </div>
  );
}
