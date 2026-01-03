"use client";

import Image from "next/image";
// 1. Import useState and useEffect
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Edit3,
  Trash2,
  FileText,
  ExternalLink,
  Type,
  File,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

const contentTypeIcons = {
  text: Type,
  file: File,
  url: ExternalLink,
};

export default function PostCard({
  post,
  onEdit,
  onDelete,
  isOwner,
  editModeOn,
  pageSlug,
  index = 0,
}) {
  const ContentIcon = contentTypeIcons[post.content_type] || FileText;
  const isOptimistic = post.isOptimistic || false;
  const isSkeleton = post.isSkeleton || false;

  // Prioritize first 10 images (first 2 rows on desktop, first 5 rows on mobile)
  const isPriority = index < 10;

  // Check various states
  const hasThumbnail = !!post.thumbnail;
  const hasBlur = !!post.blurDataURL;
  const isUploadingHeic = post.isUploadingHeic || false;
  const isUploadPending = !hasThumbnail && hasBlur && isOptimistic;

  // 2. Setup state to track if image is ready
  const [isLoaded, setIsLoaded] = useState(false);
  const imageRef = useRef(null);

  useEffect(() => {
    // 1. Reset state when source changes
    setIsLoaded(false);

    // 2. Check if image is ALREADY loaded (e.g. from cache)
    if (imageRef.current?.complete) {
      setIsLoaded(true);
    }

    // 3. Safety fallback: Force show after 1.5s if onLoad event is missed
    const safetyTimer = setTimeout(() => {
      if (!isLoaded) setIsLoaded(true);
    }, 1500);

    return () => clearTimeout(safetyTimer);
  }, [post.thumbnail]);

  // Skeleton render
  if (isSkeleton) {
    return (
      <div className="group relative">
        <div className="p-1 rounded-md bg-[#3f3e3b]/30 shadow-md h-full flex flex-col">
          <div
            className="w-full aspect-[4/3] rounded-sm overflow-hidden relative"
            style={{
              backgroundImage: hasBlur
                ? `url("${post.blurDataURL}")`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: !hasBlur ? "#e5e5e5" : undefined,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            {!hasBlur && (
              <div className="absolute inset-0 bg-gray-200/50 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative transition-opacity duration-300 ${
        isOptimistic ? "opacity-75" : "opacity-100"
      }`}
    >
      <div className="p-1 rounded-md bg-[#3f3e3b]/30 shadow-md hover:shadow-neumorphic-soft transition-all duration-300 cursor-pointer h-full flex flex-col">
        {hasThumbnail || hasBlur || isUploadingHeic ? (
          <div
            className="w-full aspect-[4/3] rounded-sm overflow-hidden relative"
            style={{
              // Keep the blur on the container background
              backgroundImage: hasBlur
                ? `url("${post.blurDataURL}")`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: !hasBlur ? "#e5e5e5" : undefined,
            }}
          >
            {/* 4. Only fade in the image once it reports onLoad */}
            {hasThumbnail && (
              <Image
                ref={imageRef}
                src={post.thumbnail}
                alt={post.title}
                fill
                // sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                sizes="(max-width: 640px) 30vw, (max-width: 768px) 20vw, (max-width: 1024px) 15vw, 12vw"
                priority={isPriority}
                fetchPriority={isPriority ? "high" : "auto"}
                // Handle the load state
                onLoad={() => setIsLoaded(true)}
                // Apply the opacity transition
                className={`
                  object-cover
                  transition-opacity duration-500 ease-in-out
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
          <div className="w-full aspect-[4/3] mb-2 rounded-sm shadow-md bg-red-100 flex items-center justify-center">
            <ContentIcon className="w-8 h-8 text-neumorphic-text" />
          </div>
        )}
      </div>

      {isOwner && editModeOn && !isOptimistic && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-70 group-hover:opacity-100 transition-all duration-200">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 rounded-lg bg-[#f0efee] shadow-md hover:shadow-neumorphic-pressed"
          >
            <Edit3 className="w-4 h-4 text-neumorphic-text" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
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
