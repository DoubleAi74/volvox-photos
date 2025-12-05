/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // USE THE EXACT HOSTNAME FROM YOUR ERROR HERE:
        hostname: "pub-1d955c6bf7dc4afbae713f5a9993f51d.r2.dev",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // ... other configurations
};

export default nextConfig;
