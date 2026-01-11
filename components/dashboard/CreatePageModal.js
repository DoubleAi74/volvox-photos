"use client";

import React, { useState, useEffect } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { processImage } from "@/lib/processImage";

import { useAuth } from "@/context/AuthContext";

const initialFormData = {
  title: "",
  description: "",
  thumbnail: "",
  isPrivate: false,
  isPublic: false,
};

export default function CreatePageModal({ isOpen, onClose, onSubmit }) {
  //const { currentUser } = useAuth();

  // --- DEBUGGING STEP 1: See what the hook returns ---
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialFormData);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // When the modal is opened, reset the form data and uploading status
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

  const handleFileUpload = async (e) => {
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
      //const processedFile = await processImage(rawFile);

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

      // const securePath = `users/${userId}/page-thumbnails`;
      // const file_url = await uploadFile(processedFile, securePath);
      // setFormData((prev) => ({ ...prev, thumbnail: file_url }));
    } catch (error) {
      console.error("Image processing failed:", error);
      alert("Failed to process image.");
    }
    setIsProcessing(false);
  };

  const handleSubmit = async (e) => {
    // Make this function async
    e.preventDefault();
    if (!formData.title.trim()) return;

    // Prevent function from running again if it's already submitting
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
      isPrivate: formData.isPrivate,
      isPublic: formData.isPublic,
    });

    // Close the modal immediately
    onClose();
  };

  if (!isOpen) return null;

  // Button is enabled when we have a file (either with client blur OR flagged for server blur)
  const hasImage =
    formData.pendingFile && (formData.blurDataURL || formData.needsServerBlur);
  const canSubmit =
    hasImage && !isProcessing && !isSubmitting && formData.title.trim();

  let passOG;
  // return (
  //   <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[200] p-4">
  //     <div className="bg-gray-900/20 backdrop-blur-xl rounded-md p-6 w-full max-w-md">
  //       {/* Title and close button */}
  //       <div className="flex justify-between items-center mb-6">
  //         <h2 className="text-xl font-bold text-gray-50">Create New Page</h2>
  //         <button
  //           onClick={onClose}
  //           className=" flex flex-row items-center space-x-1 py-1 px-2 rounded-sm   hover:bg-gray-200/20 text-gray-300 hover:text-gray-100 active:bg-green-200"
  //         >
  //           <X className="w-4 h-4 " />
  //           <p className="text-sm ">Close</p>
  //         </button>
  //       </div>

  //       {/* Form for submission */}
  //       <form onSubmit={handleSubmit} className="space-y-4">
  //         {/* Page title input*/}
  //         <div>
  //           <label className="block text-sm font-medium text-gray-100 mb-2">
  //             Page Title *
  //           </label>
  //           <input
  //             type="text"
  //             value={formData.title}
  //             onChange={(e) =>
  //               setFormData((prev) => ({ ...prev, title: e.target.value }))
  //             }
  //             className="w-full px-4 py-2 rounded-sm bg-neutral-400 text-neutral-600 placeholder-blue-400 focus:outline-none"
  //             placeholder="Enter page title"
  //             required
  //           />
  //         </div>
  //         {/* Description input */}
  //         <div>
  //           <label className="block text-sm font-medium text-gray-100 mb-2">
  //             Brief subtitle
  //           </label>
  //           <textarea
  //             value={formData.description}
  //             onChange={(e) =>
  //               setFormData((prev) => ({
  //                 ...prev,
  //                 description: e.target.value,
  //               }))
  //             }
  //             className="w-full px-4 py-2 rounded-sm bg-neutral-200   placeholder-red-400 focus:outline-none resize-none"
  //             placeholder="Enter subtitle"
  //             rows="1"
  //           />
  //         </div>
  //         {/* Public private checkbox */}
  //         <div className="flex items-center gap-3 pt-2">
  //           {/* Private Checkbox */}
  //           <label className="flex items-center gap-2 cursor-pointer select-none">
  //             <div className="relative inline-flex items-center">
  //               <input
  //                 type="checkbox"
  //                 id="isPrivateCheckbox"
  //                 checked={formData.isPrivate}
  //                 onChange={(e) =>
  //                   setFormData((prev) => ({
  //                     ...prev,
  //                     isPrivate: e.target.checked,
  //                   }))
  //                 }
  //                 className="
  //         peer h-5 w-5 appearance-none rounded-sm border border-white/40
  //         bg-black/20 backdrop-blur-sm
  //         checked:bg-black/60 checked:border-black/70
  //         transition-colors duration-150 cursor-pointer
  //       "
  //               />

  //               {/* Check Icon */}
  //               <svg
  //                 xmlns="http://www.w3.org/2000/svg"
  //                 fill="none"
  //                 viewBox="0 0 24 24"
  //                 strokeWidth={2}
  //                 stroke="white"
  //                 className="pointer-events-none absolute inset-0 m-auto hidden h-3 w-3 peer-checked:block"
  //               >
  //                 <path
  //                   strokeLinecap="round"
  //                   strokeLinejoin="round"
  //                   d="m4.5 12.75 6 6 9-13.5"
  //                 />
  //               </svg>
  //             </div>

  //             <span className="text-xs font-medium text-gray-200">
  //               Private page <br />
  //               (visible only to you logged in)
  //             </span>
  //           </label>

  //           {/* Public Checkbox */}
  //         </div>

  //         {/* Thumbnail image */}
  //         <div>
  //           <label className="block text-sm font-medium text-gray-50 mb-2">
  //             Thumbnail Image *
  //           </label>
  //           <div className="flex items-center gap-4">
  //             {formData.pendingFile ? (
  //               <div className="w-16 h-16 rounded-sm overflow-hidden shadow-md relative">
  //                 {formData.blurDataURL ? (
  //                   // Show blur preview for regular images
  //                   <img
  //                     src={formData.blurDataURL}
  //                     alt="Thumbnail Preview"
  //                     className="w-full h-full object-cover"
  //                   />
  //                 ) : (
  //                   // Show visual confirmation for HEIC (no client-side blur available)
  //                   <div className="w-full h-full   bg-teal-600/80 flex items-center justify-center relative overflow-hidden">
  //                     {/* Animated shimmer effect */}
  //                     <div className="absolute inset-0  " />
  //                     {/* Checkmark icon */}
  //                     <svg
  //                       xmlns="http://www.w3.org/2000/svg"
  //                       fill="none"
  //                       viewBox="0 0 24 24"
  //                       strokeWidth={2.5}
  //                       stroke="white"
  //                       className="w-7 h-7 drop-shadow-md"
  //                     >
  //                       <path
  //                         strokeLinecap="round"
  //                         strokeLinejoin="round"
  //                         d="m4.5 12.75 6 6 9-13.5"
  //                       />
  //                     </svg>
  //                   </div>
  //                 )}
  //               </div>
  //             ) : (
  //               <div className="w-16 h-16 rounded-sm bg-gray-100 flex items-center justify-center">
  //                 {isProcessing ? (
  //                   <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
  //                 ) : (
  //                   <ImageIcon className="w-6 h-6 text-neutral-300" />
  //                 )}
  //               </div>
  //             )}
  //             <div className="flex-1 relative">
  //               <input
  //                 type="file"
  //                 accept="image/*"
  //                 onChange={handleFileUpload}
  //                 className="hidden"
  //                 id="thumbnail-upload"
  //                 disabled={isProcessing}
  //               />
  //               <label
  //                 htmlFor="thumbnail-upload"
  //                 className={`flex items-center justify-center gap-2 px-4 py-2 rounded-sm  text-sm text-neutral-300 cursor-pointer hover:bg-blue-100 active:bg-blue-100 ${
  //                   isProcessing ? "opacity-50 cursor-not-allowed" : ""
  //                 }`}
  //               >
  //                 <Upload className="w-4 h-4" />
  //                 {isProcessing
  //                   ? "Processing..."
  //                   : formData.pendingFile
  //                   ? "Change Image"
  //                   : "Select Image"}
  //               </label>
  //               {formData.fileName && (
  //                 <p
  //                   className="absolute top-full mt-1 text-xs text-gray-400 truncate max-w-[180px]"
  //                   title={formData.fileName}
  //                 >
  //                   {formData.fileName}
  //                 </p>
  //               )}
  //             </div>
  //           </div>
  //         </div>

  //         {/* Cancel and submit buttons */}
  //         <div className="flex gap-4 pt-4">
  //           <button
  //             type="button"
  //             onClick={onClose}
  //             className="flex-1 py-3 rounded-sm  text-neutral-300 hover:bg-red-300 active:bg-red-200"
  //           >
  //             Cancel
  //           </button>
  //           <button
  //             type="submit"
  //             className="flex-1 py-3 rounded-sm  text-neutral-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
  //             disabled={!canSubmit}
  //           >
  //             {isSubmitting ? "Creating..." : "Create Page"}
  //           </button>
  //         </div>
  //       </form>
  //     </div>
  //   </div>
  // );

  // return (
  //   <div className="fixed inset-0 bg-black/20 flex items-center  justify-center z-[200] p-4">
  //     <div className="bg-neutral-800/80 backdrop-blur-[4px] border border-white/10 rounded-lg p-6 w-full max-w-md shadow-2xl">
  //       {/* Title and close button */}
  //       <div className="flex justify-between items-center mb-6">
  //         <h2 className="text-lg font-semibold text-white/90">
  //           Create New Page
  //         </h2>
  //         <button
  //           onClick={onClose}
  //           className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-[2px] bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/60 hover:text-white/90 transition-all duration-150"
  //         >
  //           <X className="w-4 h-4" />
  //           <span className="text-sm">Close</span>
  //         </button>
  //       </div>

  //       {/* Form for submission */}
  //       <form onSubmit={handleSubmit} className="space-y-5">
  //         {/* Page title input */}
  //         <div>
  //           <label className="block text-sm font-medium text-white/70 mb-2">
  //             Page Title *
  //           </label>
  //           <input
  //             type="text"
  //             value={formData.title}
  //             onChange={(e) =>
  //               setFormData((prev) => ({ ...prev, title: e.target.value }))
  //             }
  //             className="
  //   w-full px-4 py-2.5 rounded-[3px]
  //   bg-white/5 border border-white/10
  //   text-white/90 placeholder-white/30
  //   focus:outline-none focus:border-white/10
  //   focus:bg-white/8
  //   transition-colors duration-150
  // "
  //             placeholder="Enter page title"
  //             required
  //           />
  //         </div>

  //         {/* Description input */}
  //         <div>
  //           <label className="block text-sm font-medium text-white/70 mb-2">
  //             Brief subtitle
  //           </label>
  //           <input
  //             value={formData.description}
  //             onChange={(e) =>
  //               setFormData((prev) => ({
  //                 ...prev,
  //                 description: e.target.value,
  //               }))
  //             }
  //             className="
  //   w-full px-4 py-2.5 rounded-[3px]
  //   bg-white/5 border border-white/10
  //   text-white/90 placeholder-white/30
  //   focus:outline-none focus:border-white/10
  //   focus:bg-white/8
  //   transition-colors duration-150
  // "
  //             placeholder="Enter subtitle"
  //             rows="1"
  //           />
  //         </div>

  //         {/* Public private checkbox */}
  //         <div className="flex items-center gap-3 pt-2">
  //           {/* Private Checkbox */}
  //           <label className="flex items-center gap-2 cursor-pointer select-none">
  //             <div className="relative inline-flex items-center">
  //               <input
  //                 type="checkbox"
  //                 id="isPrivateCheckbox"
  //                 checked={formData.isPrivate}
  //                 onChange={(e) =>
  //                   setFormData((prev) => ({
  //                     ...prev,
  //                     isPrivate: e.target.checked,
  //                   }))
  //                 }
  //                 className="
  //           peer h-5 w-5 appearance-none rounded-sm border border-white/40
  //           bg-black/20 backdrop-blur-sm
  //           checked:bg-black/60 checked:border-black/70
  //           transition-colors duration-150 cursor-pointer
  //         "
  //               />

  //               {/* Check Icon */}
  //               <svg
  //                 xmlns="http://www.w3.org/2000/svg"
  //                 fill="none"
  //                 viewBox="0 0 24 24"
  //                 strokeWidth={2}
  //                 stroke="white"
  //                 className="pointer-events-none absolute inset-0 m-auto hidden h-3 w-3 peer-checked:block"
  //               >
  //                 <path
  //                   strokeLinecap="round"
  //                   strokeLinejoin="round"
  //                   d="m4.5 12.75 6 6 9-13.5"
  //                 />
  //               </svg>
  //             </div>

  //             <span className="text-xs font-medium text-gray-200">
  //               Private page <br />
  //               (visible only to you logged in)
  //             </span>
  //           </label>

  //           {/* Public Checkbox */}
  //         </div>

  //         {/* Thumbnail image */}
  //         <div>
  //           <label className="block text-sm font-medium text-white/70 mb-2">
  //             Thumbnail Image *
  //           </label>
  //           <div className="flex items-center gap-4">
  //             {formData.pendingFile ? (
  //               <div className="w-16 h-16 rounded-[3px] overflow-hidden border border-white/10 relative">
  //                 {formData.blurDataURL ? (
  //                   <img
  //                     src={formData.blurDataURL}
  //                     alt="Thumbnail Preview"
  //                     className="w-full h-full object-cover"
  //                   />
  //                 ) : (
  //                   <div className="w-full h-full bg-emerald-500/30 flex items-center justify-center">
  //                     <svg
  //                       xmlns="http://www.w3.org/2000/svg"
  //                       fill="none"
  //                       viewBox="0 0 24 24"
  //                       strokeWidth={2.5}
  //                       stroke="currentColor"
  //                       className="w-6 h-6 text-emerald-400"
  //                     >
  //                       <path
  //                         strokeLinecap="round"
  //                         strokeLinejoin="round"
  //                         d="m4.5 12.75 6 6 9-13.5"
  //                       />
  //                     </svg>
  //                   </div>
  //                 )}
  //               </div>
  //             ) : (
  //               <div className="w-16 h-16 rounded-[3px] bg-white/5 border border-white/10 flex items-center justify-center">
  //                 {isProcessing ? (
  //                   <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
  //                 ) : (
  //                   <ImageIcon className="w-6 h-6 text-white/30" />
  //                 )}
  //               </div>
  //             )}
  //             <div className="flex-1 relative">
  //               <input
  //                 type="file"
  //                 accept="image/*"
  //                 onChange={handleFileUpload}
  //                 className="hidden"
  //                 id="thumbnail-upload"
  //                 disabled={isProcessing}
  //               />
  //               <label
  //                 htmlFor="thumbnail-upload"
  //                 className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-[3px] bg-white/5 border border-white/10 text-sm text-white/60 cursor-pointer hover:bg-white/10 hover:text-white/80 hover:border-white/20 active:bg-white/15 transition-all duration-150 ${
  //                   isProcessing ? "opacity-50 cursor-not-allowed" : ""
  //                 }`}
  //               >
  //                 <Upload className="w-4 h-4" />
  //                 {isProcessing
  //                   ? "Processing..."
  //                   : formData.pendingFile
  //                   ? "Change Image"
  //                   : "Select Image"}
  //               </label>
  //               {formData.fileName && (
  //                 <p
  //                   className="absolute top-full mt-1.5 text-xs text-white/40 truncate max-w-[180px]"
  //                   title={formData.fileName}
  //                 >
  //                   {formData.fileName}
  //                 </p>
  //               )}
  //             </div>
  //           </div>
  //         </div>

  //         {/* Cancel and submit buttons */}
  //         <div className="flex gap-3 pt-4">
  //           <button
  //             type="button"
  //             onClick={onClose}
  //             className="flex-1 py-2.5 rounded-[3px] bg-neutral-800/20 border border-white/10 text-white/60 hover:bg-neutral-800/70 hover:border-neutral-500/30 hover:text-neutral-300 active:bg-red-500/30 transition-all duration-150"
  //           >
  //             Cancel
  //           </button>
  //           <button
  //             type="submit"
  //             className="flex-1 py-2.5 rounded-[3px] bg-neutral-100/20 border border-white/15 text-white/80 font-medium hover:bg-white/15 hover:text-white active:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white/10 transition-all duration-100"
  //             disabled={!canSubmit}
  //           >
  //             {isSubmitting ? "Creating..." : "Create Page"}
  //           </button>
  //         </div>
  //       </form>
  //     </div>
  //   </div>
  // );

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[200] p-4 ">
      <div className="bg-neutral-900/90 backdrop-blur-[4px] border border-white/[0.08] rounded-[5px] p-6 w-full max-w-md shadow-2xl shadow-black/50">
        {/* Title and close button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white">Create New Page</h2>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-[2px] bg-white/[0.06] hover:bg-white/12 active:bg-white/15 text-white/50 hover:text-white/90 transition-all duration-150"
          >
            <X className="w-4 h-4" />
            <span className="text-sm">Close</span>
          </button>
        </div>

        {/* Form for submission */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Page title input */}
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
              className="
    w-full px-4 py-2.5 rounded-[3px]
    bg-white/5 border border-white/10
    text-white/90 placeholder-white/30
    focus:outline-none focus:border-white/20
     focus:bg-white/[0.06]
    transition-colors duration-150 focus:ring-1 focus:ring-white/10
  "
              placeholder="Enter page title"
              required
            />
          </div>

          {/* Description input */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Brief subtitle
            </label>
            <input
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="
    w-full px-4 py-2.5 rounded-[3px]
    bg-white/5 border border-white/10
    text-white/90 placeholder-white/30
    focus:outline-none focus:border-white/20
     focus:bg-white/[0.06]
    transition-colors duration-150 focus:ring-1 focus:ring-white/10
  "
              placeholder="Enter subtitle"
              rows="1"
            />
          </div>

          {/* Public private checkbox */}
          <div className="flex items-center gap-3 py-0 p-1 rounded-[3px] ">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  id="isPrivateCheckbox"
                  checked={formData.isPrivate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isPrivate: e.target.checked,
                    }))
                  }
                  className="
                  peer h-5 w-5 appearance-none rounded-[2px] border border-white/20
                  bg-white/[0.04]
                  checked:bg-slate-700/80 checked:border-slate-500/90
                  transition-colors duration-150 cursor-pointer
                "
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
                  (visible only to you logged in)
                </span>
              </span>
            </label>
          </div>

          {/* Thumbnail image */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Thumbnail Image <span className="text-amber-400/80">*</span>
            </label>
            <div className="flex items-center gap-4">
              {formData.pendingFile ? (
                // <div className="w-16 h-16 rounded-[3px] overflow-hidden border-2 border-emerald-500/40 relative ring-2 ring-emerald-500/20">
                <div className="w-16 h-16 rounded-[1px] overflow-hidden border-2 border-emerald-500/40   relative ">
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
                <div className="w-16 h-16 rounded-[3px] bg-white/[0.03] border border-dashed border-white/15 flex items-center justify-center">
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
                  onChange={handleFileUpload}
                  className="hidden"
                  id="thumbnail-upload"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="thumbnail-upload"
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-[3px] bg-white/[0.06] border border-white/10 text-sm text-white/60 cursor-pointer hover:bg-white/10 hover:text-white/80 hover:border-white/15 active:bg-white/15 transition-all duration-150 ${
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

          {/* Cancel and submit buttons */}
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
              {isSubmitting ? "Creating..." : "Create Page"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
