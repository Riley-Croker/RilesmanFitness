// Downloads the ExerciseDB free-tier catalogue into src/data/exercisedb.json.
//
// The app never calls ExerciseDB at runtime: it searches this saved copy
// locally (src/lib/exercise-library.ts). Only the GIFs load from ExerciseDB,
// in the user's browser, via each exercise's gifUrl.
//
// Three steps, because the raw catalogue needs cleaning:
//   1. Download. The free API is rate limited (about 10 requests, then HTTP
//      429 with a Retry-After header) and returns at most 25 exercises per
//      page, so this takes a few minutes.
//   2. Check every GIF. In Sep 2026 about 1 in 9 returned 404.
//   3. De-duplicate by name. ~200 names appear more than once; the copies
//      share name, muscles and instructions and differ only in GIF, and every
//      broken GIF had a working twin. Keep one working copy per name.
//
// Run it only when you want fresh data:  npm run data:exercises

// Our own names for exercises whose ExerciseDB name isn't what people call
// them, keyed by exerciseId. Applied on every download, so a refresh never
// undoes them. Keep these stable: personal records and progress charts
// group logged sets by name, so renaming an exercise someone has already
// logged splits their history unless the database rows are updated too.
const NAME_OVERRIDES: Record<string, string> = {
  ZfyAGhK: "face pull", // ExerciseDB: "cable standing rear delt row (with rope)"
};

import { writeFileSync } from "fs";
import { join } from "path";

const BASE = "https://oss.exercisedb.dev/api/v1/exercises";
const OUT = join(process.cwd(), "src", "data", "exercisedb.json");
const HEADERS = { "User-Agent": "Mozilla/5.0" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RawExercise {
  exerciseId: string;
  name: string;
  gifUrl: string;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

interface Page {
  data: RawExercise[];
  meta: { hasNextPage: boolean; nextCursor?: string; total?: number };
}

async function download(): Promise<RawExercise[]> {
  const all: RawExercise[] = [];
  let after: string | undefined;
  for (;;) {
    const url = `${BASE}?limit=25${after ? `&after=${after}` : ""}`;
    const res = await fetch(url, { headers: HEADERS });
    if (res.status === 429) {
      await sleep((Number(res.headers.get("retry-after")) || 5) * 1000 + 500);
      continue; // retry the same page
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);

    const page = (await res.json()) as Page;
    all.push(...page.data);
    process.stdout.write(`\r1/3 downloading: ${all.length}${page.meta.total ? ` / ${page.meta.total}` : ""}`);
    if (!page.meta.hasNextPage || !page.meta.nextCursor) break;
    after = page.meta.nextCursor;
    await sleep(400);
  }
  console.log();
  return all;
}

async function gifWorks(url: string): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { method: "HEAD", headers: HEADERS });
      if (res.status === 429) {
        await sleep(3000);
        continue;
      }
      return res.ok;
    } catch {
      await sleep(1000);
    }
  }
  return false;
}

async function checkGifs(list: RawExercise[]): Promise<Set<string>> {
  const working = new Set<string>();
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < list.length) {
      const e = list[next++];
      if (await gifWorks(e.gifUrl)) working.add(e.exerciseId);
      process.stdout.write(`\r2/3 checking GIFs: ${++done} / ${list.length}`);
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`  (${list.length - working.size} broken)`);
  return working;
}

function clean(e: RawExercise): RawExercise {
  return {
    ...e,
    // Names arrive in mixed case ("Machine Chest Press", "cable seated row").
    // Store lowercase; the UI title-cases with CSS. Overrides win.
    name: NAME_OVERRIDES[e.exerciseId] ?? e.name.trim().toLowerCase(),
    // Instructions arrive as "Step:1 Do the thing." - drop the prefix, the UI
    // numbers them itself.
    instructions: e.instructions.map((s) => s.replace(/^Step:\s*\d+\s*/i, "").trim()),
  };
}

async function main() {
  const raw = await download();
  const unique = [...new Map(raw.map((e) => [e.exerciseId, e])).values()];
  const working = await checkGifs(unique);

  const cleaned = unique.map(clean).filter((e) => working.has(e.exerciseId));

  // Names are unique in the saved list (de-duplication keys on them), so an
  // override that reuses another exercise's name would silently drop one.
  for (const [id, name] of Object.entries(NAME_OVERRIDES)) {
    const clash = cleaned.find((e) => e.name === name && e.exerciseId !== id);
    if (clash) {
      throw new Error(
        `NAME_OVERRIDES: "${name}" (${id}) is already the name of ${clash.exerciseId}. Pick a different name.`
      );
    }
    if (!cleaned.some((e) => e.exerciseId === id)) {
      console.warn(`\nNAME_OVERRIDES: ${id} ("${name}") wasn't in this download (removed, or its GIF is broken). Skipped.`);
    }
  }

  const byName = new Map<string, RawExercise>();
  for (const e of cleaned) {
    if (!byName.has(e.name)) byName.set(e.name, e);
  }
  const list = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));

  writeFileSync(OUT, JSON.stringify(list, null, 1) + "\n");
  console.log(`3/3 saved ${list.length} exercises (from ${raw.length} downloaded) to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
