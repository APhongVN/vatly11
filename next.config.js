/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  output: 'standalone', // Quan trọng: Giảm dung lượng build, fix lỗi treo RAM
};
module.exports = nextConfig;