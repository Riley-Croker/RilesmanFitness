"use client";

// Progress charts (recharts): pick a logged exercise, see max weight /
// estimated 1RM and session volume over time. Data comes from
// /api/stats/progress.

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toDisplayWeight, type WeightUnit } from "@/lib/units";
import type { ProgressPoint } from "@/types";

export default function ProgressCharts({
  exerciseNames,
  weightUnit = "lbs",
}: {
  exerciseNames: string[];
  weightUnit?: WeightUnit;
}) {
  const [selected, setSelected] = useState(exerciseNames[0] ?? "");
  const [data, setData] = useState<ProgressPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/stats/progress?exercise=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then((points: ProgressPoint[]) => {
        if (cancelled) return;
        setData(
          points.map((p) => ({
            ...p,
            maxWeight: toDisplayWeight(p.maxWeight, weightUnit),
            volume: Math.round(toDisplayWeight(p.volume, weightUnit)),
            est1rm: toDisplayWeight(p.est1rm, weightUnit),
            date: new Date(p.date).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
          }))
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selected, weightUnit]);

  if (exerciseNames.length === 0) {
    return (
      <p className="mt-10 rounded-xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500">
        Charts unlock once you&apos;ve logged a few workouts with weights.
      </p>
    );
  }

  const tooltipStyle = {
    backgroundColor: "#18181b",
    border: "1px solid #3f3f46",
    borderRadius: "8px",
    color: "#f4f4f5",
  };

  return (
    <div>
      <label className="mt-6 flex max-w-sm flex-col gap-1.5 text-sm font-medium">
        Exercise
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 capitalize outline-none focus:border-lime-400"
        >
          {exerciseNames.map((name) => (
            <option key={name} value={name} className="capitalize">
              {name}
            </option>
          ))}
        </select>
      </label>

      {loading ? (
        <p className="mt-10 text-center text-zinc-500">Loading…</p>
      ) : data.length < 2 ? (
        <p className="mt-10 rounded-xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500">
          Log this exercise in at least two workouts to see a trend line.
        </p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="mb-4 font-semibold">Strength — max weight &amp; est. 1RM ({weightUnit})</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="maxWeight"
                  name="Max weight"
                  stroke="#a3e635"
                  strokeWidth={2}
                  dot={{ fill: "#a3e635" }}
                />
                <Line
                  type="monotone"
                  dataKey="est1rm"
                  name="Est. 1RM"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="mb-4 font-semibold">Session volume ({weightUnit})</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#27272a" }} />
                <Bar dataKey="volume" name="Volume" fill="#a3e635" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
