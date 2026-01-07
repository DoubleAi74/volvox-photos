// app/[usernameTag]/[pageSlug]/loading.js
"use client";

import { useTheme } from "@/context/ThemeContext";
import { lighten, hexToRgba } from "@/components/dashboard/DashHeader";

const PostSkeleton = ({ blurDataURL }) => (
  <div
    className="w-full aspect-square rounded-xl shadow-sm relative overflow-hidden"
    style={{
      backgroundImage: blurDataURL ? `url("${blurDataURL}")` : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: !blurDataURL ? "#e5e5e5" : undefined,
    }}
  >
    {/* Shimmer overlay effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />

    {/* Subtle loading indicator */}
    {!blurDataURL && (
      <div className="absolute inset-0 bg-gray-200/50 animate-pulse" />
    )}
  </div>
);

export default function Loading() {
  const { themeState } = useTheme();

  // Use optimistic data if available
  const skeletonCount = themeState?.optimisticPageData?.postCount || 0;
  const previewBlurs = themeState?.optimisticPageData?.previewPostBlurs || [];
  const pageTitle = themeState?.optimisticPageData?.title || "";
  const dashHex = themeState?.optimisticPageData?.dashHex || "#ffffff";
  const backHex = themeState?.optimisticPageData?.backHex || "#ffffff";

  return (
    <div
      className="p-0 md:px-6 pt-0 pb-0 min-h-screen w-fit min-w-full"
      style={{
        backgroundColor: hexToRgba(backHex, 0.5),
      }}
    >
      <div className="sticky top-0 left-0 right-0 z-10 pt-[0px] px-0 bg-gray-100 shadow-md">
        <div className="">
          <div
            className="flex items-center justify-center md:justify-start text-2xl font-bold h-[47px] pt-4 pb-3 text-white px-9"
            style={{
              backgroundColor: dashHex,
              color: lighten(dashHex, 240) || "#000000",
            }}
          >
            {pageTitle || (
              <div className="h-8 w-48 bg-white/20 rounded-md animate-pulse" />
            )}
          </div>
        </div>
      </div>

      <div
        className="min-h-screen px-4 md:px-5 pt-5 pb-0 shadow-xl"
        style={{
          backgroundColor: hexToRgba(backHex, 1),
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Posts grid skeleton - matches PageViewClient layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 px-2 lg:grid-cols-5 xl:grid-cols-5 gap-3 p-5">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <PostSkeleton key={i} blurDataURL={previewBlurs[i] || ""} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
