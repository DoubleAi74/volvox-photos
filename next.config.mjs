/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "files.volvox.pics",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // ... other configurations
};

export default nextConfig;
