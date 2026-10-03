import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const appRoot = path.dirname(fileURLToPath(import.meta.url));
const nextConfig = {
  ...(process.env.BUILD_STANDALONE ? { output: 'standalone' } : {}),
  outputFileTracingRoot: appRoot,
  reactStrictMode: true,
  transpilePackages: ['lucide-react'],
  serverExternalPackages: ['node:sqlite'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
