import Link from "next/link";
import ExerciseImage from "@/components/exercise-image";
import type { Exercise } from "@/types";

// Card used in the exercise browser grid.

export default function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Link
      href={`/exercises/${exercise.exerciseId}`}
      className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 transition-colors hover:border-lime-400/50"
    >
      <div className="aspect-[3/2] overflow-hidden bg-white">
        <ExerciseImage
          images={exercise.images}
          alt={exercise.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-3">
        <h3 className="truncate font-semibold capitalize group-hover:text-lime-400">
          {exercise.name}
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {exercise.bodyParts.slice(0, 2).map((bp) => (
            <span key={bp} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs capitalize text-zinc-300">
              {bp}
            </span>
          ))}
          {exercise.equipments.slice(0, 1).map((eq) => (
            <span key={eq} className="rounded-full bg-lime-400/10 px-2 py-0.5 text-xs capitalize text-lime-400">
              {eq}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
