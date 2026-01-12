"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { processImage } from "@/lib/processImage";
import { useAuth } from "@/context/AuthContext";

export default function BulkUploadModal({
  isOpen,
  onClose,
  onBackToSingle,
  onSubmit,
}) {
  const { user } = useAuth();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedFiles([]);
      setIsProcessing(false);
      setProcessingCount(0);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.overscrollBehavior = "none";

    return () => {
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

  const handleFilesSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (!user?.uid) {
      alert("You must be logged in.");
      return;
    }

    setIsProcessing(true);
    setProcessingCount(files.length);

    const processedFiles = [];

    for (const rawFile of files) {
      try {
        const {
          file: processedFile,
          blurDataURL,
          needsServerBlur,
        } = await processImage(rawFile);

        processedFiles.push({
          id: crypto.randomUUID(),
          file: processedFile,
          blurDataURL: blurDataURL || "",
          needsServerBlur,
          fileName: rawFile.name,
        });
      } catch (error) {
        console.error("Failed to process file:", rawFile.name, error);
      }
      setProcessingCount((prev) => prev - 1);
    }

    setSelectedFiles((prev) => [...prev, ...processedFiles]);
    setIsProcessing(false);
    setProcessingCount(0);

    // Reset file input
    e.target.value = "";
  };

  const handleRemoveFile = (id) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting || selectedFiles.length === 0) return;

    setIsSubmitting(true);

    // Submit all files to parent - each will become a post with empty title/description
    onSubmit(
      selectedFiles.map((f) => ({
        title: "",
        description: "",
        blurDataURL: f.blurDataURL,
        pendingFile: f.file,
        needsServerBlur: f.needsServerBlur,
        content_type: "file",
        content: "",
      }))
    );

    onClose();
  };

  if (!isOpen) return null;

  const canSubmit = selectedFiles.length > 0 && !isProcessing && !isSubmitting;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[200] p-4">
      <div className="bg-neutral-900/90 backdrop-blur-[4px] border border-white/[0.08] rounded-[5px] p-6 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/50">
        {/* Title and close button */}
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-[2px] bg-white/[0.06] hover:bg-white/12 active:bg-white/15 text-white/50 hover:text-white/90 transition-all duration-150"
              onClick={onBackToSingle}
            >
              <ArrowLeft className="h-4 w-5" />
              Single
            </button>
            <h2 className="text-lg font-semibold text-white">
              Upload Multiple Images
            </h2>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
          <form
            id="bulk-upload-form"
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* File selection area */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Select Images <span className="text-amber-400/80">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesSelect}
                  className="hidden"
                  id="bulk-upload-input"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="bulk-upload-input"
                  className={`flex items-center justify-center gap-2 px-4 py-6 rounded-[3px] bg-white/[0.03] border-2 border-dashed border-white/15 text-sm text-white/60 cursor-pointer hover:bg-white/[0.06] hover:text-white/80 hover:border-white/25 active:bg-white/10 transition-all duration-150 ${
                    isProcessing ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>
                        Processing {processingCount} image
                        {processingCount !== 1 ? "s" : ""}...
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Click to select images or drag and drop</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Selected ({selectedFiles.length} image
                  {selectedFiles.length !== 1 ? "s" : ""})
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto p-2 bg-white/[0.02] rounded-[3px] border border-white/[0.06]">
                  {selectedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="relative group aspect-square rounded-[2px] overflow-hidden border border-white/10 bg-white/[0.03]"
                    >
                      {file.blurDataURL ? (
                        <img
                          src={file.blurDataURL}
                          alt={file.fileName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-500/10">
                          <ImageIcon className="w-6 h-6 text-emerald-400/60" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        className="absolute top-1 right-1 p-1 rounded-[2px] bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/60 text-[10px] text-white/70 truncate">
                        {file.fileName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info text */}
            <p className="text-xs text-white/40">
              Each image will be uploaded as a separate post with an empty title
              and description.
            </p>
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
            form="bulk-upload-form"
            className="flex-1 py-2.5 rounded-[3px] bg-neutral-100/90 text-neutral-900 font-semibold hover:bg-neutral-100 active:bg-neutral-100/80 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-neutral-100/90 transition-all duration-100 shadow-lg shadow-white/10"
            disabled={!canSubmit}
          >
            {isSubmitting
              ? "Uploading..."
              : `Upload ${selectedFiles.length} Image${
                  selectedFiles.length !== 1 ? "s" : ""
                }`}
          </button>
        </div>
      </div>
    </div>
  );
}
