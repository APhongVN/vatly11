/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Đã xóa output: 'standalone' để tương thích với next start
  experimental: {
    serverComponentsExternalPackages: ['@supabase/ssr'],
  },
};
module.exports = nextConfig;