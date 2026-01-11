"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import ImageWithLoader from "@/components/ImageWithLoader";
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
  thumbnail: "",
  blurDataURL: "",
  pendingFile: null,
  needsServerBlur: false,
  content_type: "text",
  content: "",
  order_index: 0,
};

export default function EditPostModal({ isOpen, post, onClose, onSubmit }) {
  const { user } = useAuth();

  const [formData, setFormData] = useState(initialFormData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Populate form when post changes
  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title || "",
        description: post.description || "",
        thumbnail: post.thumbnail || "",
        blurDataURL: post.blurDataURL || "",
        pendingFile: null,
        needsServerBlur: false,
        content_type: post.content_type || "text",
        content: post.content || "",
        order_index: post.order_index || 0,
      });
    }
  }, [post]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    onSubmit({
      title: formData.title,
      description: formData.description,
      thumbnail: formData.thumbnail,
      blurDataURL: formData.blurDataURL,
      pendingFile: formData.pendingFile,
      needsServerBlur: formData.needsServerBlur,
      content_type: formData.content_type,
      content: formData.content,
      order_index: Number(formData.order_index) || 0,
    });

    onClose();
  };

  const handleThumbnailSelect = async (e) => {
    const rawFile = e.target.files[0];
    if (!rawFile) return;

    const userId = user?.uid;
    if (!userId) return alert("You must be logged in.");

    setIsProcessing(true);

    try {
      const {
        file: processedFile,
        blurDataURL,
        needsServerBlur,
      } = await processImage(rawFile);

      console.log("[EditPostModal] Image processed:", {
        hasBlur: !!blurDataURL,
        needsServerBlur,
      });

      setFormData((prev) => ({
        ...prev,
        blurDataURL: blurDataURL || "",
        pendingFile: processedFile,
        needsServerBlur: needsServerBlur,
        thumbnail: "", // Clear old thumbnail URL since we have a new pending file
        fileName: rawFile.name,
      }));
    } catch (error) {
      console.error("Image processing failed:", error);
      alert("Failed to process image.");
    }

    setIsProcessing(false);
  };

  if (!isOpen || !post) return null;

  // Determine what to show for thumbnail preview
  const hasNewPendingFile = !!formData.pendingFile;
  const hasExistingThumbnail = !!formData.thumbnail;
  const hasBlurPreview = !!formData.blurDataURL;

  const canSubmit = !isProcessing && !isSubmitting;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[200] p-4">
      <div className="bg-neutral-900/90 backdrop-blur-[4px] border border-white/[0.08] rounded-[5px] p-6 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/50">
        {/* Title and close button */}
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">Edit Post</h2>
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
            id="edit-post-form"
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

            {/* Thumbnail and Order Index row */}
            <div className="flex justify-between gap-6">
              {/* Thumbnail image - Left side */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Upload
                </label>
                <div className="flex items-center gap-4">
                  {/* Thumbnail Preview */}
                  {hasNewPendingFile ? (
                    // New file selected - show blur preview or checkmark
                    <div className="w-16 h-16 rounded-[1px] overflow-hidden border-2 border-emerald-500/40 relative flex-shrink-0">
                      {hasBlurPreview ? (
                        <img
                          src={formData.blurDataURL}
                          alt="New Thumbnail Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        // HEIC file - no blur yet, show checkmark
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
                  ) : hasExistingThumbnail ? (
                    // Existing thumbnail from server
                    <div className="w-16 h-16 rounded-[1px] overflow-hidden border-2 border-emerald-500/40 flex-shrink-0">
                      <ImageWithLoader
                        src={formData.thumbnail}
                        alt="Thumbnail Preview"
                        className="w-full h-full object-cover"
                        sizes="64px"
                        priority={true}
                      />
                    </div>
                  ) : (
                    // No thumbnail
                    <div className="w-16 h-16 rounded-[3px] bg-white/[0.03] border border-dashed border-white/15 flex items-center justify-center flex-shrink-0">
                      {isProcessing ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-white/20" />
                      )}
                    </div>
                  )}

                  <div className="flex-1 relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailSelect}
                      className="hidden"
                      id="edit-thumbnail-upload"
                      disabled={isProcessing}
                    />
                    <label
                      htmlFor="edit-thumbnail-upload"
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-[3px] bg-white/[0.06] border border-white/10 text-sm text-white/60 cursor-pointer hover:bg-white/10 hover:text-white/80 hover:border-white/15 active:bg-white/15 transition-all duration-150 ${
                        isProcessing ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      {isProcessing
                        ? "Processing..."
                        : hasNewPendingFile || hasExistingThumbnail
                        ? "Change Image"
                        : "Select Image"}
                    </label>
                    {formData.fileName && (
                      <p
                        className="absolute top-full mt-1.5 text-xs text-white/40 truncate max-w-[180px]"
                        title={formData.fileName}
                      >
                        {formData.fileName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Index - Right side */}
              <div className="w-32">
                <label className="block text-sm text-end font-medium text-white/60 mt-[10px] mb-[7px]">
                  Order Index
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.order_index}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      order_index: value === "" ? "" : parseInt(value, 10),
                    }));
                  }}
                  className="w-full px-4 py-2.5 rounded-[3px] bg-white/5 border border-white/10 text-white/90 placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-colors duration-150 focus:ring-1 focus:ring-white/10"
                />
              </div>
            </div>

            {/* Description input with RichTextEditor */}
            <div>
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
            form="edit-post-form"
            className="flex-1 py-2.5 rounded-[3px] bg-neutral-100/90 text-neutral-900 font-semibold hover:bg-neutral-100 active:bg-neutral-100/80 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-neutral-100/90 transition-all duration-100 shadow-lg shadow-white/10"
            disabled={!canSubmit}
          >
            {isSubmitting ? "Updating..." : "Update Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
