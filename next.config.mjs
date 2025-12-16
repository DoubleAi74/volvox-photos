/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./lib/cloudflareLoader.js",
  },
};

export default nextConfig;
