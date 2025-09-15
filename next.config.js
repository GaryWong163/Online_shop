// next.config.js
module.exports = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  allowedDevOrigins: ['https://s33.ierg4210.ie.cuhk.edu.hk'],
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
};