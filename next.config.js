/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/testwallet',
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
