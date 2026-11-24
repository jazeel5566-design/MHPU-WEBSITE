import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), usb=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // Uploads (ID copies, signatures, documents, images) are capped at 4 MB each;
    // the join form shrinks large ID photos in the browser before sending.
    serverActions: { bodySizeLimit: "4.5mb" }, // matches Vercel's request body limit
  },
};

export default nextConfig;
