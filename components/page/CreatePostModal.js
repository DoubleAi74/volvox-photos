"use client";

import ImageWithLoader from "@/components/ImageWithLoader";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  X,
  Upload,
  Link as LinkIcon,
  Type,
  File,
  Image as ImageIcon,
  Loader2,
  Images,
} from "lucide-react";
import { processImage } from "@/lib/processImage";

import { useAuth } from "@/context/AuthContext";

// Dynamically import the RichTextEditor with SSR disabled
const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[120px] rounded-[3px] bg-white/5 border border-white/10 animate-pulse"></div>
  ),
});

const initialFormData = {
  title: "",
  description: "",
  blurDataURL: "", // Generated client-side (null for HEIC until uploaded)
  pendingFile: null, // The file waiting to be uploaded
  needsServerBlur: false, // Flag for HEIC files that need server-side blur
  content_type: "text",
  content: "",
};

export default function CreatePostModal({
  isOpen,
  onClose,
  onToMultiple,
  onSubmit,
}) {
  const { user } = useAuth();

  const [formData, setFormData] = useState(initialFormData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // When the modal is opened, reset the form data and states
    if (isOpen) {
      setFormData(initialFormData);
      setIsProcessing(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Save scroll position
    const scrollY = window.scrollY;

    // 2. Measure scrollbar width (prevents layout shift)
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    // 3. Lock body scroll
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.overscrollBehavior = "none";

    return () => {
      // 4. Restore scroll
      const y = document.body.style.top;

      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.paddingRight = "";
      document.body.style.overscrollBehavior = "";

      if (y) {
        window.scrollTo(0, parseInt(y, 10) * -1);
      }
    };
  }, [isOpen]);

  const handleThumbnailSelect = async (e) => {
    const rawFile = e.target.files[0];
    if (!rawFile) return;

    let userId = null;
    try {
      userId = user?.uid;
    } catch (e) {
      console.error("Error retrieving user ID:", e);
    }

    if (!userId) return alert("You must be logged in.");

    setIsProcessing(true);
    try {
      // Process image - returns { file, blurDataURL, needsServerBlur }
      const {
        file: processedFile,
        blurDataURL,
        needsServerBlur,
      } = await processImage(rawFile);

      console.log("[CreatePostModal] Image processed:", {
        hasBlur: !!blurDataURL,
        needsServerBlur,
      });

      setFormData((prev) => ({
        ...prev,
        blurDataURL: blurDataURL || "",
        pendingFile: processedFile,
        needsServerBlur: needsServerBlur,
        fileName: rawFile.name,
      }));
    } catch (error) {
      console.error("Image processing failed:", error);
      alert("Failed to process image.");
    }

    setIsProcessing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate: must have a file selected (blur OR needsServerBlur flag)
    if (!formData.pendingFile) return;

    setIsSubmitting(true);

    // Pass data to parent
    onSubmit({
      title: formData.title,
      description: formData.description,
      blurDataURL: formData.blurDataURL, // Will be empty for HEIC
      pendingFile: formData.pendingFile,
      needsServerBlur: formData.needsServerBlur, // Tell parent this needs server blur
      content_type: formData.content_type,
      content: formData.content,
    });

    // Close the modal immediately
    onClose();
  };

  if (!isOpen) return null;

  // Button is enabled when we have a file (either with client blur OR flagged for server blur)
  const hasImage =
    formData.pendingFile && (formData.blurDataURL || formData.needsServerBlur);
  const canSubmit = hasImage && !isProcessing && !isSubmitting;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[200] p-4">
      <div className="bg-neutral-900/90 backdrop-blur-[4px] border border-white/[0.08] rounded-[5px] p-6 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/50">
        {/* Title and close button */}
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">Post An Image</h2>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-[2px] bg-white/[0.06] hover:bg-white/12 active:bg-white/15 text-white/50 hover:text-white/90 transition-all duration-150"
          >
            <X className="w-4 h-4" />
            <span className="text-sm">Close</span>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
          <form
            id="create-post-form"
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Post title input */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-[3px] bg-white/5 border border-white/10 text-white/90 placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-colors duration-150 focus:ring-1 focus:ring-white/10"
                placeholder="Enter post title"
              />
            </div>

            {/* Upload Section */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Upload <span className="text-amber-400/80">*</span>
              </label>
              <div className="flex items-center gap-4">
                {/* Thumbnail Preview */}
                {formData.pendingFile ? (
                  <div className="w-16 h-16 rounded-[1px] overflow-hidden border-2 border-emerald-500/40 flex-shrink-0 relative">
                    {formData.blurDataURL ? (
                      <img
                        src={formData.blurDataURL}
                        alt="Thumbnail Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-emerald-500/20 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke="currentColor"
                          className="w-6 h-6 text-emerald-400"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-[3px] bg-white/[0.03] border border-dashed border-white/15 flex items-center justify-center flex-shrink-0">
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-white/20" />
                    )}
                  </div>
                )}

                {/* Button Group Wrapper */}
                <div className="flex-1 relative">
                  <div className="flex gap-1 sm:gap-2">
                    {/* Select Image Button (2/3 width) */}
                    <div className="flex-[3]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailSelect}
                        className="hidden"
                        id="post-thumbnail-upload"
                        disabled={isProcessing}
                      />
                      <label
                        htmlFor="post-thumbnail-upload"
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-[2px] bg-white/[0.06] border border-white/10 text-sm text-white/60 cursor-pointer hover:bg-white/10 hover:text-white/80 hover:border-white/15 active:bg-white/15 transition-all duration-150 ${
                          isProcessing ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <Upload className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {isProcessing
                            ? "Processing..."
                            : formData.pendingFile
                            ? "Change Image"
                            : "Select Image"}
                        </span>
                      </label>
                    </div>

                    {/* Bulk Button (1/3 width) */}
                    <button
                      type="button"
                      onClick={onToMultiple}
                      className="flex-[1] flex items-center justify-center gap-2 px-4 mr-[1px] py-2.5 rounded-[2px] bg-white/[0.06] border border-white/10 text-sm text-white/60 hover:bg-white/10 hover:text-white/80 hover:border-white/15 active:bg-white/15 transition-all duration-150"
                    >
                      <span className="hidden sm:block">Multiple</span>
                      <Images className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Filename: Absolutely positioned so it doesn't push the buttons up */}
                  {formData.fileName && (
                    <p
                      className="absolute top-full mt-1 text-xs text-white/40 truncate max-w-full"
                      title={formData.fileName}
                    >
                      {formData.fileName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Description input */}
            <div className="pt-2">
              {" "}
              {/* Added slight padding to prevent filename overlap if present */}
              <label className="block text-sm font-medium text-white/60 mb-2">
                Description
              </label>
              <RichTextEditor
                value={formData.description}
                onChange={(content) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: content,
                  }))
                }
                placeholder="Enter post description..."
                variant="dark"
                minHeight="80px"
              />
            </div>
          </form>
        </div>

        {/* Cancel and submit buttons */}
        <div className="flex gap-3 pt-4 mt-auto flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-[3px] bg-white/[0.04] border border-white/[0.08] text-white/50 font-medium hover:bg-white/[0.08] hover:border-white/15 hover:text-white/70 active:bg-white/12 transition-all duration-150"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-post-form"
            className="flex-1 py-2.5 rounded-[3px] bg-neutral-100/90 text-neutral-900 font-semibold hover:bg-neutral-100 active:bg-neutral-100/80 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-neutral-100/90 transition-all duration-100 shadow-lg shadow-white/10"
            disabled={!canSubmit}
          >
            {isSubmitting ? "Creating..." : "Create Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
