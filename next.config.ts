import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow direct img src from data URIs (captcha images)
  images: {
    unoptimized: true,
  },
}

export default nextConfig
