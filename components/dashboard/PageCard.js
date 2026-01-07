// PageCard.js

"use client";

import React, { useState, useRef, useLayoutEffect } from "react";
import { FileText, Trash2, Edit3, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

export default function PageCard({
  page,
  onDelete,
  onEdit,
  isOwner,
  editModeOn,
  usernameTag,
  index = 0,
  allPages = [],
  profileUser = null,
}) {
  const isOptimistic = page.isOptimistic || false;

  const { setOptimisticPageData, setOptimisticDashboardData, themeState } =
    useTheme();

  // Prioritize first 8 images
  const isPriority = index < 8;

  // Setup state to track if image is ready
  const [isLoaded, setIsLoaded] = useState(false);
  const [wasCached, setWasCached] = useState(false);
  const imageRef = useRef(null);

  useLayoutEffect(() => {
    const img = imageRef.current;
    if (!img) return;
    const cached = img.complete;
    setWasCached(cached);
    if (cached) setIsLoaded(true);
  }, [page.thumbnail]);

  // COLOR FIX: Calculate the effective colors
  const isLiveTheme = themeState.uid === profileUser?.uid;

  const effectiveDashHex =
    isLiveTheme && themeState.dashHex
      ? themeState.dashHex
      : profileUser?.dashboard?.dashHex || "#ffffff";

  const effectiveBackHex =
    isLiveTheme && themeState.backHex
      ? themeState.backHex
      : profileUser?.dashboard?.backHex || "#ffffff";

  const handleClick = () => {
    // -----------------------------------------------------------------
    // UPDATED LOGIC: No Fallback Blurs
    // -----------------------------------------------------------------

    // If specific preview blurs exist, use them.
    // Otherwise, use an empty array (which results in "blank" skeletons).
    const previewBlurs =
      page.previewPostBlurs && page.previewPostBlurs.length > 0
        ? page.previewPostBlurs
        : [];

    // 2. Prepare Optimistic Page Data
    const pageData = {
      id: page.id,
      title: page.title,
      postCount: page.postCount || 0,
      thumbnail: page.thumbnail,
      blurDataURL: page.blurDataURL,
      slug: page.slug,
      description: page.description,
      previewPostBlurs: previewBlurs, // Now empty if no specific previews exist
      userId: page.userId,
      isPrivate: page.isPrivate,
      isPublic: page.isPublic,
      dashHex: effectiveDashHex,
      backHex: effectiveBackHex,
    };

    setOptimisticPageData(pageData);

    // 3. Prepare Dashboard Data (for back button)
    if (allPages.length > 0 && profileUser) {
      const pageBlurs = allPages.map((p) => ({
        blurDataURL: p.blurDataURL || "",
        thumbnail: p.thumbnail || "",
      }));

      setOptimisticDashboardData({
        uid: profileUser.uid,
        pageCount: allPages.length,
        pageBlurs: pageBlurs,
        dashHex: effectiveDashHex,
        backHex: effectiveBackHex,
        usernameTitle: profileUser?.usernameTitle || "",
        usernameTag: profileUser?.usernameTag || "",
      });
    }
  };

  const hasThumbnail = !!page.thumbnail;
  const hasBlur = !!page.blurDataURL;
  const isUploadingHeic = page.isUploadingHeic || false;
  const isUploadPending = !hasThumbnail && hasBlur && isOptimistic;

  const cardContent = (
    <div
      className={`p-2 rounded-md bg-[#f7f6f3]/50 shadow-md hover:shadow-neumorphic-soft transition-all duration-300 h-full mb-[-10px] ${
        !isOptimistic ? "cursor-pointer" : "cursor-default"
      }`}
    >
      {hasThumbnail || hasBlur || isUploadingHeic ? (
        <div
          className="w-full aspect-[4/3] mb-1 rounded-sm overflow-hidden relative"
          style={{
            backgroundImage: hasBlur ? `url("${page.blurDataURL}")` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: !hasBlur ? "#e5e5e5" : undefined,
          }}
        >
          {hasThumbnail && (
            <Image
              ref={imageRef}
              src={page.thumbnail}
              alt={page.title}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={isPriority}
              fetchPriority={isPriority ? "high" : "auto"}
              onLoad={() => setIsLoaded(true)}
              className={`
                object-cover
                ${wasCached ? "" : "transition-opacity duration-300"}
                ${isLoaded ? "opacity-100" : "opacity-0"}
              `}
            />
          )}

          {isUploadingHeic && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              <span className="text-xs text-gray-500 mt-2">Uploading...</span>
            </div>
          )}

          {isUploadPending && !isUploadingHeic && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div className="w-full aspect-[4/3] shadow-md mb-1 rounded-sm bg-zinc-200/50 flex items-center justify-center">
          <FileText className="w-8 h-8 text-neumorphic-text" />
        </div>
      )}
      <div className="flex justify-between items-center mb-1">
        <h3 className=" px-1 text-sm sm:text-lg font-semibold text-[#5c5c5b]  mb-0 truncate">
          {page.title}
        </h3>
        {page.description && (
          <p className=" px-2 text-xs sm:text-sm text-neumorphic-text mb-0">
            {page.description}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`group relative transition-opacity duration-300 ${
        isOptimistic ? "opacity-75" : "opacity-100"
      }`}
    >
      {!isOptimistic ? (
        <Link
          href={`/${usernameTag}/${page.slug}`}
          prefetch={true}
          onClick={handleClick}
        >
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}

      {isOwner && editModeOn && !isOptimistic && (
        <div className="absolute top-4 right-4 flex gap-1 opacity-70 group-hover:opacity-100 transition-all duration-200">
          <button
            onClick={(e) => {
              e.preventDefault();
              onEdit();
            }}
            className="p-2 rounded-lg bg-[#f0efee] shadow-md hover:shadow-neumorphic-pressed"
          >
            <Edit3 className="w-4 h-4 text-neumorphic-text" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            className="p-2 rounded-lg bg-[#f0efee] shadow-md hover:shadow-neumorphic-pressed"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
}
