import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['canvas'],
  },
  images: {
    domains: ['raw.githubusercontent.com', 'example.com'],
  },
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
};

module.exports = nextConfig;
//export default nextConfig;
