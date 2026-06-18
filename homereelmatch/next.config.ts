import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Turbopack from bundling the ffprobe binary (server-only native binary)
  serverExternalPackages: ["@ffprobe-installer/ffprobe"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "supabase.co" },
    ],
  },
};

export default nextConfig;
