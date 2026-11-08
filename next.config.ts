import type { NextConfig } from "next";

// Every guest page reads live availability and the clock (cutoffs, holding
// page), so nothing is prerendered. Cache Components stays off.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The share cards read their font and images from /assets at run time.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./assets/**"],
    "/i/[token]/opengraph-image": ["./assets/**"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
