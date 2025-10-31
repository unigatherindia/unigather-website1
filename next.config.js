/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Performance optimizations
  swcMinify: true,
  
  // Compression
  compress: true,
  
  // Image optimization
  images: {
    domains: ['localhost', 'unigather.co.in'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
  },
}

module.exports = nextConfig
