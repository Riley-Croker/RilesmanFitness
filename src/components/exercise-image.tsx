"use client";

// Exercise demonstration photos. Each free-exercise-db exercise ships
// two photos (start and end position); when both are present this
// alternates between them to mimic an animated demo. Falls back to a
// placeholder if there are no images or the CDN fails.

import { useEffect, useState } from "react";

export default function ExerciseImage({
  images,
  alt,
  className = "",
  animate = true,
}: {
  images: string[];
  alt: string;
  className?: string;
  animate?: boolean;
}) {
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!animate || failed || images.length < 2) return;
    const timer = setInterval(() => setFrame((f) => (f + 1) % images.length), 1200);
    return () => clearInterval(timer);
  }, [animate, failed, images.length]);

  if (images.length === 0 || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-800 text-4xl ${className}`}
        role="img"
        aria-label={alt}
      >
        🏋️
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={images[frame]}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
