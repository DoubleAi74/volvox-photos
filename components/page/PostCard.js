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

  if (pageSlug === "meditations") {
    console.log(
      post.slug,
      "rando",
      post.thumbnail,
      typeof post.thumbnail === "string"
    );
  } else {
    if (post.thumbnail) {
      console.log(post.slug, "thumb");
    } else {
      console.log(post.slug, "no thumb");
    }
  }

  return (
    <div className="group relative">
      <div className="p-1 rounded-md bg-[#f7f3ed]  shadow-md hover:shadow-neumorphic-soft transition-all duration-300 cursor-pointer h-full flex flex-col">
        {post.thumbnail ? (
          <div className="w-full aspect-[4/3] rounded-sm overflow-hidden relative">
            <Image
              src={post.thumbnail}
              alt={post.title}
              fill
              sizes="100vh"
              className="object-none"
            />
          </div>
        ) : (
          <div className="w-full aspect-[4/3] mb-2 rounded-sm shadow-md bg-neumorphic-bg flex items-center justify-center flex items-center justify-center">
            <ContentIcon className="w-8 h-8 text-neumorphic-text" />
          </div>
        )}
      </div>

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
