"use client";

// Turns an element on the page into a PNG and hands it to the user.
//
// modern-screenshot redraws the element's HTML and CSS onto a canvas, then
// exports the canvas as an image. One limit to know: browsers refuse to
// export a canvas containing images from another site unless that site
// allows it, and ExerciseDB's GIF server doesn't - so the summary card is
// built from text and SVG only.
//
// On phones the PNG goes to the share sheet (iPhone: "Save Image" puts it in
// Photos). Computers get a normal download instead, since a desktop share
// dialog is rarely what anyone wants.

import { useState } from "react";
import { domToBlob } from "modern-screenshot";

export default function SaveImageButton({
  targetId,
  fileName,
}: {
  targetId: string; // id of the element to capture
  fileName: string; // without extension
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const node = document.getElementById(targetId);
    if (!node) return;
    setBusy(true);
    setError(null);
    try {
      // scale 2 = twice the on-screen pixels, so text stays sharp in Photos.
      const blob = await domToBlob(node, { scale: 2, backgroundColor: "#09090b" });
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });

      const isTouch = window.matchMedia("(pointer: coarse)").matches;
      if (isTouch && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      // Closing the share sheet without choosing anything isn't an error.
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError("Couldn't create the image. A screenshot works too.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <button
        onClick={save}
        disabled={busy}
        className="rounded-lg bg-lime-400 py-3 font-semibold text-zinc-950 transition-colors hover:bg-lime-300 disabled:opacity-50"
      >
        {busy ? "Creating image…" : "Save image"}
      </button>
      {error && <p className="mt-2 text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
