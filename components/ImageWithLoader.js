"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";

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
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Reset loading state when src changes to prevent showing stale images
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  // Check if image is already loaded (cached) - onLoad doesn't always fire for cached images
  useEffect(() => {
    const checkIfLoaded = () => {
      // Find the actual img element inside the Next.js Image wrapper
      const container = imgRef.current;
      if (!container) return;

      const imgElement = container.querySelector('img');
      if (imgElement && imgElement.complete && imgElement.naturalWidth > 0) {
        setIsLoading(false);
      }
    };

    // Check immediately and after a short delay (for race conditions)
    checkIfLoaded();
    const timeoutId = setTimeout(checkIfLoaded, 100);

    return () => clearTimeout(timeoutId);
  }, [src]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    console.warn("[ImageWithLoader] Failed to load image:", src);
    setIsLoading(false);
    setHasError(true);
  }, [src]);

  return (
    <div ref={imgRef} className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800 z-10">
          <div className="w-6 h-6 rounded-full bg-neutral-700 animate-pulse" />
        </div>
      )}

      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
          <div className="w-6 h-6 text-neutral-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill={fill}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          sizes={sizes}
          priority={priority}
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} transition-opacity duration-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
        />
      )}
    </div>
  );
}
