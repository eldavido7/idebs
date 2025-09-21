/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tremor/react'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
