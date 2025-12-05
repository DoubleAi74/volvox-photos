"use client";

import React from "react";
import Link from "next/link";
import { FileText, Calendar, Trash2, Edit3 } from "lucide-react"; // 1. Import Edit3 icon
import { format } from "date-fns";
import Image from "next/image";

export default function PageCard({
  page,
  onDelete,
  onEdit,
  isOwner,
  editModeOn,
  usernameTag,
}) {
  const [imgError, setImgError] = React.useState(null); //DEBUG CODE
  const [imgLoaded, setImgLoaded] = React.useState(false); //DEBUG CODE
  // Accept new props
  return (
    <div className="group relative">
      <Link href={`/${usernameTag}/${page.slug}`}>
        {/* ... (The inner content of the link is unchanged) ... */}
        <div className="p-2 rounded-md bg-[#f7f3ed] shadow-md hover:shadow-neumorphic-soft transition-all duration-300  h-full mb-[-10px] cursor-pointer">
          {page.thumbnail ? (
            // <div className="w-full aspect-[4/3] mb-1 rounded-sm overflow-hidden relative">
            //   <Image
            //     src={page.thumbnail}
            //     alt={page.title}
            //     fill
            //     sizes="100vh"
            //     className="object-none"
            //   />
            // </div>
            <div className="w-full aspect-[4/3] mb-1 rounded-sm overflow-hidden relative">
              <Image
                src={page.thumbnail}
                alt={page.title}
                fill
                sizes="100vh"
                className="object-none"
                unoptimized // <-- you can turn this on/off easily
                onLoad={() => {
                  console.log("Image loaded successfully:", page.thumbnail);
                  setImgLoaded(true);
                }}
                onError={(e) => {
                  console.error("Image FAILED to load:", page.thumbnail, e);
                  setImgError(`Failed to load: ${page.thumbnail}`);
                }}
              />

              {/* VISUAL DEBUG OVERLAY */}
              {!imgLoaded && (
                <div className="absolute inset-0 bg-red-200 bg-opacity-70 p-2 text-xs text-red-800">
                  Loading...
                </div>
              )}

              {imgError && (
                <div className="absolute inset-0 bg-black/70 text-white text-xs p-2 overflow-auto">
                  <p>❌ Image Error</p>
                  <p>{imgError}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-[4/3] shadow-md mb-1 rounded-sm bg-neumorphic-bg flex items-center justify-center">
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
      </Link>

      {/* 3. Add the edit button next to the delete button */}
      {isOwner && editModeOn && (
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
