/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack configuration
  turbopack: {},
  
  // 配置图片域名（更新为 remotePatterns）
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true // 如果使用静态导出可能需要这个
  },
  
  // 启用严格模式（可选）
  reactStrictMode: true,
  
  // 忽略构建过程中的 TypeScript 错误（可选）
  typescript: {
    ignoreBuildErrors: false
  },
  
  // 配置 Webpack（如果需要）
  webpack: (config, { isServer }) => {
    // 如果是服务端构建，添加对 canvas 的 polyfill
    if (isServer) {
      config.externals.push('canvas');
    }
    
    return config;
  }
}

module.exports = nextConfig
