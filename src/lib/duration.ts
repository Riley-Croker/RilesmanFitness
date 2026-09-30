// Formatting for workout durations (milliseconds in, text out).

// Live timer: "4:05", "42:17", "1:02:03".
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

// Summary: "45s", "42m", "1h 12m".
export function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.max(0, Math.round(ms / 1000))}s`;
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
