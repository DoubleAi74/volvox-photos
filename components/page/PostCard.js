"use client";

import Image from "next/image";

import React from "react";
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
}) {
  const ContentIcon = contentTypeIcons[post.content_type] || FileText;
  const isOptimistic = post.isOptimistic || false;

  // Check various states
  const hasThumbnail = !!post.thumbnail;
  const hasBlur = !!post.blurDataURL;
  const isUploadingHeic = post.isUploadingHeic || false; // HEIC upload in progress, no blur yet
  const isUploadPending = !hasThumbnail && hasBlur && isOptimistic; // Regular image uploading

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
              // Apply the blur to the container background
              backgroundImage: hasBlur
                ? `url("${post.blurDataURL}")`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: !hasBlur ? "#e5e5e5" : undefined,
            }}
          >
            {/* Only render the Image component if we have a real thumbnail URL */}
            {hasThumbnail && (
              <Image
                src={post.thumbnail}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority={true}
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
