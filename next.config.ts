import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Uploads (ID copies, signatures, documents, images) are capped at 4 MB each;
    // the join form shrinks large ID photos in the browser before sending.
    serverActions: { bodySizeLimit: "4.5mb" }, // matches Vercel's request body limit
  },
};

export default nextConfig;
