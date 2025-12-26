"use client";

import { useEffect, useRef, useState } from "react";
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
  const [isLoaded, setIsLoaded] = useState(false);

  /* ---------------------------------------------
   * Sync <dialog> open/close with parent state
   * ------------------------------------------- */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (onOff) {
      dialog.showModal();
    } else if (dialog.hasAttribute("open")) {
      dialog.close();
    }
  }, [onOff]);

  /* ---------------------------------------------
   * Keep React state in sync with native close
   * ------------------------------------------- */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleDialogClose = () => {
      onClose();
    };

    dialog.addEventListener("close", handleDialogClose);
    return () => dialog.removeEventListener("close", handleDialogClose);
  }, [onClose]);

  /* ---------------------------------------------
   * Reset image fade when post changes
   * ------------------------------------------- */
  useEffect(() => {
    setIsLoaded(false);
  }, [post?.id]);

  const handleCloseClick = () => {
    onClose();
  };

  const handleImageClick = (e) => {
    e.stopPropagation();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-label={post ? `Image preview: ${post.title}` : "Image preview"}
      className="p-0 rounded-lg shadow-2xl overflow-hidden w-[95vw] md:w-[80vw] max-w-none md:max-w-5xl max-h-[80vh] h-auto"
    >
      {post && (
        <div className="flex flex-col w-full h-full bg-neutral-900 border border-neutral-800 text-neutral-100">
          {/* HEADER (fixed, non-scrolling) */}
          <div className="flex shrink-0 justify-between items-center px-2 py-2 border-b border-neutral-800 bg-neutral-900 z-10">
            <h2
              className="
                ml-3 pr-4
                text-base sm:text-lg
                font-medium tracking-wide
                text-neutral-200
                break-words
                leading-tight
                min-w-0
              "
            >
              {post.title}
            </h2>

            <button
              onClick={handleCloseClick}
              className="flex items-center focus:outline-none space-x-2 shrink-0 px-2 py-1 text-sm text-neutral-400 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-all border border-neutral-700"
            >
              <p>Close</p>
              <X size={15} />
            </button>
          </div>

          {/* SCROLL CONTAINER */}
          <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y">
            {/* IMAGE AREA */}
            <div
              key={post.id}
              onClick={handleImageClick}
              className="relative bg-black select-none flex justify-center items-center overflow-hidden h-[65vh] w-full"
            >
              {/* BLUR PLACEHOLDER */}
              {post.blurDataURL && !isLoaded && (
                <Image
                  src={post.blurDataURL}
                  alt=""
                  fill
                  aria-hidden
                  priority
                  className="object-contain opacity-100"
                />
              )}

              {/* FULL IMAGE */}
              <Image
                src={post.thumbnail}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                onLoad={() => setIsLoaded(true)}
                className={`
                  object-contain
                  transition-opacity duration-100 ease-out
                  ${isLoaded ? "opacity-100" : "opacity-0"}
                `}
                priority
              />

              {/* PREVIOUS */}
              {hasPrevious && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrevious();
                  }}
                  className="absolute group flex justify-start items-end w-2/5 h-1/3 left-0 bottom-0 z-20 px-4 py-2 hover:bg-black/5 rounded-tr-md transition-colors duration-200"
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-black/20 rounded-md text-white/40 group-hover:text-white/90 transition-colors duration-200">
                    <ChevronLeft className="w-5 h-5" />
                  </div>
                </button>
              )}

              {/* NEXT */}
              {hasNext && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNext();
                  }}
                  className="absolute group flex justify-end items-end w-2/5 h-1/3 right-0 bottom-0 z-20 px-4 py-2 hover:bg-black/5 rounded-tl-md transition-colors duration-200"
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-black/20 rounded-md text-white/40 group-hover:text-white/90 transition-colors duration-200">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>
              )}
            </div>

            {/* FOOTER (scrolls with image) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-5 py-3 gap-4 bg-neutral-900 border-t border-neutral-800">
              <div className="text-sm font-light text-neutral-400 leading-relaxed w-full">
                {post.description || (
                  <span className="italic opacity-50">...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
