"use client";

// The workout logger: build a workout from ExerciseDB exercises (or
// custom ones), add sets with reps/weight, then save via POST
// /api/workouts. Can be pre-seeded from a template or a single exercise
// (?template=<id> / ?exercise=<id> handled by the page and passed in).
// "Save as template" stores the exercise list as a reusable routine.

import { useState } from "react";
import { useRouter } from "next/navigation";
import ExerciseImage from "@/components/exercise-image";
import ExercisePicker from "@/components/exercise-picker";
import { toStoredLbs, type WeightUnit } from "@/lib/units";
import type { Exercise, WorkoutExerciseInput } from "@/types";

interface LoggerExercise extends WorkoutExerciseInput {
  images?: string[];
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function WorkoutLogger({
  initialName = "",
  initialExercises = [],
  weightUnit = "lbs",
}: {
  initialName?: string;
  initialExercises?: LoggerExercise[];
  weightUnit?: WeightUnit;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<LoggerExercise[]>(initialExercises);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateSaved, setTemplateSaved] = useState(false);

  const addExercise = (ex: Exercise) => {
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: ex.exerciseId || null,
        name: ex.name,
        bodyPart: ex.bodyParts[0] ?? null,
        equipment: ex.equipments[0] ?? null,
        targetMuscle: ex.targetMuscles[0] ?? null,
        images: ex.images,
        sets: [{ reps: 10, weight: 0 }],
      },
    ]);
    setPickerOpen(false);
  };

  const updateSet = (exIdx: number, setIdx: number, field: "reps" | "weight", value: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIdx
          ? ex
          : { ...ex, sets: ex.sets.map((s, j) => (j !== setIdx ? s : { ...s, [field]: value })) }
      )
    );
  };

  const addSet = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIdx ? ex : { ...ex, sets: [...ex.sets, ex.sets[ex.sets.length - 1] ?? { reps: 10, weight: 0 }] }
      )
    );
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i !== exIdx ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }))
    );
  };

  const removeExercise = (exIdx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const save = async () => {
    setError(null);
    if (!name.trim()) return setError("Give your workout a name.");
    if (exercises.length === 0) return setError("Add at least one exercise.");
    setSaving(true);
    try {
      // Inputs are in the user's display unit — store canonical lbs.
      const payload = exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({ ...s, weight: toStoredLbs(s.weight || 0, weightUnit) })),
      }));
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, date, notes, exercises: payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save workout.");
      }
      const { id } = await res.json();
      router.push(`/workouts/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save workout.");
      setSaving(false);
    }
  };

  const saveAsTemplate = async () => {
    setError(null);
    if (!name.trim()) return setError("Give your workout a name first — it becomes the template name.");
    if (exercises.length === 0) return setError("Add at least one exercise.");
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          bodyPart: ex.bodyPart,
          equipment: ex.equipment,
          targetMuscle: ex.targetMuscle,
          targetSets: ex.sets.length || 3,
          targetReps: ex.sets[0]?.reps || 10,
        })),
      }),
    });
    if (res.ok) {
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 3000);
    } else {
      setError("Failed to save template.");
    }
  };

  const inputClass =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none transition-colors focus:border-lime-400";

  return (
    <div className="mx-auto max-w-3xl">
      {/* Workout meta */}
      <div className="flex flex-wrap gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workout name — e.g. Push Day"
          className={`${inputClass} min-w-60 flex-1 text-base font-semibold`}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className={`${inputClass} mt-3 w-full`}
      />

      {/* Exercises */}
      <div className="mt-6 flex flex-col gap-4">
        {exercises.map((ex, exIdx) => (
          <div key={exIdx} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-white">
                <ExerciseImage
                  images={ex.images ?? []}
                  alt={ex.name}
                  animate={false}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold capitalize">{ex.name}</p>
                {ex.bodyPart && (
                  <p className="text-xs capitalize text-zinc-400">
                    {ex.bodyPart}{ex.equipment ? ` · ${ex.equipment}` : ""}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeExercise(exIdx)}
                className="text-sm text-zinc-500 hover:text-red-400"
              >
                Remove
              </button>
            </div>

            {/* Sets table */}
            <div className="mt-3 grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 text-sm">
              <span className="text-xs text-zinc-500">Set</span>
              <span className="text-xs text-zinc-500">Reps</span>
              <span className="text-xs text-zinc-500">Weight ({weightUnit})</span>
              <span />
              {ex.sets.map((set, setIdx) => (
                <SetRow
                  key={setIdx}
                  index={setIdx}
                  reps={set.reps}
                  weight={set.weight}
                  onChange={(field, value) => updateSet(exIdx, setIdx, field, value)}
                  onRemove={() => removeSet(exIdx, setIdx)}
                />
              ))}
            </div>
            <button
              onClick={() => addSet(exIdx)}
              className="mt-3 text-sm font-medium text-lime-400 hover:underline"
            >
              + Add set
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setPickerOpen(true)}
        className="mt-4 w-full rounded-xl border border-dashed border-zinc-700 py-4 font-medium text-zinc-400 transition-colors hover:border-lime-400/60 hover:text-lime-400"
      >
        + Add exercise
      </button>

      {error && (
        <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      {templateSaved && (
        <p className="mt-4 rounded-lg border border-lime-900 bg-lime-950/50 px-3 py-2 text-sm text-lime-400">
          Saved as template! Find it under Templates.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-lg bg-lime-400 py-3 font-semibold text-zinc-950 transition-colors hover:bg-lime-300 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Finish & Save Workout"}
        </button>
        <button
          onClick={saveAsTemplate}
          className="rounded-lg border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition-colors hover:border-zinc-500"
        >
          Save as template
        </button>
      </div>

      {pickerOpen && <ExercisePicker onPick={addExercise} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

function SetRow({
  index,
  reps,
  weight,
  onChange,
  onRemove,
}: {
  index: number;
  reps: number;
  weight: number;
  onChange: (field: "reps" | "weight", value: number) => void;
  onRemove: () => void;
}) {
  const cell =
    "w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-center outline-none focus:border-lime-400";
  return (
    <>
      <span className="text-center text-zinc-500">{index + 1}</span>
      <input
        type="number"
        min={0}
        value={reps || ""}
        onChange={(e) => onChange("reps", Number(e.target.value))}
        className={cell}
      />
      <input
        type="number"
        min={0}
        step={0.5}
        value={weight || ""}
        placeholder="BW"
        onChange={(e) => onChange("weight", Number(e.target.value))}
        className={cell}
      />
      <button onClick={onRemove} className="text-zinc-600 hover:text-red-400" aria-label="Remove set">
        ✕
      </button>
    </>
  );
}
