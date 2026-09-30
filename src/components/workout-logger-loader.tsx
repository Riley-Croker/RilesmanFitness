"use client";

// Renders the workout logger in the browser only.
//
// The logger restores an in-progress workout from localStorage, which only
// exists in the browser. If the server rendered it, the server's HTML (an
// empty logger) and the browser's first render (the restored workout) would
// differ, and React would report a hydration mismatch. `ssr: false` skips
// server rendering for this one component; the page around it still renders
// on the server as normal. (`ssr: false` is only allowed inside a client
// component, which is the only reason this small file exists.)

import dynamic from "next/dynamic";

const WorkoutLogger = dynamic(() => import("@/components/workout-logger"), {
  ssr: false,
  loading: () => <p className="py-10 text-center text-zinc-500">Loading…</p>,
});

export default WorkoutLogger;
