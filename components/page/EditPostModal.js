"use client";

import React, { useState, useEffect } from "react";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import ImageWithLoader from "@/components/ImageWithLoader";
import { processImage } from "@/lib/processImage";
import { useAuth } from "@/context/AuthContext";

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
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[200] p-4">
      <div className="bg-neumorphic-bg rounded-2xl shadow-neumorphic p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-xl font-bold text-neumorphic">Edit Post</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg btn-neumorphic shadow-neumorphic hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed"
          >
            <X className="w-5 h-5 text-neumorphic-text" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
          <form
            id="edit-post-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-neumorphic mb-2">
                Post Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text/70 focus:outline-none"
                placeholder="Enter post title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neumorphic mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text/70 focus:outline-none resize-none"
                placeholder="Enter post description"
                rows="2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neumorphic mb-2">
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
                className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text/70 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neumorphic mb-2">
                Thumbnail Image
              </label>
              <div className="flex items-center gap-4">
                {/* Thumbnail Preview */}
                {hasNewPendingFile ? (
                  // New file selected - show blur preview or placeholder
                  <div className="w-16 h-16 rounded-lg overflow-hidden shadow-neumorphic-inset relative">
                    {hasBlurPreview ? (
                      <img
                        src={formData.blurDataURL}
                        alt="New Thumbnail Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      // HEIC file - no blur yet
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                ) : hasExistingThumbnail ? (
                  // Existing thumbnail from server
                  <div className="w-16 h-16 rounded-lg overflow-hidden shadow-neumorphic-inset">
                    <ImageWithLoader
                      src={formData.thumbnail}
                      alt="Thumbnail Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  // No thumbnail
                  <div className="w-16 h-16 rounded-lg bg-neumorphic-bg shadow-neumorphic-inset flex items-center justify-center">
                    {isProcessing ? (
                      <Loader2 className="w-6 h-6 text-neumorphic-text animate-spin" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-neumorphic-text" />
                    )}
                  </div>
                )}

                <div className="flex-1">
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
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg btn-neumorphic shadow-neumorphic text-sm text-neumorphic-text cursor-pointer hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed ${
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
                </div>
              </div>

              {/* Indicator for pending upload */}
              {hasNewPendingFile && (
                <p className="text-xs text-neumorphic-text/70 mt-2">
                  New image selected. It will be uploaded when you save.
                </p>
              )}
            </div>
          </form>
        </div>

        <div className="flex gap-4 pt-4 mt-auto flex-shrink-0 border-t border-neumorphic-shadow-dark/20">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl btn-neumorphic shadow-neumorphic text-neumorphic-text hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-post-form"
            className="flex-1 py-3 rounded-xl btn-neumorphic shadow-neumorphic text-neumorphic-text font-medium disabled:opacity-50"
            disabled={!canSubmit}
          >
            {isSubmitting ? "Updating..." : "Update Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
