// Workout templates ("routines") — start a pre-filled workout with one
// click. Templates are created from the workout logger via
// "Save as template".
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DeleteButton from "@/components/delete-button";
import { getTemplates } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const templates = await getTemplates(session.user.id);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
      <p className="mt-1 text-zinc-400">
        Reusable routines. Build a workout in the logger, hit “Save as template”, and it lands here.
      </p>

      {templates.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500">
          No templates yet.{" "}
          <Link href="/workouts/new" className="text-lime-400 hover:underline">
            Build a workout
          </Link>{" "}
          and save it as a template.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h2 className="text-lg font-semibold">{t.name}</h2>
              {t.description && <p className="mt-1 text-sm text-zinc-400">{t.description}</p>}
              <ul className="mt-3 flex flex-1 flex-col gap-1.5 text-sm text-zinc-300">
                {t.exercises.map((ex) => (
                  <li key={ex.id} className="flex justify-between gap-2">
                    <span className="capitalize">{ex.name}</span>
                    <span className="shrink-0 text-zinc-500">
                      {ex.targetSets} × {ex.targetReps}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-2">
                <Link
                  href={`/workouts/new?template=${t.id}`}
                  className="rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
                >
                  Start workout
                </Link>
                <DeleteButton url={`/api/templates/${t.id}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
