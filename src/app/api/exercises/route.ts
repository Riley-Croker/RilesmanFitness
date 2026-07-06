// GET /api/exercises — server-side proxy to the ExerciseDB API.
// Used by client components (e.g. the exercise picker in the workout
// logger) so the browser never talks to the external API directly and
// responses benefit from Next's server fetch cache.
//
// Query params: search, bodyPart, equipment, muscle, after, limit

import { NextRequest, NextResponse } from "next/server";
import { getExercises } from "@/lib/exercise-library";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  try {
    const page = await getExercises({
      search: p.get("search") || undefined,
      bodyPart: p.get("bodyPart") || undefined,
      equipment: p.get("equipment") || undefined,
      muscle: p.get("muscle") || undefined,
      after: p.get("after") || undefined,
      limit: p.get("limit") ? Number(p.get("limit")) : undefined,
    });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: "ExerciseDB API unavailable" }, { status: 502 });
  }
}
