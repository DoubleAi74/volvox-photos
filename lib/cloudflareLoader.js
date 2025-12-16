export default function cloudflareLoader({ src, width, quality }) {
  const q = quality || 75;

  // Handle absolute URLs from your DB
  const url = new URL(src);
  const path = url.pathname;

  return `https://files.volvox.pics/cdn-cgi/image/width=${width},quality=${q},format=auto${path}`;
}
