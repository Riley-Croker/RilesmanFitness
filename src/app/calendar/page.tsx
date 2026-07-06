// Training calendar — month grid showing which days you trained.
// ?month=YYYY-MM navigates between months (server-rendered links).
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMonthWorkouts } from "@/lib/queries";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { month: monthParam } = await searchParams;
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-12
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    if (m >= 1 && m <= 12) {
      year = y;
      month = m;
    }
  }

  const byDay = await getMonthWorkouts(session.user.id, year, month);

  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  // JS getDay(): 0=Sun … 6=Sat. Convert to Monday-first offset.
  const leadingBlanks = (first.getDay() + 6) % 7;

  const prev = new Date(year, month - 2, 1);
  const next = new Date(year, month, 1);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const isToday = (day: number) =>
    year === now.getFullYear() && month === now.getMonth() + 1 && day === now.getDate();

  const trainedDays = byDay.size;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="mt-1 text-zinc-400">
            {trainedDays} training day{trainedDays === 1 ? "" : "s"} this month.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?month=${fmt(prev)}`}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm transition-colors hover:border-zinc-500"
          >
            ←
          </Link>
          <span className="min-w-40 text-center font-semibold">
            {first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <Link
            href={`/calendar?month=${fmt(next)}`}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm transition-colors hover:border-zinc-500"
          >
            →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center text-xs font-medium text-zinc-500">
            {d}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const workouts = byDay.get(day) ?? [];
          const trained = workouts.length > 0;
          return (
            <div
              key={day}
              className={`min-h-20 rounded-lg border p-1.5 sm:min-h-24 sm:p-2 ${
                trained
                  ? "border-lime-400/40 bg-lime-400/5"
                  : "border-zinc-800 bg-zinc-900/40"
              } ${isToday(day) ? "ring-2 ring-lime-400" : ""}`}
            >
              <span className={`text-xs ${trained ? "font-bold text-lime-400" : "text-zinc-500"}`}>
                {day}
              </span>
              <div className="mt-1 flex flex-col gap-1">
                {workouts.map((w) => (
                  <Link
                    key={w.id}
                    href={`/workouts/${w.id}`}
                    className="truncate rounded bg-lime-400/15 px-1.5 py-0.5 text-[11px] font-medium text-lime-300 transition-colors hover:bg-lime-400/30"
                    title={w.name}
                  >
                    {w.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
