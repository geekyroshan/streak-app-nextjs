/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript type checking during production builds
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  // Specify serverless function configuration
  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname,
  },
  experimental: {
    serverComponentsExternalPackages: ['child_process', 'fs']
  },
};

module.exports = nextConfig;