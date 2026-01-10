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
        fileName: rawFile.name,
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
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[200] p-4">
      <div className="bg-neutral-900/90 backdrop-blur-[4px] border border-white/[0.08] rounded-[5px] p-6 w-full max-w-md shadow-2xl shadow-black/50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white">Edit Page</h2>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-[2px] bg-white/[0.06] hover:bg-white/12 active:bg-white/15 text-white/50 hover:text-white/90 transition-all duration-150"
          >
            <X className="w-4 h-4" />
            <span className="text-sm">Close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Page Title <span className="text-amber-400/80">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-[3px] bg-white/5 border border-white/10 text-white/90 placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-colors duration-150 focus:ring-1 focus:ring-white/10"
              placeholder="Enter page title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
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
              className="w-full px-4 py-2.5 rounded-[3px] bg-white/5 border border-white/10 text-white/90 placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-colors duration-150 focus:ring-1 focus:ring-white/10 resize-none"
              placeholder="Enter page description"
              rows="1"
            />
          </div>

          {/* COMBINED ROW START */}
          <div className="flex flex-row  justify-between pl-1 pr-2 gap-4">
            {/* Checkbox - Right Side (pt-7 adds spacing to align with input field, skipping the label) */}
            <div className="flex-1 ml-0 pt-6">
              <div className="flex items-center gap-3 py-0 p-1 rounded-[3px]">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative inline-flex items-center">
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
                      className="peer h-5 w-5 appearance-none rounded-[2px] border border-white/20 bg-white/[0.04] checked:bg-slate-700/80 checked:border-slate-500/90 transition-colors duration-150 cursor-pointer"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="white"
                      className="pointer-events-none absolute inset-0 m-auto hidden h-3 w-3 peer-checked:block"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-white/70 leading-tight">
                    Private page
                    <br />
                    <span className="text-xs text-white/40">
                      (visible only to you)
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Order Index - Left Side */}
            <div className="w-1/3 max-w-[90px]">
              <label className="block text-sm text-end font-medium text-white/60 mb-2">
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
          {/* COMBINED ROW END */}

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Thumbnail Image
            </label>
            <div className="flex items-center gap-4">
              {hasNewPendingFile ? (
                <div className="w-16 h-16 rounded-[1px] overflow-hidden border-2 border-emerald-500/40 relative">
                  {hasBlurPreview ? (
                    <img
                      src={formData.blurDataURL}
                      alt="New Thumbnail Preview"
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
              ) : hasExistingThumbnail ? (
                <div className="w-16 h-16 rounded-[3px] overflow-hidden border border-white/10">
                  <ImageWithLoader
                    src={formData.thumbnail}
                    alt="Thumbnail Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-[3px] bg-white/[0.03] border border-dashed border-white/15 flex items-center justify-center">
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-neutral-800/20 border-t-neutral-600/60 rounded-full animate-spin" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-white/20" />
                  )}
                </div>
              )}

              <div className="flex-1 relative">
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

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-[3px] bg-white/[0.04] border border-white/[0.08] text-white/50 font-medium hover:bg-white/[0.08] hover:border-white/15 hover:text-white/70 active:bg-white/12 transition-all duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-[3px] bg-neutral-100/90 text-neutral-900 font-semibold hover:bg-neutral-100 active:bg-neutral-100/80 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-neutral-100/90 transition-all duration-100 shadow-lg shadow-white/10"
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

//OG
// return (
//   <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[200] p-4">
//     <div className="bg-neumorphic-bg rounded-2xl shadow-neumorphic p-6 w-full max-w-md">
//       <div className="flex justify-between items-center mb-6">
//         <h2 className="text-xl font-bold text-neumorphic">Edit Page</h2>
//         <button
//           onClick={onClose}
//           className="p-2 rounded-lg btn-neumorphic shadow-neumorphic hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed"
//         >
//           <X className="w-5 h-5 text-neumorphic-text" />
//         </button>
//       </div>

//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div>
//           <label className="block text-sm font-medium text-neumorphic mb-2">
//             Page Title *
//           </label>
//           <input
//             type="text"
//             value={formData.title}
//             onChange={(e) =>
//               setFormData((prev) => ({ ...prev, title: e.target.value }))
//             }
//             className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text/70 focus:outline-none"
//             placeholder="Enter page title"
//             required
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-neumorphic mb-2">
//             Description
//           </label>
//           <textarea
//             value={formData.description}
//             onChange={(e) =>
//               setFormData((prev) => ({
//                 ...prev,
//                 description: e.target.value,
//               }))
//             }
//             className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text/70 focus:outline-none resize-none"
//             placeholder="Enter page description"
//             rows="3"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-neumorphic mb-2">
//             Order Index
//           </label>
//           <input
//             type="number"
//             min="0"
//             value={formData.order_index}
//             onChange={(e) => {
//               const value = e.target.value;
//               setFormData((prev) => ({
//                 ...prev,
//                 // Allow an empty string for typing, otherwise parse to integer
//                 order_index: value === "" ? "" : parseInt(value, 10),
//               }));
//             }}
//             className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text/70 focus:outline-none"
//           />
//         </div>

//         <div className="flex items-center gap-3 pt-2">
//           <input
//             type="checkbox"
//             id="isPrivateEditCheckbox"
//             checked={formData.isPrivate}
//             onChange={(e) =>
//               setFormData((prev) => ({
//                 ...prev,
//                 isPrivate: e.target.checked,
//               }))
//             }
//             className="h-4 w-4 rounded bg-neumorphic-bg shadow-neumorphic-inset appearance-none checked:bg-blue-900 cursor-pointer"
//           />
//           <label
//             htmlFor="isPrivateEditCheckbox"
//             className="text-sm font-medium text-neumorphic cursor-pointer"
//           >
//             Make this page private
//           </label>
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-neumorphic mb-2">
//             Thumbnail Image
//           </label>
//           <div className="flex items-center gap-4">
//             {/* Thumbnail Preview */}
//             {hasNewPendingFile ? (
//               // New file selected - show blur preview or placeholder
//               <div className="w-16 h-16 rounded-lg overflow-hidden shadow-neumorphic-inset relative">
//                 {hasBlurPreview ? (
//                   <img
//                     src={formData.blurDataURL}
//                     alt="New Thumbnail Preview"
//                     className="w-full h-full object-cover"
//                   />
//                 ) : (
//                   // HEIC file - no blur yet
//                   <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
//                     <ImageIcon className="w-6 h-6 text-gray-400" />
//                   </div>
//                 )}
//               </div>
//             ) : hasExistingThumbnail ? (
//               // Existing thumbnail from server
//               <div className="w-16 h-16 rounded-lg overflow-hidden shadow-neumorphic-inset">
//                 <ImageWithLoader
//                   src={formData.thumbnail}
//                   alt="Thumbnail Preview"
//                   className="w-full h-full object-cover"
//                 />
//               </div>
//             ) : (
//               // No thumbnail
//               <div className="w-16 h-16 rounded-lg bg-neumorphic-bg shadow-neumorphic-inset flex items-center justify-center">
//                 {isProcessing ? (
//                   <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
//                 ) : (
//                   <ImageIcon className="w-6 h-6 text-neumorphic-text" />
//                 )}
//               </div>
//             )}

//             <div className="flex-1">
//               <input
//                 type="file"
//                 accept="image/*"
//                 onChange={handleFileUpload}
//                 className="hidden"
//                 id="page-thumbnail-edit-upload"
//                 disabled={isProcessing}
//               />
//               <label
//                 htmlFor="page-thumbnail-edit-upload"
//                 className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg btn-neumorphic shadow-neumorphic text-sm text-neumorphic-text cursor-pointer hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed ${
//                   isProcessing ? "opacity-50 cursor-not-allowed" : ""
//                 }`}
//               >
//                 <Upload className="w-4 h-4" />
//                 {isProcessing
//                   ? "Processing..."
//                   : hasNewPendingFile || hasExistingThumbnail
//                   ? "Change Image"
//                   : "Select Image"}
//               </label>
//             </div>
//           </div>

//           {/* Indicator for pending upload */}
//           {hasNewPendingFile && (
//             <p className="text-xs text-neumorphic-text/70 mt-2">
//               New image selected. It will be uploaded when you save.
//             </p>
//           )}
//         </div>

//         <div className="flex gap-4 pt-4">
//           <button
//             type="button"
//             onClick={onClose}
//             className="flex-1 py-3 rounded-xl btn-neumorphic shadow-neumorphic text-neumorphic-text hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed"
//           >
//             Cancel
//           </button>
//           <button
//             type="submit"
//             className="flex-1 py-3 rounded-xl btn-neumorphic shadow-neumorphic text-neumorphic-text font-medium disabled:opacity-50 disabled:cursor-not-allowed"
//             disabled={!canSubmit}
//           >
//             {isSubmitting ? "Updating..." : "Update Page"}
//           </button>
//         </div>
//       </form>
//     </div>
//   </div>
// );
