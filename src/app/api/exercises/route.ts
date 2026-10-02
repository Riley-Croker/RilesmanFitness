// GET /api/exercises — search and filter the local exercise catalogue
// (src/data/exercisedb.json, no external calls). Used by client components
// such as the exercise picker in the workout logger.
//
// Public, like the library page. When the caller is signed in, results are
// ranked by their own history first and carry a timesDone count.
//
// Query params: search, bodyPart, equipment, muscle, after, limit

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getExercises } from "@/lib/exercise-library";
import { getExerciseUsage } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const session = await auth();
  const usage = session?.user?.id ? await getExerciseUsage(session.user.id) : undefined;

  const page = await getExercises(
    {
      search: p.get("search") || undefined,
      bodyPart: p.get("bodyPart") || undefined,
      equipment: p.get("equipment") || undefined,
      muscle: p.get("muscle") || undefined,
      after: p.get("after") || undefined,
      limit: p.get("limit") ? Number(p.get("limit")) : undefined,
    },
    usage
  );
  return NextResponse.json(page);
}
