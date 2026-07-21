import type { NextConfig } from "next";

// Next.js App Router streams RSC payloads via inline `<script>` tags
// (`self.__next_f.push(...)`), so script-src can't be locked down to
// 'self' only without breaking hydration on every page — 'unsafe-inline'
// is a deliberate, documented trade-off here. Stored-HTML XSS (e.g. the
// CMS page bodies) is defended primarily via server-side sanitization
// (see src/lib/sanitize-html.ts), not by this header.
// Next dev mode (Turbopack/React DevTools) uses eval() for debugging features
// like stack-trace reconstruction — never in production — so 'unsafe-eval'
// is only added outside production, keeping the deployed CSP stricter.
const isProd = process.env.NODE_ENV === "production";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // The Hostinger shared box reports a high CPU count (unrelated to the
  // account's actual process/resource limits), which made `next build`
  // spawn ~20 worker processes and blow through the plan's process quota.
  // Capping this keeps builds well within a modest shared-hosting limit.
  experimental: {
    cpus: 2,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
