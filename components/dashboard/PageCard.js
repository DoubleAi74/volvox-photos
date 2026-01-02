"use client";

import React from "react";
import Link from "next/link";
import { FileText, Trash2, Edit3, Loader2 } from "lucide-react";
import Image from "next/image";

export default function PageCard({
  page,
  onDelete,
  onEdit,
  isOwner,
  editModeOn,
  usernameTag,
}) {
  const isOptimistic = page.isOptimistic || false;

  // Check various states
  const hasThumbnail = !!page.thumbnail;
  const hasBlur = !!page.blurDataURL;
  const isUploadingHeic = page.isUploadingHeic || false; // HEIC upload in progress, no blur yet
  const isUploadPending = !hasThumbnail && hasBlur && isOptimistic; // Regular image uploading

  // Card content JSX (reused for both clickable and non-clickable versions)
  const cardContent = (
    <div className={`p-2 rounded-md bg-[#f7f6f3]/50 shadow-md hover:shadow-neumorphic-soft transition-all duration-300 h-full mb-[-10px] ${!isOptimistic ? 'cursor-pointer' : 'cursor-default'}`}>
      {hasThumbnail || hasBlur || isUploadingHeic ? (
        <div
          className="w-full aspect-[4/3] mb-1 rounded-sm overflow-hidden relative"
          style={{
            // Apply the blur to the container background
            backgroundImage: hasBlur
              ? `url("${page.blurDataURL}")`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: !hasBlur ? "#e5e5e5" : undefined,
          }}
        >
          {/* Only render the Image component if we have a real thumbnail URL */}
          {hasThumbnail && (
            <Image
              src={page.thumbnail}
              alt={page.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
              priority={false}
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
        <Link href={`/${usernameTag}/${page.slug}`} prefetch>
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
