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
    serverComponentsExternalPackages: ['child_process', 'fs'],
    // Allow spawning processes in serverless functions
    allowedReactFormActions: true,
  },
  // Configure environment variables for Git
  env: {
    GIT_EXECUTABLE_PATH: process.env.GIT_EXECUTABLE_PATH || 'git',
  }
};

module.exports = nextConfig;