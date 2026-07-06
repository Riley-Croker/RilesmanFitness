// GET /api/stats/progress?exercise=<name> — time series of max weight,
// volume, and estimated 1RM for one exercise, used by the progress charts.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getExerciseProgress } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const exercise = request.nextUrl.searchParams.get("exercise");
  if (!exercise) {
    return NextResponse.json({ error: "exercise param required" }, { status: 400 });
  }
  return NextResponse.json(await getExerciseProgress(session.user.id, exercise));
}
