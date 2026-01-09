// // app/[usernameTag]/loading.js
// "use client";

// import { useTheme } from "@/context/ThemeContext";
// import { lighten, hexToRgba } from "@/components/dashboard/DashHeader";

// const PageSkeleton = ({ blurDataURL }) => (
//   <div
//     className="w-full h-48 rounded-xl shadow-sm relative overflow-hidden"
//     style={{
//       backgroundImage: blurDataURL ? `url("${blurDataURL}")` : undefined,
//       backgroundSize: "cover",
//       backgroundPosition: "center",
//       backgroundColor: !blurDataURL ? "#e5e5e5" : undefined,
//     }}
//   >
//     {/* Shimmer overlay effect */}
//     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />

//     {/* Subtle loading indicator */}
//     {!blurDataURL && (
//       <div className="absolute inset-0 bg-gray-200/50 animate-pulse" />
//     )}
//   </div>
// );

// export default function Loading() {
//   const { themeState } = useTheme();

//   // Use optimistic data if available
//   const skeletonCount = themeState?.optimisticDashboardData?.pageCount || 20;
//   const pageBlurs = themeState?.optimisticDashboardData?.pageBlurs || [];
//   const dashHex = themeState?.optimisticDashboardData?.dashHex || "#181818";
//   const backHex = themeState?.optimisticDashboardData?.backHex || "#242424";
//   const usernameTitle =
//     themeState?.optimisticDashboardData?.usernameTitle || "";

//   return (
//     <div
//       className="min-h-[100vh]"
//       style={{
//         backgroundColor: hexToRgba(backHex, 1),
//       }}
//     >
//       {/* FIXED HEADER */}
//       <div className="fixed top-0 left-0 right-0 z-20 pt-2 px-0">
//         <div
//           className="flex items-center justify-center text-2xl sm:text-4xl font-bold h-[47px] sm:h-[70px] text-white px-9 shadow-md"
//           style={{
//             backgroundColor: dashHex,
//             color: lighten(dashHex, 240) || "#000000",
//           }}
//         >
//           {usernameTitle || <div className="" />}
//         </div>
//       </div>

//       {/* STICKY HEADER 2 */}
//       <div className="sticky top-[10px] left-0 right-0 z-10 pt-3 px-0">
//         <div
//           className="h-[47px] shadow-md"
//           style={{
//             backgroundColor: lighten(dashHex, 5),
//           }}
//         />
//       </div>

//       {/* CONTENT AREA */}
//       <div className="pt-6">
//         <div className="min-h-[100px] sm:min-h-[120px]"></div>

//         {/* PAGES GRID */}
//         {usernameTitle && (
//           <div className="p-3 md:p-6">
//             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
//               {Array.from({ length: skeletonCount }).map((_, i) => (
//                 <PageSkeleton
//                   key={i}
//                   blurDataURL={pageBlurs[i]?.blurDataURL || ""}
//                 />
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// app/[usernameTag]/loading.js
"use client";

import DashHeader from "@/components/dashboard/DashHeader";

import { useTheme } from "@/context/ThemeContext";
import { lighten, hexToRgba } from "@/components/dashboard/DashHeader";

// 1. Updated Skeleton to match LoadingOverlay exactly
const PageSkeleton = ({ blurDataURL }) => (
  <div className="p-2 pb-[3px] rounded-md bg-neutral-100/60 shadow-md h-full mb-[0px]">
    <div
      className="w-full aspect-[4/3] mb-1 rounded-sm overflow-hidden relative"
      style={{
        backgroundImage: blurDataURL ? `url("${blurDataURL}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: !blurDataURL ? "#e5e5e5" : undefined,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      {!blurDataURL && (
        <div className="absolute inset-0 bg-gray-200/50 animate-pulse" />
      )}
    </div>
    <div className="flex pl-1 pr-1 items-center justify-between gap-1 mt-0 h-8 w-full overflow-hidden">
      <div className="h-4 w-3/5 bg-gray-300/50 rounded animate-pulse" />
      <div className="h-3 w-1/4 bg-gray-300/50 rounded animate-pulse" />
    </div>
  </div>
);

export default function Loading() {
  const { themeState } = useTheme();

  // Use optimistic data if available
  const skeletonCount = themeState?.optimisticDashboardData?.pageCount || 8;
  const pageBlurs = themeState?.optimisticDashboardData?.pageBlurs || [];
  const dashHex = themeState?.optimisticDashboardData?.dashHex || "#181818";
  const backHex = themeState?.optimisticDashboardData?.backHex || "#242424";
  const usernameTitle =
    themeState?.optimisticDashboardData?.usernameTitle || "";

  // return (
  //   <div
  //     className="fixed inset-0 z-[9999] min-h-[100dvh] overflow-hidden"
  //     style={{
  //       backgroundColor: hexToRgba(backHex, 1),
  //     }}
  //   >
  //     {/* Top 8px Sticky Strip */}
  //     <div
  //       className="sticky z-50 w-full h-[8px]"
  //       style={{
  //         backgroundColor: backHex || "#ffffff",
  //         top: "0px",
  //       }}
  //     />

  //     {/* Header 1: Main DashHeader Simulation (Fixed) */}
  //     <div className="fixed top-0 left-0 right-0 z-20 pt-2 px-0">
  //       <div
  //         className="flex items-center justify-center text-2xl sm:text-4xl font-bold h-[47px] sm:h-[70px] text-white px-9 shadow-md"
  //         style={{
  //           backgroundColor: dashHex,
  //           color: lighten(dashHex, 240) || "#000000",
  //         }}
  //       >
  //         {usernameTitle || <div className="" />}
  //       </div>
  //     </div>

  //     {/* Spacer matching LoadingOverlay logic */}
  //     <div
  //       className="pt-[12px]"
  //       style={{
  //         backgroundColor: lighten(backHex, -30),
  //       }}
  //     ></div>

  //     {/* Header 2: Sub Header Simulation (Sticky) */}
  //     <div className="sticky top-[74px] sm:top-[94px] left-0 right-0 z-10 pt-0 px-0">
  //       <div
  //         className="h-[47px] shadow-md"
  //         style={{
  //           // Matches LoadingOverlay: dashHex={lighten(dashHex, 30)}
  //           backgroundColor: lighten(dashHex, 30),
  //         }}
  //       />
  //     </div>

  //     {/* Spacer */}
  //     <div className="h-[80px]"></div>

  //     {/* Content Grid */}
  //     <div className="p-3 md:p-6">
  //       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-5">
  //         {Array.from({ length: Math.max(skeletonCount, 8) }).map((_, i) => (
  //           <PageSkeleton
  //             key={i}
  //             blurDataURL={pageBlurs[i]?.blurDataURL || ""}
  //           />
  //         ))}
  //       </div>
  //     </div>
  //   </div>
  // );

  return (
    <div
      className="fixed inset-0 z-[9999] min-h-[100dvh] overflow-hidden"
      style={{
        backgroundColor: hexToRgba(backHex, 1),
      }}
    >
      <div
        className="sticky z-50 w-full h-[8px]"
        style={{
          backgroundColor: backHex || "#ffffff",
          top: "0px",
        }}
      />

      <div className="fixed top-0 left-0 right-0 z-20 pt-2 px-0">
        <DashHeader
          profileUser={{ usernameTitle: usernameTitle }}
          alpha={1}
          editTitleOn={false}
          dashHex={dashHex}
          isSyncing={false}
        />
      </div>

      <div
        className="pt-[12px]"
        style={{
          backgroundColor: lighten(backHex, -30),
        }}
      ></div>

      <div className="sticky top-[74px] sm:top-[94px] left-0 right-0 z-10 pt-0 px-0">
        <DashHeader
          title={""}
          alpha={1}
          profileUser={{ usernameTitle: "This" }}
          editColOn={false}
          heightShort={true}
          dashHex={lighten(dashHex, 30)}
          backHex={backHex}
        />
      </div>

      <div className="h-[65px] sm:h-[80px]"></div>
      {usernameTitle && (
        <div className="p-3 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-5">
            {Array.from({ length: Math.max(skeletonCount) }).map((_, i) => (
              <PageSkeleton
                key={i}
                blurDataURL={pageBlurs[i]?.blurDataURL || ""}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
