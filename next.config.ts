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
  // The homepage "Memória Viva" block embeds the documentary via an iframe
  // (src/components/home/MemoriaVivaBlock.tsx). Without an explicit
  // frame-src, default-src 'self' blocks every YouTube/Vimeo player.
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
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
    // Server Actions default to a 1MB body, too small for any 5MB image upload
    // (MAX_IMAGE_BYTES in src/lib/upload-limits.ts). 10MB fits one image plus
    // form fields, and matches proxyClientMaxBodySize: src/proxy.ts runs on
    // /admin/*, and a body bigger than that would be silently truncated there
    // instead of rejected. Keep MAX_ACTION_BODY_BYTES in sync with these.
    // Multi-photo gallery uploads send one photo per request (AlbumRow.tsx).
    serverActions: {
      bodySizeLimit: "10mb",
    },
    proxyClientMaxBodySize: "10mb",
  },
  // pdfjs-dist's Node build loads @napi-rs/canvas (a native addon) via a
  // plain runtime `require()` for its thumbnail-rendering support
  // (src/lib/pdf-render.ts). Bundling it through webpack/Turbopack instead
  // of leaving it as a real `require` resolved from node_modules at runtime
  // can break native addons — this keeps both packages external so Next's
  // file tracing copies the actual .node binary into the standalone output.
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
  // Even with the packages above marked external, Next's file tracing for
  // the Hostinger standalone build only copies files it can statically see
  // being imported — it missed pdfjs-dist's own worker file (loaded via a
  // dynamic, non-analyzable path at runtime) and the standard font data,
  // causing "Cannot find module .../pdf.worker.mjs" in production even
  // though everything worked locally (where the full node_modules is
  // present, tracing or not). Force-including these patterns fixes that.
  outputFileTracingIncludes: {
    "/*": [
      "node_modules/pdfjs-dist/legacy/build/**/*",
      "node_modules/pdfjs-dist/standard_fonts/**/*",
      "node_modules/@napi-rs/**/*",
    ],
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
