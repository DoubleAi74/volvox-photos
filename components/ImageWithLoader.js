"use client";

import Image from "next/image";
import { useState } from "react";

export default function ImageWithLoader({
  src,
  alt,
  className = "",
  sizes = "100vw",
  fill = true,
  width,
  height,
  priority = false,
}) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800 z-10">
          <div className="w-6 h-6 rounded-full bg-neutral-700  animate-pulse" />
        </div>
      )}

      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        sizes={sizes}
        priority={priority}
        onLoad={() => setIsLoading(false)}
        className={`${className} transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}
