"use client";

import React, { useState, useEffect } from "react";

export default function ImageWithLoader({ src, alt, className }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset loading state whenever the image source changes
    setIsLoading(true);

    const img = new Image();
    img.src = src;

    // When the image is fully loaded, update the state
    img.onload = () => {
      setIsLoading(false);
    };

    // Optional: Handle image loading errors
    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
      setIsLoading(false); // Stop loading even if there's an error
    };
  }, [src]); // This effect re-runs every time the `src` prop changes

  return (
    <>
      {isLoading && (
        <div className="w-full h-full flex items-center justify-center bg-neumorphic-bg">
          <div className="w-6 h-6 rounded-full bg-neumorphic-bg shadow-neumorphic-inset animate-pulse"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? "hidden" : "inline"}`} // Hide the image until it's loaded
      />
    </>
  );
}
