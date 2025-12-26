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
} from "lucide-react";
import { processImage } from "@/lib/processImage";

import { useAuth } from "@/context/AuthContext";

// Dynamically import the RichTextEditor with SSR disabled
const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[150px] rounded-xl bg-neumorphic-bg shadow-neumorphic-inset animate-pulse"></div>
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

export default function CreatePostModal({ isOpen, onClose, onSubmit }) {
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
      }));
    } catch (error) {
      console.error("Image processing failed:", error);
      alert("Failed to process image.");
    }

    setIsProcessing(false);
  };

  if (!isOpen) return null;

  // Button is enabled when we have a file (either with client blur OR flagged for server blur)
  const hasImage =
    formData.pendingFile && (formData.blurDataURL || formData.needsServerBlur);
  const canSubmit = hasImage && !isProcessing && !isSubmitting;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[200] p-4">
      <div className="bg-neumorphic-bg rounded-2xl shadow-neumorphic p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-xl font-bold text-neumorphic">Create New Post</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg btn-neumorphic shadow-neumorphic hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed"
          >
            <X className="w-5 h-5 text-neumorphic-text" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
          <form
            id="create-post-form"
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
                Thumbnail Image
              </label>
              <div className="flex items-center gap-4">
                {formData.pendingFile ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden shadow-neumorphic-inset relative">
                    {formData.blurDataURL ? (
                      // Show blur preview for regular images
                      <img
                        src={formData.blurDataURL}
                        alt="Thumbnail Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      // Show placeholder for HEIC (no blur yet)
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                ) : (
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
                    id="post-thumbnail-upload"
                    disabled={isProcessing}
                  />
                  <label
                    htmlFor="post-thumbnail-upload"
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg btn-neumorphic shadow-neumorphic text-sm text-neumorphic-text cursor-pointer hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed ${
                      isProcessing ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    {isProcessing
                      ? "Processing..."
                      : formData.pendingFile
                      ? "Change Image"
                      : "Select Image"}
                  </label>
                </div>
              </div>
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
            form="create-post-form"
            className="flex-1 py-3 rounded-xl btn-neumorphic shadow-neumorphic text-neumorphic-text font-medium disabled:opacity-50"
            disabled={!canSubmit}
          >
            {isSubmitting ? "Creating..." : "Create Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
