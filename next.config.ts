import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Quick tunnels (cloudflared) expose this dev server on an external
  // host. Next.js 16 blocks RSC/server-action requests from origins
  // not listed here, which silently breaks login from a tunnel URL.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
