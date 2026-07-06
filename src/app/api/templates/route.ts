// GET  /api/templates — list the user's workout templates
// POST /api/templates — create a template (from scratch or from a workout)

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTemplates } from "@/lib/queries";

interface TemplateExerciseInput {
  exerciseId?: string | null;
  name: string;
  bodyPart?: string | null;
  equipment?: string | null;
  targetMuscle?: string | null;
  targetSets?: number;
  targetReps?: number;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getTemplates(session.user.id));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name: string;
    description?: string;
    exercises: TemplateExerciseInput[];
  };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Template name is required" }, { status: 400 });
  }
  if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
    return NextResponse.json({ error: "Add at least one exercise" }, { status: 400 });
  }

  const templateId = crypto.randomUUID();
  await db.execute(
    "INSERT INTO templates (id, user_id, name, description) VALUES (?, ?, ?, ?)",
    [templateId, session.user.id, body.name.trim(), body.description?.trim() || null]
  );

  for (let i = 0; i < body.exercises.length; i++) {
    const ex = body.exercises[i];
    await db.execute(
      `INSERT INTO template_exercises
         (id, template_id, exercise_id, name, body_part, equipment, target_muscle, target_sets, target_reps, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        templateId,
        ex.exerciseId || null,
        ex.name,
        ex.bodyPart || null,
        ex.equipment || null,
        ex.targetMuscle || null,
        Math.max(1, Math.floor(ex.targetSets ?? 3)),
        Math.max(1, Math.floor(ex.targetReps ?? 10)),
        i,
      ]
    );
  }

  return NextResponse.json({ id: templateId }, { status: 201 });
}
