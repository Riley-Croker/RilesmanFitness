// Exercise browser — search and filter the ExerciseDB catalogue.
// Server-rendered: filters arrive as URL search params via a GET form,
// so results are shareable/bookmarkable and cached by the server.

import Link from "next/link";
import ExerciseCard from "@/components/exercise-card";
import { getBodyParts, getEquipments, getExercises, getMuscles } from "@/lib/exercise-library";

export const dynamic = "force-dynamic";

interface Search {
  search?: string;
  bodyPart?: string;
  equipment?: string;
  muscle?: string;
  after?: string;
}

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const [bodyParts, equipments, muscles, page] = await Promise.all([
    getBodyParts(),
    getEquipments(),
    getMuscles(),
    getExercises({ ...params, limit: 12 }),
  ]);

  // Build the "next page" link, preserving active filters.
  const nextParams = new URLSearchParams();
  if (params.bodyPart) nextParams.set("bodyPart", params.bodyPart);
  if (params.equipment) nextParams.set("equipment", params.equipment);
  if (params.muscle) nextParams.set("muscle", params.muscle);
  if (page.nextCursor) nextParams.set("after", page.nextCursor);

  const selectClass =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none transition-colors focus:border-lime-400";

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Exercise Library</h1>
      <p className="mt-1 text-zinc-400">
        {page.total.toLocaleString()} exercises with photo demonstrations — search or filter to find your next movement.
      </p>

      {/* Filter form — plain GET so state lives in the URL */}
      <form method="GET" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex min-w-52 flex-1 flex-col gap-1 text-sm font-medium">
          Search
          <input
            name="search"
            defaultValue={params.search ?? ""}
            placeholder="e.g. bench press, squat…"
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Body part
          <select name="bodyPart" defaultValue={params.bodyPart ?? ""} className={selectClass}>
            <option value="">All</option>
            {bodyParts.map((bp) => (
              <option key={bp} value={bp}>{bp}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Equipment
          <select name="equipment" defaultValue={params.equipment ?? ""} className={selectClass}>
            <option value="">All</option>
            {equipments.map((eq) => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Target muscle
          <select name="muscle" defaultValue={params.muscle ?? ""} className={selectClass}>
            <option value="">All</option>
            {muscles.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-lime-400 px-5 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
        >
          Apply
        </button>
        <Link
          href="/exercises"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500"
        >
          Reset
        </Link>
      </form>

      {/* Results */}
      {page.exercises.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500">
          No exercises matched. Try a different search or clear some filters.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {page.exercises.map((ex) => (
            <ExerciseCard key={ex.exerciseId} exercise={ex} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-8 flex justify-center gap-3">
        {params.after && (
          <Link
            href="/exercises"
            className="rounded-lg border border-zinc-700 px-5 py-2 text-sm transition-colors hover:border-zinc-500"
          >
            ⏮ First page
          </Link>
        )}
        {page.hasNextPage && page.nextCursor && (
          <Link
            href={`/exercises?${nextParams}`}
            className="rounded-lg bg-zinc-800 px-5 py-2 text-sm font-medium transition-colors hover:bg-zinc-700"
          >
            Next page →
          </Link>
        )}
      </div>
    </div>
  );
}
