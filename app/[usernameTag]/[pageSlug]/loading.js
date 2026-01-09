// app/[usernameTag]/[pageSlug]/loading.js
"use client";

import { useEffect } from "react"; // 1. Import useEffect
import { useTheme } from "@/context/ThemeContext";
import { lighten, hexToRgba } from "@/components/dashboard/DashHeader";

// Updated Skeleton to match the "Actual Post Card" design
const PostSkeleton = ({ blurDataURL }) => (
  <div className="p-1 rounded-md bg-[#3f3e3b]/30 shadow-md h-full flex flex-col">
    <div
      className="w-full aspect-[4/3] rounded-sm overflow-hidden relative"
      style={{
        backgroundImage: blurDataURL ? `url("${blurDataURL}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: !blurDataURL ? "#e5e5e5" : undefined,
      }}
    >
      {/* Shimmer overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />

      {/* Subtle loading indicator if no blur data is present */}
      {!blurDataURL && (
        <div className="absolute inset-0 bg-gray-200/50 animate-pulse" />
      )}
    </div>
  </div>
);

export default function Loading() {
  const { themeState } = useTheme();

  // 2. Add this Effect Hook
  useEffect(() => {
    // Force scroll to top immediately
    window.scrollTo(0, 0);

    // Prevent scrolling by locking the body
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    // Cleanup function: Re-enable scrolling when loading finishes (component unmounts)
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Use optimistic data if available to prevent layout shift
  const skeletonCount = themeState?.optimisticPageData?.postCount || 0;
  const previewBlurs = themeState?.optimisticPageData?.previewPostBlurs || [];
  const pageTitle = themeState?.optimisticPageData?.title || "";
  const dashHex = themeState?.optimisticPageData?.dashHex || "#181818";
  const backHex = themeState?.optimisticPageData?.backHex || "#242424";

  return (
    <div
      // 3. Changed min-h-screen to h-screen and added overflow-hidden to the wrapper
      // to ensure the loading component itself doesn't generate a scrollbar
      className="p-0 md:px-6 pt-0 pb-0 h-screen overflow-hidden w-fit min-w-full"
      style={{
        backgroundColor: hexToRgba(backHex, 0.5),
      }}
    >
      {/* Header Skeleton / Placeholder */}
      <div className="sticky top-0 left-0 right-0 z-10 pt-[0px] px-0 bg-gray-100 shadow-md">
        <div className="">
          <div
            className="flex items-center justify-center md:justify-start text-2xl font-bold h-[47px] pt-4 pb-3 text-white px-9"
            style={{
              backgroundColor: dashHex,
              color: lighten(dashHex, 240) || "#000000",
            }}
          >
            {pageTitle || <div className="" />}
          </div>
        </div>
      </div>

      <div
        className="sticky z-10 w-full h-[4px] shadow-sm"
        style={{
          backgroundColor: lighten(dashHex, 30) || "#ffffff",
          top: "47px",
        }}
      />
      <div
        className="sticky z-10 w-full h-[7px] shadow-sm"
        style={{
          backgroundColor: dashHex || "#ffffff",
          top: "51px",
        }}
      />

      <div
        className="min-h-screen px-4 md:px-5 pt-[11px] pb-0 shadow-xl"
        style={{
          backgroundColor: hexToRgba(backHex, 1),
        }}
      >
        {pageTitle && (
          <div className="max-w-7xl mx-auto">
            {/* Posts grid skeleton - matches PageViewClient layout */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 px-2 lg:grid-cols-5 xl:grid-cols-5 gap-3 p-5">
              {Array.from({
                length: skeletonCount > 0 ? skeletonCount : 10,
              }).map((_, i) => (
                <PostSkeleton key={i} blurDataURL={previewBlurs[i] || ""} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
