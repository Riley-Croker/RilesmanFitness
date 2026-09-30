// Front and back body outlines with the muscles a workout trained shaded in
// lime - brighter means more sets. Pure SVG, so it renders on the server and
// comes out crisp in the summary's "Save image" export.

import { BACK_SHAPES, BACK_VIEWBOX, FRONT_SHAPES, FRONT_VIEWBOX, type BodyRegionShapes } from "@/components/body-map-data";
import type { MusclesWorked } from "@/lib/muscles";

const BODY = "#3f3f46"; // zinc-700: untrained muscle
const LIME = "#a3e635"; // lime-400

function View({
  label,
  viewBox,
  shapes,
  regions,
}: {
  label: string;
  viewBox: string;
  shapes: BodyRegionShapes[];
  regions: MusclesWorked["regions"];
}) {
  return (
    <figure className="flex flex-1 flex-col items-center gap-1">
      <svg viewBox={viewBox} className="h-40 w-auto" role="img" aria-label={`${label} view`}>
        {shapes.map(({ region, shapes: polys }) => {
          const intensity = regions[region as keyof typeof regions];
          // Worked muscles run from 35% to full lime so even a light
          // secondary is clearly visible against the grey body.
          const fill = intensity ? LIME : BODY;
          const opacity = intensity ? 0.35 + 0.65 * intensity : 1;
          return polys.map((points, i) => (
            <polygon key={`${region}-${i}`} points={points} fill={fill} fillOpacity={opacity} />
          ));
        })}
      </svg>
      <figcaption className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</figcaption>
    </figure>
  );
}

export default function BodyMap({ regions }: { regions: MusclesWorked["regions"] }) {
  return (
    <div className="flex justify-center gap-4">
      <View label="Front" viewBox={FRONT_VIEWBOX} shapes={FRONT_SHAPES} regions={regions} />
      <View label="Back" viewBox={BACK_VIEWBOX} shapes={BACK_SHAPES} regions={regions} />
    </div>
  );
}
