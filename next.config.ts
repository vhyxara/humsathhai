import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pins the workspace root to this repo -- without this, Next.js walks up
  // the filesystem for a lockfile and stops at ~/pnpm-lock.yaml (an
  // unrelated file outside this repo entirely) before reaching this
  // repo's own package-lock.json.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
