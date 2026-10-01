"use client";

// The workout logger: build a workout from ExerciseDB exercises (or
// custom ones), add sets with reps/weight, then save via POST
// /api/workouts. Can be pre-seeded from a template or a single exercise
// (?template=<id> / ?exercise=<id> handled by the page and passed in).
// "Save as template" stores the exercise list as a reusable routine.
//
// Two ways to use it:
//   - Live: press Start, and a timer runs until Finish. The start and finish
//     times are saved with the workout and shown on its summary.
//   - After the fact: skip Start, pick a date, and save - no times recorded.
//
// The workout in progress is kept in localStorage (src/lib/workout-draft.ts)
// so a reload or a discarded tab resumes it, timer included. That's also why
// this component is rendered browser-only (workout-logger-loader.tsx).

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import ExerciseImage from "@/components/exercise-image";
import ExercisePicker from "@/components/exercise-picker";
import type { ReorderItem } from "@/components/exercise-reorder-list";
import { withBasePath } from "@/lib/base-path";
import { formatClock } from "@/lib/duration";
import { toDisplayWeight, toStoredLbs, type WeightUnit } from "@/lib/units";
import { clearDraft, loadDraft, saveDraft, type DraftExercise, type WorkoutDraft } from "@/lib/workout-draft";
import type { Exercise } from "@/types";

// Reorder mode pulls in the drag-and-drop library, so it's loaded only when
// someone actually opens it.
const ExerciseReorderList = dynamic(() => import("@/components/exercise-reorder-list"), {
  loading: () => <p className="py-6 text-center text-sm text-zinc-500">Loading…</p>,
});

// Every exercise in the logger carries a stable uid. React uses it as the
// card's key, so when exercises are reordered each card's state (focus,
// image) moves with its exercise instead of staying at the old position.
type LoggerExercise = ReorderItem;

const withUid = (ex: DraftExercise): LoggerExercise =>
  ex.uid ? (ex as LoggerExercise) : { ...ex, uid: crypto.randomUUID() };

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// A draft typed in the other unit (the lbs/kg toggle was flipped since) gets
// its weights converted, so 60 kg never turns into 60 lbs.
function restore(userId: string, unit: WeightUnit): WorkoutDraft | null {
  const draft = loadDraft(userId);
  if (!draft || draft.unit === unit) return draft;
  return {
    ...draft,
    unit,
    exercises: draft.exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => ({ ...s, weight: toDisplayWeight(toStoredLbs(s.weight || 0, draft.unit), unit) })),
    })),
  };
}

export default function WorkoutLogger({
  userId,
  initialName = "",
  initialExercises = [],
  weightUnit = "lbs",
}: {
  userId: string;
  initialName?: string;
  initialExercises?: DraftExercise[];
  weightUnit?: WeightUnit;
}) {
  const router = useRouter();

  // Read the saved draft once, on first render. A lazy initializer (a
  // function passed to useState) runs only then, not on every re-render.
  const [restored] = useState(() => restore(userId, weightUnit));

  const [name, setName] = useState(restored?.name ?? initialName);
  const [date, setDate] = useState(restored?.date ?? today());
  const [notes, setNotes] = useState(restored?.notes ?? "");
  // Lazy, so the uids are generated once rather than on every render.
  // Drafts saved before reordering existed get theirs here.
  const [exercises, setExercises] = useState<LoggerExercise[]>(() =>
    (restored?.exercises ?? initialExercises).map(withUid)
  );
  const [reordering, setReordering] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(restored?.startedAt ?? null);
  const [now, setNow] = useState(() => Date.now());
  const [showRestored, setShowRestored] = useState(restored !== null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateSaved, setTemplateSaved] = useState(false);

  // Set once the workout is saved or discarded, so the persistence effect
  // below can't write it back to storage on the way out.
  const done = useRef(false);

  // Persist on every change. A fresh logger that hasn't been touched keeps no
  // draft, so opening a template to look at it doesn't leave a workout
  // "in progress" behind; comparing against the first render's snapshot
  // (rather than counting renders) also holds under React's dev-mode double
  // effects.
  const snapshot = JSON.stringify({ name, date, notes, exercises, startedAt });
  const firstSnapshot = useRef(snapshot);
  useEffect(() => {
    if (done.current) return;
    if (!restored && snapshot === firstSnapshot.current) {
      clearDraft(userId);
      return;
    }
    saveDraft(userId, { name, date, notes, exercises, startedAt, unit: weightUnit });
  }, [snapshot, restored, userId, name, date, notes, exercises, startedAt, weightUnit]);

  // Tick once a second while the workout is running. The elapsed time is
  // always now - startedAt, never a counter, so it stays right even after
  // the phone sleeps and the interval pauses.
  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const timed = startedAt !== null;

  const start = () => {
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
    setDate(today());
  };

  const discard = () => {
    if (!window.confirm("Discard this workout? Everything logged in it will be lost.")) return;
    done.current = true;
    clearDraft(userId);
    // A full reload gives a clean logger with nothing left in memory.
    window.location.assign(withBasePath("/workouts/new"));
  };

  const addExercise = (ex: Exercise) => {
    setExercises((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
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
    // Nobody wants to be blocked by a name field at the end of a session:
    // an unnamed live workout is named after its day.
    const finalName =
      name.trim() ||
      (startedAt !== null
        ? `${new Date(startedAt).toLocaleDateString("en-US", { weekday: "long" })} Workout`
        : "");
    if (!finalName) return setError("Give your workout a name.");
    if (exercises.length === 0) return setError("Add at least one exercise.");
    setSaving(true);
    try {
      // Inputs are in the user's display unit — store canonical lbs.
      const payload = exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({ ...s, weight: toStoredLbs(s.weight || 0, weightUnit) })),
      }));
      const res = await fetch(withBasePath("/api/workouts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          date,
          notes,
          exercises: payload,
          ...(startedAt !== null && {
            startedAt: new Date(startedAt).toISOString(),
            finishedAt: new Date().toISOString(),
          }),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save workout.");
      }
      const { id } = await res.json();
      done.current = true;
      clearDraft(userId);
      router.push(`/workouts/${id}/summary`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save workout.");
      setSaving(false);
    }
  };

  const saveAsTemplate = async () => {
    setError(null);
    if (!name.trim()) return setError("Give your workout a name first — it becomes the template name.");
    if (exercises.length === 0) return setError("Add at least one exercise.");
    const res = await fetch(withBasePath("/api/templates"), {
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
      {/* Timer: a Start prompt before, a pinned running clock after */}
      {timed ? (
        <div className="sticky top-14 z-30 -mx-4 mb-5 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-2xl font-bold tabular-nums leading-none" role="timer" aria-live="off">
                {formatClock(now - startedAt)}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Started{" "}
                {new Date(startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
            <button onClick={discard} className="px-2 text-sm text-zinc-500 hover:text-red-400">
              Discard
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-lime-400 px-5 py-2.5 font-semibold text-zinc-950 transition-colors hover:bg-lime-300 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Finish"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-lime-400/30 bg-lime-400/5 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Ready to train?</p>
            <p className="mt-0.5 text-sm text-zinc-400">
              Start the timer when you begin. Logging a past workout? Skip this and just fill it in.
            </p>
          </div>
          <button
            onClick={start}
            className="shrink-0 rounded-lg bg-lime-400 px-5 py-2.5 font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
          >
            ▶ Start
          </button>
        </div>
      )}

      {showRestored && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
          <p className="min-w-0 flex-1 text-zinc-300">Picked up where you left off.</p>
          {!timed && (
            <button onClick={discard} className="text-zinc-500 hover:text-red-400">
              Discard
            </button>
          )}
          <button onClick={() => setShowRestored(false)} className="text-zinc-500 hover:text-zinc-200" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {/* Workout meta */}
      <div className="flex flex-wrap gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workout name — e.g. Push Day"
          className={`${inputClass} min-w-60 flex-1 text-base font-semibold`}
        />
        {/* A live workout's date is the day it started. */}
        {!timed && (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className={`${inputClass} mt-3 w-full`}
      />

      {/* Exercises header - the Reorder toggle needs at least two to swap */}
      {exercises.length >= 2 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">
            {reordering ? "Drag ⠿ to change the order" : `${exercises.length} exercises`}
          </p>
          <button
            onClick={() => setReordering((r) => !r)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              reordering
                ? "bg-lime-400 text-zinc-950 hover:bg-lime-300"
                : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            {reordering ? "Done" : "⇅ Reorder"}
          </button>
        </div>
      )}

      {reordering ? (
        <div className="mt-3">
          {/* Changing the order only rewrites the exercises array; the
              draft effect saves it, and the save sends it in this order,
              which becomes each exercise's sort_order in the database. */}
          <ExerciseReorderList exercises={exercises} onReorder={setExercises} />
          <button
            onClick={() => setReordering(false)}
            className="mt-4 w-full rounded-xl bg-lime-400 py-3 font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
          >
            Done
          </button>
        </div>
      ) : (
        <>
        <div className={`${exercises.length >= 2 ? "mt-3" : "mt-6"} flex flex-col gap-4`}>
          {exercises.map((ex, exIdx) => (
            <div key={ex.uid} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
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
        </>
      )}

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

      {/* Hidden while reordering, so Done is the obvious next step. A live
          workout can still be finished from the timer bar. */}
      {!reordering && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-lg bg-lime-400 py-3 font-semibold text-zinc-950 transition-colors hover:bg-lime-300 disabled:opacity-50"
          >
            {saving ? "Saving…" : timed ? "Finish Workout" : "Save Workout"}
          </button>
          <button
            onClick={saveAsTemplate}
            className="rounded-lg border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition-colors hover:border-zinc-500"
          >
            Save as template
          </button>
        </div>
      )}

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
