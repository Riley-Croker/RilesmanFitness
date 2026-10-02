// GET /api/exercises/[id]/substitutes — exercises that can replace this one,
// for the workout logger's Swap button (see getSubstitutes in
// src/lib/exercise-library.ts for how they're chosen and ranked).
//
// Public like the rest of the catalogue. When signed in, your own history
// ranks within each similarity band and results carry a timesDone count.
//
// Query params: equipment (optional, one of the returned `equipments`)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubstitutes } from "@/lib/exercise-library";
import { getExerciseUsage } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const usage = session?.user?.id ? await getExerciseUsage(session.user.id) : undefined;

  const result = await getSubstitutes(id, {
    usage,
    equipment: request.nextUrl.searchParams.get("equipment") || undefined,
    limit: 8,
  });
  if (!result.base) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }
  return NextResponse.json({
    base: { name: result.base.name, targetMuscle: result.base.targetMuscles[0] ?? null },
    equipments: result.equipments,
    exercises: result.exercises,
  });
}
