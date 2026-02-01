/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export and basePath for GitHub Pages
  // Vercel will use server-side rendering
  output: process.env.VERCEL ? undefined : 'export',
  basePath: process.env.VERCEL ? '' : '/testwallet',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  turbopack: {},
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
