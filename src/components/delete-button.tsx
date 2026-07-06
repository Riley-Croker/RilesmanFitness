"use client";

// Confirm-then-DELETE button used on workout details and template cards.

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({
  url,
  redirectTo,
  label = "Delete",
}: {
  url: string;
  redirectTo?: string;
  label?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const doDelete = async () => {
    setBusy(true);
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) {
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } else {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <span className="text-zinc-400">Sure?</span>
        <button
          onClick={doDelete}
          disabled={busy}
          className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-zinc-300"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:border-red-900 hover:text-red-400"
    >
      {label}
    </button>
  );
}
