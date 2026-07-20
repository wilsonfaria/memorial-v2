import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Hostinger shared box reports a high CPU count (unrelated to the
  // account's actual process/resource limits), which made `next build`
  // spawn ~20 worker processes and blow through the plan's process quota.
  // Capping this keeps builds well within a modest shared-hosting limit.
  experimental: {
    cpus: 2,
  },
};

export default nextConfig;
