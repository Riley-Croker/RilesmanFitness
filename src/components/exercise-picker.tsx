"use client";

// Modal for picking an exercise from ExerciseDB while building a workout
// or template. Talks to our /api/exercises proxy (search + body-part
// filter) and returns the chosen exercise to the parent.

import { useEffect, useState } from "react";
import ExerciseImage from "@/components/exercise-image";
import type { Exercise, ExercisePage } from "@/types";

const BODY_PARTS = [
  "back", "chest", "lower arms", "lower legs",
  "neck", "shoulders", "upper arms", "upper legs", "waist",
];

export default function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [results, setResults] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "10" });
        if (search.trim()) params.set("search", search.trim());
        if (bodyPart) params.set("bodyPart", bodyPart);
        const res = await fetch(`/api/exercises?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("request failed");
        const page = (await res.json()) as ExercisePage;
        setResults(page.exercises);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          setError("Couldn't load exercises — check your connection.");
        }
      } finally {
        setLoading(false);
      }
    }, 300); // debounce typing
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, bodyPart]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-16"
      onClick={onClose}
    >
      <div
        className="flex max-h-[75vh] w-full max-w-lg flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h2 className="text-lg font-semibold">Add exercise</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex gap-2 p-4 pb-2">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises…"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-lime-400"
          />
          <select
            value={bodyPart}
            onChange={(e) => setBodyPart(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-lime-400"
          >
            <option value="">All body parts</option>
            {BODY_PARTS.map((bp) => (
              <option key={bp} value={bp}>{bp}</option>
            ))}
          </select>
        </div>

        <div className="min-h-40 flex-1 overflow-y-auto p-4 pt-2">
          {loading ? (
            <p className="py-8 text-center text-sm text-zinc-500">Loading…</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-400">{error}</p>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">No matches found.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {results.map((ex) => (
                <li key={ex.exerciseId}>
                  <button
                    onClick={() => onPick(ex)}
                    className="flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-left transition-colors hover:border-lime-400/50"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-white">
                      <ExerciseImage
                        images={ex.images}
                        alt={ex.name}
                        animate={false}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium capitalize">{ex.name}</p>
                      <p className="truncate text-xs capitalize text-zinc-400">
                        {[...ex.bodyParts, ...ex.equipments].join(" · ") || "tap to add"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Custom exercise fallback */}
        <div className="flex gap-2 border-t border-zinc-800 p-4">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Or type a custom exercise name…"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-lime-400"
          />
          <button
            disabled={!customName.trim()}
            onClick={() =>
              onPick({
                exerciseId: "",
                name: customName.trim().toLowerCase(),
                images: [],
                bodyParts: [],
                equipments: [],
                targetMuscles: [],
                secondaryMuscles: [],
                instructions: [],
              })
            }
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-600 disabled:opacity-40"
          >
            Add custom
          </button>
        </div>
      </div>
    </div>
  );
}
