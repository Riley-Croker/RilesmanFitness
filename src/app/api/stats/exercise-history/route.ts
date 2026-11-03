// GET /api/stats/exercise-history — your last few sessions and best set for
// each exercise in the workout logger (see src/lib/exercise-history.ts).
//
// Query params: key, repeated once per exercise, each from historyKey():
//   ?key=id:EIeI8Vf&key=name:my%20custom%20exercise
// Returns { [key]: { sessions, best } }, with every key present (empty when
// never logged). Weights are in stored lbs; the logger converts for display.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRecentExerciseHistory } from "@/lib/queries";

// A workout rarely has more than a dozen exercises; this just stops a
// hand-made URL from asking for the whole catalogue at once.
const MAX_KEYS = 40;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = [...new Set(request.nextUrl.searchParams.getAll("key"))]
    .filter((k) => /^(id|name):./.test(k) && k.length <= 260)
    .slice(0, MAX_KEYS);

  return NextResponse.json(await getRecentExerciseHistory(session.user.id, keys));
}
