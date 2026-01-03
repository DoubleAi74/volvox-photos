// lib/cloudflareLoader.js

export default function cloudflareLoader({ src, width, quality }) {
  const q = quality || 75;

  // 1. Safety check: If it's a local image, return it as-is
  // (Local images shouldn't go through Cloudflare resizing usually)
  if (src.startsWith("/")) {
    return src;
  }

  try {
    const url = new URL(src);
    const path = url.pathname;
    // 2. Return the optimized URL
    return `https://files.volvox.pics/cdn-cgi/image/width=${width},quality=${q},format=auto${path}`;
  } catch (e) {
    // 3. Fallback: If URL parsing fails, return original src to prevent crash
    return src;
  }
}
