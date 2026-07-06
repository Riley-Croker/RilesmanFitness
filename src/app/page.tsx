// Landing page — redirects to dashboard if logged in.
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <h1 className="max-w-2xl text-5xl font-extrabold tracking-tight sm:text-6xl">
        Rilesman <span className="text-lime-400">Fitness</span>
      </h1>
      <p className="max-w-xl text-lg text-zinc-400">
        Log your workouts, browse 870+ exercises with photo demonstrations,
        and watch your strength climb over time.
      </p>
      <div className="flex gap-3">
        <Link
          href="/register"
          className="rounded-lg bg-lime-400 px-6 py-3 font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-zinc-200 transition-colors hover:border-zinc-500"
        >
          Log In
        </Link>
      </div>
      <div className="mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["📋", "Log everything", "Exercises, sets, reps and weight — saved to your own database."],
          ["🔍", "Exercise library", "Search 870+ exercises by body part, equipment or muscle."],
          ["📈", "Track progress", "Charts, personal records, streaks and a training calendar."],
        ].map(([icon, title, desc]) => (
          <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-left">
            <div className="text-2xl">{icon}</div>
            <h3 className="mt-2 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-zinc-400">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
