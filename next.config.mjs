import path from "path";

const nextConfig = {
  distDir: process.env.NEXT_BUILD_DIST_DIR || ".next",
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@/components": path.join(process.cwd(), "components"),
      "@/features": path.join(process.cwd(), "features"),
      "@/lib": path.join(process.cwd(), "lib")
    };
    return config;
  }
};

export default nextConfig;
