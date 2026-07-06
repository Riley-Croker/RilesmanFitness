// GET /api/exercises/[id] — proxy for one ExerciseDB exercise. Used to
// enrich fuzzy-search picks (the search endpoint returns slim objects
// without body part / equipment / muscle data).

import { NextRequest, NextResponse } from "next/server";
import { getExercise } from "@/lib/exercise-library";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const exercise = await getExercise(id);
  if (!exercise) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(exercise);
}
