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
  //console.log(post);
  const isOptimistic = post.isOptimistic || false;
  return (
    <div
      className={`group relative transition-opacity duration-300 ${
        isOptimistic ? "opacity-75" : "opacity-100"
      }`}
    >
      <div className="p-1 rounded-md bg-[#3f3e3b]/30  shadow-md hover:shadow-neumorphic-soft transition-all duration-300 cursor-pointer h-full flex flex-col">
        {post.thumbnail ? (
          <div
            className="w-full aspect-[4/3] rounded-sm overflow-hidden relative"
            style={{
              // Apply the blur to the container.
              // This stays visible permanently behind the image.
              backgroundImage: post.blurDataURL
                ? `url("${post.blurDataURL}")`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <Image
              src={post.thumbnail}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority={true}
            />
          </div>
        ) : (
          <div className="w-full aspect-[4/3] mb-2 rounded-sm shadow-md bg-red-100 flex items-center justify-center flex items-center justify-center">
            <ContentIcon className="w-8 h-8 text-neumorphic-text" />
          </div>
        )}
      </div>

      {/* {isOptimistic && (
        <div className="absolute bottom-2 right-2 z-20 bg-black/20 text-white/50 text-[10px] px-2 py-1 rounded-full backdrop-blur-[1px]">
          Saving...
        </div>
      )} */}

      {isOwner && editModeOn && (
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

// [2025-12-25T23:37:44.332Z]  @firebase/firestore: Firestore (12.0.0): BloomFilter error:  {"name":"BloomFilterError"}
// defaultLogHandler @ index.esm.js:85Understand this warning
// app-index.js:33 Error deleting post: FirebaseError: No document to update: projects/volvox-guru/databases/(default)/documents/posts/qkcTiBpgzXSla6dvv22G
// window.console.error @ app-index.js:33Understand this error
