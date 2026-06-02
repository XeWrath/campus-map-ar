import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Turbopack is the default bundler in Next.js 16
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fallback for any packages that try to require Node.js built-ins
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
