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
  notes?: string | null;
  isOptional?: boolean;
  // Planned sets (weight in lbs). Optional: without them the template
  // falls back to targetSets x targetReps.
  sets?: { reps: number; weight?: number; isWarmup?: boolean }[];
}

// Generous limits that only stop malformed requests, not real programs.
const MAX_SETS_PER_EXERCISE = 30;
const MAX_NOTE_LENGTH = 500; // template_exercises.notes is VARCHAR(500)

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
    description?: string | null;
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
    const exerciseRowId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO template_exercises
         (id, template_id, exercise_id, name, body_part, equipment, target_muscle,
          target_sets, target_reps, notes, is_optional, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exerciseRowId,
        templateId,
        ex.exerciseId || null,
        ex.name,
        ex.bodyPart || null,
        ex.equipment || null,
        ex.targetMuscle || null,
        Math.max(1, Math.floor(ex.targetSets ?? 3)),
        Math.max(1, Math.floor(ex.targetReps ?? 10)),
        ex.notes?.trim().slice(0, MAX_NOTE_LENGTH) || null,
        ex.isOptional ? 1 : 0,
        i,
      ]
    );

    // Planned sets: only ones with reps, in the order given.
    const sets = (Array.isArray(ex.sets) ? ex.sets : [])
      .filter((s) => Number(s?.reps) > 0)
      .slice(0, MAX_SETS_PER_EXERCISE);
    for (let j = 0; j < sets.length; j++) {
      await db.execute(
        `INSERT INTO template_sets (id, template_exercise_id, sort_order, reps, weight, is_warmup)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          exerciseRowId,
          j,
          Math.floor(Number(sets[j].reps)),
          Math.max(0, Number(sets[j].weight) || 0),
          sets[j].isWarmup ? 1 : 0,
        ]
      );
    }
  }

  return NextResponse.json({ id: templateId }, { status: 201 });
}
