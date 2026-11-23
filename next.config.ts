import type { NextConfig } from "next";

// Export statis -> folder "out" (siap Netlify)
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
