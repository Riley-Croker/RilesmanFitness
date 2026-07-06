// Personal records — heaviest set per exercise, ranked, with est. 1RM.
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPersonalRecords, getWeightUnit } from "@/lib/queries";
import { toDisplayWeight } from "@/lib/units";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function RecordsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [records, unit] = await Promise.all([
    getPersonalRecords(session.user.id),
    getWeightUnit(session.user.id),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Personal Records</h1>
      <p className="mt-1 text-zinc-400">
        Your heaviest set for every exercise you&apos;ve logged, detected automatically.
      </p>

      {records.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500">
          Log some weighted sets and your PRs will show up here.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Exercise</th>
                <th className="px-4 py-3">Best set</th>
                <th className="px-4 py-3">Est. 1RM</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.exercise} className="border-t border-zinc-800">
                  <td className="px-4 py-3 text-zinc-500">{MEDALS[i] ?? i + 1}</td>
                  <td className="px-4 py-3 font-medium capitalize">
                    {r.exerciseId ? (
                      <Link href={`/exercises/${r.exerciseId}`} className="hover:text-lime-400">
                        {r.exercise}
                      </Link>
                    ) : (
                      r.exercise
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-lime-400">
                      {toDisplayWeight(r.weight, unit)} {unit}
                    </span>
                    <span className="text-zinc-400"> × {r.reps}</span>
                  </td>
                  <td className="px-4 py-3">{toDisplayWeight(r.est1rm, unit)} {unit}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(r.date).toLocaleDateString("en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
