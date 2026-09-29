import type { NextConfig } from "next";
import { BASE_PATH } from "./src/lib/base-path";

const nextConfig: NextConfig = {
  // Serve every page, API route and static asset under /workout, in dev too,
  // so local behaves like rcroker.dev/workout. Caddy must forward the path
  // unchanged (handle, not handle_path) for this to line up.
  basePath: BASE_PATH,

  // Emits .next/standalone with only the files the server actually needs,
  // including a minimal node_modules. Roughly 10x smaller Docker image.
  output: "standalone",
};

export default nextConfig;
