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

import { Fragment, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import ExerciseHistorySheet from "@/components/exercise-history-sheet";
import ExerciseImage from "@/components/exercise-image";
import ExercisePicker from "@/components/exercise-picker";
import SubstitutePicker from "@/components/substitute-picker";
import type { ReorderItem } from "@/components/exercise-reorder-list";
import { withBasePath } from "@/lib/base-path";
import { formatClock } from "@/lib/duration";
import { formatSet, historyKey, shortDate, type ExerciseHistory } from "@/lib/exercise-history";
import { toDisplayWeight, toStoredLbs, type WeightUnit } from "@/lib/units";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type DraftExercise,
  type DraftSet,
  type WorkoutDraft,
} from "@/lib/workout-draft";
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
  initialPlan = null,
  initialExercises = [],
  weightUnit = "lbs",
}: {
  userId: string;
  initialName?: string;
  initialPlan?: string | null; // the template's description
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
  // The day's plan from the template. A resumed workout keeps its own (or
  // none), like everything else in the draft.
  const [plan] = useState(() => (restored ? (restored.plan ?? null) : initialPlan));
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
  // Swapping an exercise: swapIdx opens the substitutes sheet for that card;
  // replaceIdx makes the full picker replace that card instead of adding one
  // (reached via "Search all exercises", or Swap on a custom exercise).
  const [swapIdx, setSwapIdx] = useState<number | null>(null);
  const [replaceIdx, setReplaceIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateSaved, setTemplateSaved] = useState(false);
  // Your past sessions of each exercise on screen, by historyKey(): drives
  // the "Last" line, the grey hints in empty boxes and the history sheet.
  // A key that's missing is still loading.
  const [history, setHistory] = useState<Record<string, ExerciseHistory | "error">>({});
  const [historyUid, setHistoryUid] = useState<string | null>(null); // whose sheet is open
  const requestedHistory = useRef(new Set<string>());

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
    saveDraft(userId, { name, date, notes, plan, exercises, startedAt, unit: weightUnit });
  }, [snapshot, restored, userId, name, date, notes, plan, exercises, startedAt, weightUnit]);

  // Tick once a second while the workout is running. The elapsed time is
  // always now - startedAt, never a counter, so it stays right even after
  // the phone sleeps and the interval pauses.
  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  // Load history for exercises we haven't asked about yet: all of them on
  // first render, then each one added or swapped in. One request covers
  // every new exercise. Joining the keys into a string gives the effect a
  // dependency that only changes when the set of exercises does, not on
  // every keystroke in a set box.
  const historyKeys = [...new Set(exercises.map(historyKey))].join("\n");
  useEffect(() => {
    const missing = historyKeys.split("\n").filter((k) => k && !requestedHistory.current.has(k));
    if (missing.length === 0) return;
    missing.forEach((k) => requestedHistory.current.add(k));
    const qs = missing.map((k) => `key=${encodeURIComponent(k)}`).join("&");
    fetch(withBasePath(`/api/stats/exercise-history?${qs}`))
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<Record<string, ExerciseHistory>>;
      })
      .then((data) => setHistory((prev) => ({ ...prev, ...data })))
      .catch(() => {
        // Show the error, and let the next change of exercises try again.
        missing.forEach((k) => requestedHistory.current.delete(k));
        setHistory((prev) => ({ ...prev, ...Object.fromEntries(missing.map((k) => [k, "error" as const])) }));
      });
  }, [historyKeys]);

  // Whether to mark priority exercises with ★: only worth it when some
  // exercises are optional, otherwise every card would have one.
  const hasOptional = exercises.some((ex) => ex.isOptional);

  // The most recent session of an exercise, or null if none (or not loaded).
  const lastSession = (ex: LoggerExercise) => {
    const h = history[historyKey(ex)];
    return h && h !== "error" ? (h.sessions[0] ?? null) : null;
  };

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
        // Starts empty, so the boxes show last time's numbers as grey hints
        // (see SetRow). Sets left without reps aren't saved; save() warns.
        sets: [{ reps: 0, weight: 0 }],
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
        i !== exIdx ? ex : { ...ex, sets: [...ex.sets, ex.sets[ex.sets.length - 1] ?? { reps: 0, weight: 0 }] }
      )
    );
  };

  // Tapping a set's number flips it between warm-up ("W") and working set,
  // so warm-ups can be marked in any workout, not only template ones.
  const toggleWarmup = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIdx
          ? ex
          : { ...ex, sets: ex.sets.map((s, j) => (j !== setIdx ? s : { ...s, isWarmup: !s.isWarmup })) }
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

  // Swap in place: same position, same number of sets and reps, weights
  // cleared - 100 lbs on a machine says nothing about the dumbbell version.
  // The same goes for a template's target weights; target reps, warm-up
  // marks, the note and optional/priority stay, since they describe the
  // slot in the program rather than the machine.
  // A new uid, because it's a different exercise (see the note on keys).
  const replaceExercise = (exIdx: number, ex: Exercise) => {
    setExercises((prev) =>
      prev.map((old, i) =>
        i !== exIdx
          ? old
          : {
              uid: crypto.randomUUID(),
              exerciseId: ex.exerciseId || null,
              name: ex.name,
              bodyPart: ex.bodyParts[0] ?? null,
              equipment: ex.equipments[0] ?? null,
              targetMuscle: ex.targetMuscles[0] ?? null,
              images: ex.images,
              notes: old.notes,
              isOptional: old.isOptional,
              sets: old.sets.length
                ? old.sets.map((s) => ({
                    reps: s.reps,
                    weight: 0,
                    isWarmup: s.isWarmup,
                    ...(s.target && { target: { reps: s.target.reps, weight: 0 } }),
                  }))
                : [{ reps: 0, weight: 0 }],
            }
      )
    );
  };

  const openSwap = (exIdx: number) => {
    // Custom exercises have no muscle data to match on, so go straight to search.
    if (exercises[exIdx]?.exerciseId) {
      setSwapIdx(exIdx);
    } else {
      setReplaceIdx(exIdx);
      setPickerOpen(true);
    }
  };

  const closePicker = () => {
    setPickerOpen(false);
    setReplaceIdx(null);
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
    // A box showing a grey hint is still empty, and the server drops sets
    // without reps - say so rather than lose them quietly. (For a template's
    // planned sets that's the point: skipped ones aren't saved as done.)
    const emptySets = exercises.reduce((n, ex) => n + ex.sets.filter((s) => !(s.reps > 0)).length, 0);
    if (
      emptySets > 0 &&
      !window.confirm(
        `${emptySets === 1 ? "1 set has" : `${emptySets} sets have`} no reps typed in and won't be saved` +
          " (that's right for planned sets you skipped). Save anyway?"
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      // Inputs are in the user's display unit — store canonical lbs.
      // Targets are only hints, so they're not sent.
      const payload = exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({
          reps: s.reps,
          weight: toStoredLbs(s.weight || 0, weightUnit),
          isWarmup: Boolean(s.isWarmup),
        })),
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
        description: plan,
        exercises: exercises.map((ex) => {
          // Each set becomes a planned set: what you typed, or the target
          // you were shown if the boxes are still empty. Sets with neither
          // are left out. Weights go back to lbs for storage.
          const sets = ex.sets.flatMap((s) =>
            s.reps > 0
              ? [{ reps: s.reps, weight: toStoredLbs(s.weight || 0, weightUnit), isWarmup: Boolean(s.isWarmup) }]
              : s.target
                ? [{ reps: s.target.reps, weight: s.target.weight, isWarmup: Boolean(s.isWarmup) }]
                : []
          );
          const firstWorking = sets.find((s) => !s.isWarmup) ?? sets[0];
          return {
            exerciseId: ex.exerciseId,
            name: ex.name,
            bodyPart: ex.bodyPart,
            equipment: ex.equipment,
            targetMuscle: ex.targetMuscle,
            // Kept filled in as the fallback the database always has.
            targetSets: sets.filter((s) => !s.isWarmup).length || ex.sets.length || 3,
            targetReps: firstWorking?.reps || 10,
            notes: ex.notes ?? null,
            isOptional: Boolean(ex.isOptional),
            sets,
          };
        }),
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

      {/* The template's description - the day's plan - when started from
          one. Collapsible so it doesn't push the exercises down once read;
          whitespace-pre-line keeps its line breaks. */}
      {plan && (
        <details open className="group mb-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
            Today&apos;s plan
            <span className="text-sm font-normal text-zinc-500 group-open:hidden">Show</span>
            <span className="hidden text-sm font-normal text-zinc-500 group-open:inline">Hide</span>
          </summary>
          <p className="whitespace-pre-line px-4 pb-4 text-sm leading-relaxed text-zinc-300">{plan}</p>
        </details>
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
          {exercises.map((ex, exIdx) => {
            const last = lastSession(ex);
            const target = targetSummary(ex.sets, weightUnit);
            // Working sets are numbered 1, 2, 3...; warm-ups show "W".
            let working = 0;
            const labels = ex.sets.map((s) => (s.isWarmup ? "W" : String(++working)));
            // Last time's hint for each row: working set N gets last time's
            // working set N, warm-up N gets warm-up N (or the final one of
            // that kind, for extra sets), so warm-ups never hint a work set.
            const lastWork = last?.sets.filter((s) => !s.isWarmup) ?? [];
            const lastWarm = last?.sets.filter((s) => s.isWarmup) ?? [];
            let warmSeen = 0;
            let workSeen = 0;
            const hints = ex.sets.map((s) => {
              const pool = s.isWarmup ? lastWarm : lastWork;
              const i = s.isWarmup ? warmSeen++ : workSeen++;
              return pool[i] ?? pool[pool.length - 1];
            });
            return (
            // Optional exercises (dropped first when tired) get a dashed,
            // quieter card; with any optional ones present, the others get a ★.
            <div
              key={ex.uid}
              className={`rounded-xl border p-4 ${
                ex.isOptional ? "border-dashed border-zinc-700 bg-zinc-900/20" : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              {/* The whole header is one button that opens this exercise's
                  history. The name gets its full width and wraps up to three
                  lines before cutting off, as on the summary; Swap and Remove
                  live in the bottom row with "+ Add set". The negative margin
                  lets the hover background reach past the text without moving it. */}
              <button
                type="button"
                onClick={() => setHistoryUid(ex.uid)}
                aria-haspopup="dialog"
                className="-m-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-zinc-800/60"
              >
                <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-md bg-white">
                  <ExerciseImage
                    images={ex.images ?? []}
                    alt=""
                    animate={false}
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className="block min-w-0 flex-1">
                  <span className="line-clamp-3 font-semibold capitalize leading-snug">
                    {hasOptional && !ex.isOptional && (
                      <span className="text-lime-400" title="Priority">
                        ★{" "}
                      </span>
                    )}
                    {ex.name}
                  </span>
                  {(ex.bodyPart || ex.isOptional) && (
                    <span className="block text-xs capitalize text-zinc-400">
                      {ex.isOptional && (
                        <span className="mr-1.5 rounded bg-zinc-800 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
                          Optional
                        </span>
                      )}
                      {/* inline-block: right after the badge, the first word
                          otherwise doesn't count as a word start for capitalize. */}
                      <span className="inline-block">
                        {ex.bodyPart}{ex.equipment ? ` · ${ex.equipment}` : ""}
                      </span>
                    </span>
                  )}
                  {/* This session's plan, kept visible after you start typing
                      over the grey hints. */}
                  {target && (
                    <span className="mt-0.5 block text-xs tabular-nums text-zinc-300">
                      <span className="text-lime-400/90">Target:</span> {target}
                    </span>
                  )}
                  {/* Last time, with no tap needed. */}
                  {last && (
                    <span className="mt-0.5 block text-xs tabular-nums text-zinc-400">
                      <span className="text-zinc-500">Last {shortDate(last.date)}:</span>{" "}
                      {/* Each set stays on one line; wrapping happens between them. */}
                      {last.sets.map((s, i) => (
                        <Fragment key={i}>
                          {i > 0 && " · "}
                          <span className={`whitespace-nowrap ${s.isWarmup ? "text-zinc-500" : ""}`}>
                            {s.isWarmup && "W "}
                            {formatSet(s, weightUnit)}
                          </span>
                        </Fragment>
                      ))}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xl leading-none text-zinc-600" aria-hidden>
                  ›
                </span>
                <span className="sr-only">Show your history</span>
              </button>

              {/* The template's cue for this exercise. */}
              {ex.notes && (
                <p className="mt-3 whitespace-pre-line border-l-2 border-lime-400/50 pl-3 text-sm text-zinc-300">
                  {ex.notes}
                </p>
              )}

              {/* Sets table */}
              <div className="mt-3 grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 text-sm">
                <span className="text-xs text-zinc-500">Set</span>
                <span className="text-xs text-zinc-500">Reps</span>
                <span className="text-xs text-zinc-500">Weight ({weightUnit})</span>
                <span />
                {ex.sets.map((set, setIdx) => (
                  <SetRow
                    key={setIdx}
                    label={labels[setIdx]}
                    reps={set.reps}
                    weight={set.weight}
                    isWarmup={Boolean(set.isWarmup)}
                    target={set.target}
                    hint={hints[setIdx]}
                    weightUnit={weightUnit}
                    onChange={(field, value) => updateSet(exIdx, setIdx, field, value)}
                    onToggleWarmup={() => toggleWarmup(exIdx, setIdx)}
                    onRemove={() => removeSet(exIdx, setIdx)}
                  />
                ))}
              </div>
              {/* Card actions. Padding gives each a thumb-sized tap target; the
                  negative margin keeps the row's visual spacing unchanged. */}
              <div className="-mx-2 mt-2 flex items-center gap-1 text-sm">
                <button
                  onClick={() => addSet(exIdx)}
                  className="rounded-md px-2 py-1.5 font-medium text-lime-400 hover:bg-lime-400/10"
                >
                  + Add set
                </button>
                <button
                  onClick={() => openSwap(exIdx)}
                  className="ml-auto rounded-md px-2 py-1.5 text-zinc-300 hover:bg-zinc-800 hover:text-lime-400"
                  aria-label={`Swap ${ex.name} for a similar exercise`}
                >
                  ⇄ Swap
                </button>
                <button
                  onClick={() => removeExercise(exIdx)}
                  className="rounded-md px-2 py-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                >
                  Remove
                </button>
              </div>
            </div>
            );
          })}
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

      {pickerOpen && (
        <ExercisePicker
          title={replaceIdx !== null ? "Swap exercise" : "Add exercise"}
          onPick={(ex) => {
            if (replaceIdx !== null) {
              replaceExercise(replaceIdx, ex);
              closePicker();
            } else {
              addExercise(ex);
            }
          }}
          onClose={closePicker}
        />
      )}
      {swapIdx !== null && exercises[swapIdx]?.exerciseId && (
        <SubstitutePicker
          exerciseId={exercises[swapIdx].exerciseId!}
          exerciseName={exercises[swapIdx].name}
          onPick={(ex) => {
            replaceExercise(swapIdx, ex);
            setSwapIdx(null);
          }}
          onSearchAll={() => {
            setReplaceIdx(swapIdx);
            setSwapIdx(null);
            setPickerOpen(true);
          }}
          onClose={() => setSwapIdx(null)}
        />
      )}
      {(() => {
        const ex = exercises.find((e) => e.uid === historyUid);
        return ex ? (
          <ExerciseHistorySheet
            exercise={ex}
            history={history[historyKey(ex)]}
            weightUnit={weightUnit}
            onClose={() => setHistoryUid(null)}
          />
        ) : null;
      })()}
    </div>
  );
}

// A template's plan for an exercise as one short line, or null if it has no
// targets: "150 × 5 (3 sets), after 4 warm-ups". The warm-ups' own targets
// are in their rows; working sets that repeat are counted, not listed.
// A target weight of 0 means bodyweight or "pick a weight", so it shows reps only.
function targetSummary(sets: DraftSet[], unit: WeightUnit): string | null {
  const planned = sets.filter((s) => s.target);
  if (planned.length === 0) return null;
  const warmups = planned.filter((s) => s.isWarmup).length;
  const groups: { text: string; count: number }[] = [];
  for (const s of planned) {
    if (s.isWarmup) continue;
    const t = s.target!;
    const text = t.weight > 0 ? formatSet(t, unit) : `${t.reps} reps`;
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.text === text) lastGroup.count++;
    else groups.push({ text, count: 1 });
  }
  const working = groups.map((g) => (g.count > 1 ? `${g.text} (${g.count} sets)` : g.text)).join(" · ");
  const warm = warmups ? `${warmups} warm-up${warmups === 1 ? "" : "s"}` : "";
  if (working && warm) return `${working}, after ${warm}`;
  return working || warm;
}

// One set's row. While a box is empty it shows a grey placeholder: the
// template's target for this set if there is one, otherwise the matching
// set from last time (`hint`). Either way it's only a hint - nothing is
// filled in or saved unless you type it.
function SetRow({
  label,
  reps,
  weight,
  isWarmup,
  target,
  hint,
  weightUnit,
  onChange,
  onToggleWarmup,
  onRemove,
}: {
  label: string; // "1", "2", ... or "W"
  reps: number;
  weight: number;
  isWarmup: boolean;
  target?: { reps: number; weight: number }; // weight in lbs
  hint?: { reps: number; weight: number }; // weight in lbs
  weightUnit: WeightUnit;
  onChange: (field: "reps" | "weight", value: number) => void;
  onToggleWarmup: () => void;
  onRemove: () => void;
}) {
  // Warm-up rows are quieter, so the working sets stand out.
  const cell = `w-full rounded-md border bg-zinc-950 px-2 py-1.5 text-center outline-none placeholder:text-zinc-500 focus:border-lime-400 ${
    isWarmup ? "border-zinc-800 text-zinc-300" : "border-zinc-700"
  }`;
  const show = (lbs: number) => String(toDisplayWeight(lbs, weightUnit));
  // A target weight of 0 means "bodyweight or your choice": fall back to last time's.
  const weightHint =
    target && target.weight > 0 ? show(target.weight) : hint && hint.weight > 0 ? show(hint.weight) : "BW";
  const name = isWarmup ? "Warm-up set" : `Set ${label}`;
  return (
    <>
      <button
        type="button"
        onClick={onToggleWarmup}
        className={`rounded py-1 text-center hover:bg-zinc-800 ${
          isWarmup ? "text-xs font-bold text-amber-400" : "text-zinc-500"
        }`}
        aria-label={isWarmup ? "Warm-up set: tap to make it a working set" : `Set ${label}: tap to mark as a warm-up`}
        title={isWarmup ? "Warm-up (tap to change)" : "Tap to mark as a warm-up"}
      >
        {label}
      </button>
      <input
        type="number"
        min={0}
        value={reps || ""}
        placeholder={target ? String(target.reps) : hint ? String(hint.reps) : undefined}
        aria-label={`${name} reps`}
        onChange={(e) => onChange("reps", Number(e.target.value))}
        className={cell}
      />
      <input
        type="number"
        min={0}
        step={0.5}
        value={weight || ""}
        placeholder={weightHint}
        aria-label={`${name} weight`}
        onChange={(e) => onChange("weight", Number(e.target.value))}
        className={cell}
      />
      <button onClick={onRemove} className="text-zinc-600 hover:text-red-400" aria-label="Remove set">
        ✕
      </button>
    </>
  );
}
