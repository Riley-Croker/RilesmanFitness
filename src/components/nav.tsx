"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAction } from "@/lib/actions";
import type { WeightUnit } from "@/lib/units";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/workouts/new", label: "Log Workout" },
  { href: "/workouts", label: "History" },
  { href: "/exercises", label: "Exercises" },
  { href: "/templates", label: "Templates" },
  { href: "/progress", label: "Progress" },
  { href: "/calendar", label: "Calendar" },
  { href: "/records", label: "Records" },
];

export default function Nav({
  userName,
  weightUnit = "lbs",
}: {
  userName: string | null;
  weightUnit?: WeightUnit;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const toggleUnit = async () => {
    setSwitching(true);
    const next = weightUnit === "lbs" ? "kg" : "lbs";
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightUnit: next }),
    });
    router.refresh();
    setSwitching(false);
  };

  const unitToggle = (
    <button
      onClick={toggleUnit}
      disabled={switching}
      title="Toggle weight unit"
      className="flex items-center rounded-md border border-zinc-700 text-xs font-semibold disabled:opacity-50"
    >
      <span
        className={`rounded-l-[5px] px-2 py-1.5 ${
          weightUnit === "lbs" ? "bg-lime-400 text-zinc-950" : "text-zinc-400"
        }`}
      >
        lbs
      </span>
      <span
        className={`rounded-r-[5px] px-2 py-1.5 ${
          weightUnit === "kg" ? "bg-lime-400 text-zinc-950" : "text-zinc-400"
        }`}
      >
        kg
      </span>
    </button>
  );

  const linkClass = (href: string) =>
    `rounded-md px-2.5 py-1.5 text-sm transition-colors ${
      pathname === href
        ? "bg-lime-400/10 font-semibold text-lime-400"
        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="text-lime-400">▲</span> Rilesman Fitness
        </Link>

        {userName ? (
          <>
            {/* Desktop links */}
            <div className="hidden items-center gap-1 lg:flex">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                  {l.label}
                </Link>
              ))}
              <span className="ml-2">{unitToggle}</span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="ml-2 rounded-md border border-zinc-700 px-2.5 py-1.5 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-100"
                >
                  Sign out
                </button>
              </form>
            </div>

            {/* Hamburger — mobile only */}
            <button
              className="flex flex-col gap-1.5 p-2 lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span className="h-0.5 w-6 bg-zinc-200" />
              <span className="h-0.5 w-6 bg-zinc-200" />
              <span className="h-0.5 w-6 bg-zinc-200" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm text-zinc-300 hover:text-zinc-100"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-lime-400 px-3 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
            >
              Sign up
            </Link>
          </div>
        )}
      </nav>

      {/* Mobile dropdown */}
      {userName && menuOpen && (
        <div className="flex flex-col gap-1 border-t border-zinc-800 px-4 py-3 lg:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={linkClass(l.href)}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="px-2.5 py-1.5">{unitToggle}</div>
          <form action={logoutAction}>
            <button type="submit" className="px-2.5 py-1.5 text-sm text-zinc-400">
              Sign out
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
