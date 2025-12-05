"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

import { ChevronLeft, ChevronRight, X } from "lucide-react";

export default function PhotoShowModal({
  post,
  onOff,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (onOff) {
      dialog.showModal();
    } else {
      // Check if it's already open before trying to close
      // This prevents errors if it tries to close an already-closed dialog
      if (dialog.hasAttribute("open")) {
        dialog.close();
      }
    }
  }, [onOff]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // We must call onClose() to sync the parent's state
    const handleDialogClose = () => {
      onClose();
    };

    dialog.addEventListener("close", handleDialogClose);

    // Cleanup the event listener
    return () => {
      dialog.removeEventListener("close", handleDialogClose);
    };
  }, [onClose]); // Dependency array includes onClose

  // Handler for the "Close" button click
  const handleCloseClick = () => {
    // We don't close the dialog directly.
    // We just tell the parent to update its state.
    onClose();
    // The parent state will change, 'onOff' will become false,
    // and the first useEffect will run to close the dialog.
  };

  const handleImageClick = (e) => {
    e.stopPropagation();
  };

  return (
    <dialog
      ref={dialogRef}
      className="p-0 rounded-lg backdrop:bg-black/80 backdrop-blur-sm shadow-2xl overflow-hidden bg-transparent"
    >
      {post && (
        <div className="relative flex flex-col bg-neutral-900 border border-neutral-800 text-neutral-100 max-w-[97vw] sm:max-w-3xl w-full shadow-2xl max-h-[90vh]">
          {/* --- 1. Header: Fixed at top (Added shrink-0 and z-index) --- */}
          <div className="flex shrink-0 justify-between items-center px-2 py-2 border-b border-neutral-800 bg-neutral-900 z-10">
            <h2 className="text-lg font-medium tracking-wide truncate pr-4 ml-3 text-neutral-200">
              {post.title}
            </h2>

            <button
              onClick={handleCloseClick}
              className="flex items-center focus:outline-none space-x-2 shrink-0 px-4 py-1 text-sm font-small text-neutral-400 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-all border border-neutral-700"
            >
              <p>Close</p>
              <X size={15} />
            </button>
          </div>

          {/* --- Scrollable Container for Image + Description --- */}
          <div className="overflow-y-auto overscroll-contain">
            {/* --- 2. Image Stage --- */}
            <div
              className="relative bg-black flex justify-center items-center overflow-hidden shrink-0"
              onClick={handleImageClick}
            >
              {hasPrevious && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrevious();
                  }}
                  className="absolute group flex justify-start items-end w-[80px] h-[100px] left-0 bottom-0 z-20 p-2 rounded-tr-md hover:bg-black/5 transition-colors duration-200"
                  aria-label="Previous"
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-black/20 group-hover:bg-black/60 transition-colors duration-200 rounded-md text-white/60 group-hover:text-white/90 backdrop-blur-sm">
                    <ChevronLeft className="w-5 h-5" />
                  </div>
                </button>
              )}

              {hasNext && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNext();
                  }}
                  className="absolute group flex justify-end items-end w-[80px] h-[100px] right-0 bottom-0 z-20 p-2 rounded-tr-md hover:bg-black/5 transition-colors duration-200"
                  aria-label="Next"
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-black/20 group-hover:bg-black/60 transition-colors duration-200 rounded-md text-white/60 group-hover:text-white/90 backdrop-blur-sm">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>
              )}

              <Image
                src={post.thumbnail || "/place.png"}
                alt={post.title || "Post image"}
                width={1200}
                height={900}
                // Removed max-h-[65vh] so it scrolls naturally if needed,
                // or keep it if you want the image to fit entirely before description starts.
                // I kept it here to maintain your original look.
                className="w-auto h-auto max-h-[65vh] object-contain select-none shadow-lg"
              />
            </div>

            {/* --- 3. Footer: Description --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-5 py-4 gap-4 bg-neutral-900 border-t border-neutral-800">
              {/* Removed max-w-prose to allow full width, or keep it for readability */}
              <div className="text-sm font-light text-neutral-400 leading-relaxed w-full">
                {post.description || (
                  <span className="italic opacity-50">
                    No description available
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* End of Scrollable Container */}
        </div>
      )}
    </dialog>
  );
}
