// POST /api/settings — update user preferences (currently: weight unit).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isWeightUnit } from "@/lib/units";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!isWeightUnit(body.weightUnit)) {
    return NextResponse.json({ error: "weightUnit must be 'lbs' or 'kg'" }, { status: 400 });
  }

  await db.execute("UPDATE users SET weight_unit = ? WHERE id = ?", [
    body.weightUnit,
    session.user.id,
  ]);
  return NextResponse.json({ weightUnit: body.weightUnit });
}
