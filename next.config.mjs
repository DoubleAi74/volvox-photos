// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   images: {
//     loader: "custom",
//     loaderFile: "./lib/cloudflareLoader.js",
//     // 1. Add these sizes to bridge the gap between 384px and 640px
//     imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
//     // 2. Keep standard device sizes for full-screen view
//     deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
//   },
// };

// export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // 1. Extend the Client Router Cache duration
  experimental: {
    staleTimes: {
      dynamic: 10000, //3600, // 300 seconds (5 minutes). Default was 30s.
      static: 10000, //3600, // 300 seconds.
    },
  },

  images: {
    loader: "custom",
    loaderFile: "./lib/cloudflareLoader.js",
    // 2. Add these sizes to bridge the gap between 384px and 640px
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    // 3. Keep standard device sizes for full-screen view
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },

  devIndicators: {
    buildActivity: false,
    buildActivityPosition: "bottom-right",
  },
};

export default nextConfig;
