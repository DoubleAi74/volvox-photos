// app/[usernameTag]/loading.js
"use client";

import { useTheme } from "@/context/ThemeContext";
import { lighten, hexToRgba } from "@/components/dashboard/DashHeader";

const PageSkeleton = ({ blurDataURL }) => (
  <div
    className="w-full h-48 rounded-xl shadow-sm relative overflow-hidden"
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
  const skeletonCount = themeState?.optimisticDashboardData?.pageCount || 20;
  const pageBlurs = themeState?.optimisticDashboardData?.pageBlurs || [];
  const dashHex = themeState?.optimisticDashboardData?.dashHex || "#000000";
  const backHex = themeState?.optimisticDashboardData?.backHex || "#F4F4F5";
  const usernameTitle =
    themeState?.optimisticDashboardData?.usernameTitle || "";

  return (
    <div
      className="min-h-[100vh]"
      style={{
        backgroundColor: hexToRgba(backHex, 1),
      }}
    >
      {/* FIXED HEADER */}
      <div className="fixed top-0 left-0 right-0 z-20 pt-2 px-0">
        <div
          className="flex items-center justify-center text-2xl sm:text-4xl font-bold h-[47px] sm:h-[70px] text-white px-9 shadow-md"
          style={{
            backgroundColor: dashHex,
            color: lighten(dashHex, 240) || "#000000",
          }}
        >
          {usernameTitle || (
            <div className="h-8 w-64 bg-white/20 rounded-md animate-pulse" />
          )}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="pt-6">
        <div className="min-h-[100px] sm:min-h-[120px]"></div>

        {/* STICKY HEADER 2 */}
        <div className="sticky top-[-2px] left-0 right-0 z-10 pt-3 px-0">
          <div
            className="h-[47px] shadow-md"
            style={{
              backgroundColor: dashHex,
            }}
          />
        </div>

        {/* PAGES GRID */}
        <div className="p-3 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <PageSkeleton
                key={i}
                blurDataURL={pageBlurs[i]?.blurDataURL || ""}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
