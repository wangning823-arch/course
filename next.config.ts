import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@prisma/client'],
  allowedDevOrigins: [
    'course.wzx.homes',
    '101.37.175.30',
    '192.168.31.119',
    'localhost',
  ],
}

export default nextConfig
