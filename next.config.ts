/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Always use basePath for GitHub Pages, except in dev mode
  basePath: process.env.NODE_ENV === 'development' ? '' : '/testwallet',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  turbopack: {},
  webpack: (config: any) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
