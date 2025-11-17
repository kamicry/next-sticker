/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用实验性功能（如果需要）
  experimental: {
    // 如果需要 ES module 支持
    esmExternals: 'loose'
  },
  
  // 配置图片域名（如果你在前端使用 Next.js Image 组件）
  images: {
    domains: ['raw.githubusercontent.com'],
    unoptimized: true // 如果使用静态导出可能需要这个
  },
  
  // 启用严格模式（可选）
  reactStrictMode: true,
  
  // 如果是静态导出
  // output: 'export',
  
  // 忽略构建过程中的 TypeScript 错误（可选）
  typescript: {
    ignoreBuildErrors: false
  },
  
  // 忽略 ESLint 错误（可选）
  eslint: {
    ignoreDuringBuilds: false
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
