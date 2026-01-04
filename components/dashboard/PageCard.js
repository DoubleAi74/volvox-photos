"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react"; // 1. Import hooks
import Link from "next/link";
import { FileText, Trash2, Edit3, Loader2 } from "lucide-react";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";

export default function PageCard({
  page,
  onDelete,
  onEdit,
  isOwner,
  editModeOn,
  usernameTag,
  index = 0,
}) {
  const isOptimistic = page.isOptimistic || false;
  const { setOptimisticPageData } = useTheme();

  // Prioritize first 8 images (first 2 rows on desktop, first 4 rows on mobile)
  const isPriority = index < 8;

  // 2. Setup state to track if image is ready
  const [isLoaded, setIsLoaded] = useState(false);
  const [wasCached, setWasCached] = useState(false);
  const imageRef = useRef(null);

  // 3. Reset state if the page thumbnail changes

  useLayoutEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const cached = img.complete;

    setWasCached(cached);
    if (cached) setIsLoaded(true);
  }, [page.thumbnail]);

  // useEffect(() => {
  //   // 1. Reset state when source changes
  //   setIsLoaded(false);

  //   // 2. Check if image is ALREADY loaded (e.g. from cache)
  //   if (imageRef.current?.complete) {
  //     setIsLoaded(true);
  //   }

  //   // 3. Safety fallback: Force show after 1.5s if onLoad event is missed
  //   const safetyTimer = setTimeout(() => {
  //     if (!isLoaded) setIsLoaded(true);
  //   }, 1500);

  //   return () => clearTimeout(safetyTimer);
  // }, [page.thumbnail]);

  const handleClick = () => {
    // Save page data to context for instant navigation
    setOptimisticPageData({
      id: page.id,
      title: page.title,
      postCount: page.postCount || 0,
      thumbnail: page.thumbnail,
      blurDataURL: page.blurDataURL,
      slug: page.slug,
      description: page.description,
      previewPostBlurs: page.previewPostBlurs || [],
      userId: page.userId,
      isPrivate: page.isPrivate,
      isPublic: page.isPublic,
    });
  };

  // Check various states
  const hasThumbnail = !!page.thumbnail;
  const hasBlur = !!page.blurDataURL;
  const isUploadingHeic = page.isUploadingHeic || false; // HEIC upload in progress, no blur yet
  const isUploadPending = !hasThumbnail && hasBlur && isOptimistic; // Regular image uploading

  // Card content JSX (reused for both clickable and non-clickable versions)
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
            // Apply the blur to the container background
            backgroundImage: hasBlur ? `url("${page.blurDataURL}")` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: !hasBlur ? "#e5e5e5" : undefined,
          }}
        >
          {/* 4. Only fade in the image once it reports onLoad */}
          {hasThumbnail && (
            <Image
              ref={imageRef}
              src={page.thumbnail}
              alt={page.title}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={isPriority}
              fetchPriority={isPriority ? "high" : "auto"}
              // Handle the load state
              onLoad={() => setIsLoaded(true)}
              // Apply the opacity transition
              // className={`
              //   object-cover
              //   transition-opacity duration-300 ease-in-out
              //   ${isLoaded ? "opacity-100" : "opacity-0"}
              // `}
              className={`
    object-cover
    ${wasCached ? "" : "transition-opacity duration-300"}
    ${isLoaded ? "opacity-100" : "opacity-0"}
  `}
            />
          )}

          {/* Show upload indicator for HEIC (no blur yet) */}
          {isUploadingHeic && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              <span className="text-xs text-gray-500 mt-2">Uploading...</span>
            </div>
          )}

          {/* Show spinner when blur is showing but thumbnail not ready (regular images) */}
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
      {/* Wrap in Link only if not optimistic (uploading) */}
      {!isOptimistic ? (
        <Link
          href={`/${usernameTag}/${page.slug}`}
          prefetch
          onClick={handleClick}
        >
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}

      {/* Edit/Delete buttons - hide for optimistic items */}
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
