"use client";

// Account creation form. registerAction hashes the password, inserts the
// user, and signs them in automatically.

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/actions";

export default function RegisterPage() {
  const [error, formAction, pending] = useActionState(registerAction, undefined);

  return (
    <div className="mx-auto mt-16 w-full max-w-sm">
      <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-zinc-400">Free, private, stored on your own machine.</p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Name
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none transition-colors focus:border-lime-400"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none transition-colors focus:border-lime-400"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none transition-colors focus:border-lime-400"
          />
          <span className="text-xs font-normal text-zinc-500">At least 8 characters.</span>
        </label>

        {error && (
          <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-lime-400 py-2.5 font-semibold text-zinc-950 transition-colors hover:bg-lime-300 disabled:opacity-50"
        >
          {pending ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-lime-400 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
