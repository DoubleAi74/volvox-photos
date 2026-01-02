"use client";

import React, { useState, useEffect } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { processImage } from "@/lib/processImage";

import ImageWithLoader from "@/components/ImageWithLoader";
import { useAuth } from "@/context/AuthContext";

export default function EditPageModal({ isOpen, page, onClose, onSubmit }) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    thumbnail: "",
    blurDataURL: "",
    pendingFile: null,
    needsServerBlur: false,
    order_index: 0,
    isPrivate: false,
    isPublic: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Populate form when page changes
  useEffect(() => {
    if (page) {
      setFormData({
        title: page.title || "",
        description: page.description || "",
        thumbnail: page.thumbnail || "",
        blurDataURL: page.blurDataURL || "",
        pendingFile: null,
        needsServerBlur: false,
        order_index: page.order_index || 0,
        isPrivate: page.isPrivate || false,
        isPublic: page.isPublic || false,
      });
    }
  }, [page]);

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
      order_index: Number(formData.order_index) || 0,
      isPrivate: formData.isPrivate,
      isPublic: formData.isPublic,
    });

    onClose();
  };

  const handleFileUpload = async (e) => {
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

      console.log("[EditPageModal] Image processed:", {
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

  if (!isOpen || !page) return null;

  // Determine what to show for thumbnail preview
  const hasNewPendingFile = !!formData.pendingFile;
  const hasExistingThumbnail = !!formData.thumbnail;
  const hasBlurPreview = !!formData.blurDataURL;

  const canSubmit = !isProcessing && !isSubmitting;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[200] p-4">
      <div className="bg-neumorphic-bg rounded-2xl shadow-neumorphic p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-neumorphic">Edit Page</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg btn-neumorphic shadow-neumorphic hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed"
          >
            <X className="w-5 h-5 text-neumorphic-text" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neumorphic mb-2">
              Page Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text/70 focus:outline-none"
              placeholder="Enter page title"
              required
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
              placeholder="Enter page description"
              rows="3"
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
                  // Allow an empty string for typing, otherwise parse to integer
                  order_index: value === "" ? "" : parseInt(value, 10),
                }));
              }}
              className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text/70 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isPrivateEditCheckbox"
              checked={formData.isPrivate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  isPrivate: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded bg-neumorphic-bg shadow-neumorphic-inset appearance-none checked:bg-blue-900 cursor-pointer"
            />
            <label
              htmlFor="isPrivateEditCheckbox"
              className="text-sm font-medium text-neumorphic cursor-pointer"
            >
              Make this page private
            </label>
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
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-neumorphic-text" />
                  )}
                </div>
              )}

              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="page-thumbnail-edit-upload"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="page-thumbnail-edit-upload"
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

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl btn-neumorphic shadow-neumorphic text-neumorphic-text hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl btn-neumorphic shadow-neumorphic text-neumorphic-text font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canSubmit}
            >
              {isSubmitting ? "Updating..." : "Update Page"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
