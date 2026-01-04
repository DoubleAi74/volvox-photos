"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
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
  nextPost,
  previousPost,
}) {
  const dialogRef = useRef(null);
  const imageRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [wasCached, setWasCached] = useState(false);

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
  useLayoutEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const cached = img.complete;

    setWasCached(cached);
    setIsLoaded(cached);
  }, [post?.id]);

  /* ---------------------------------------------
   * Disable body scroll when modal is open
   * ------------------------------------------- */
  // useEffect(() => {
  //   if (onOff) {
  //     // Disable scroll without affecting layout
  //     document.body.style.overflow = "hidden";
  //     document.body.style.paddingRight = `${
  //       window.innerWidth - document.documentElement.clientWidth
  //     }px`;
  //   } else {
  //     // Re-enable scroll
  //     document.body.style.overflow = "";
  //     document.body.style.paddingRight = "";
  //   }

  //   // Cleanup on unmount
  //   return () => {
  //     document.body.style.overflow = "";
  //     document.body.style.paddingRight = "";
  //   };
  // }, [onOff]);

  useEffect(() => {
    if (onOff) {
      // 1. Calculate scrollbar width to prevent layout shift
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      // 2. Lock BOTH html and body
      // iOS often scrolls 'html' even if 'body' is hidden
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      // 3. Prevent "Rubber banding" on iOS
      document.body.style.overscrollBehavior = "none";

      // 4. Add padding to prevent content from jumping
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      // Re-enable scroll
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.body.style.paddingRight = "";
    }

    // Cleanup on unmount
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.body.style.paddingRight = "";
    };
  }, [onOff]);

  /* ---------------------------------------------
   * Preload next/prev images using Cloudflare-optimized URLs
   * ------------------------------------------- */
  useEffect(() => {
    if (!onOff) return;

    const preloadImages = [];

    // Helper to generate Cloudflare CDN URL (matching cloudflareLoader.js)
    const getCloudflareUrl = (src, width = 1920) => {
      try {
        const url = new URL(src);
        const path = url.pathname;
        return `https://files.volvox.pics/cdn-cgi/image/width=${width},quality=75,format=auto${path}`;
      } catch (e) {
        return src; // Fallback to original if URL parsing fails
      }
    };

    // Determine viewport-appropriate width (matching Next.js logic)
    // const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
    // const width = vw <= 768 ? (vw <= 640 ? 640 : vw <= 750 ? 750 : 828) : 1920;
    /////////

    // 1. Get Viewport Width
    const vw = typeof window !== "undefined" ? window.innerWidth : 1920;

    // 2. Get Device Pixel Ratio (default to 1 for server/old browsers)
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    // 3. Calculate the actual required pixel width based on your 'sizes' prop:
    //    sizes="(max-width: 768px) 100vw, 50vw"
    let requiredWidth;
    if (vw <= 768) {
      requiredWidth = vw * dpr; // Mobile: 100% width * density
    } else {
      requiredWidth = vw * 0.5 * dpr; // Desktop: 50% width * density
    }

    // 4. Snap to nearest standard Next.js/Cloudflare breakpoints
    //    (These are the default Next.js deviceSizes/imageSizes.
    //     If you have custom ones in next.config.js, add them here.)
    const supportedWidths = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

    // Find the smallest supported width that is larger than the required width
    let width = supportedWidths.find((w) => w >= requiredWidth);

    // Fallback: If screen is huge, use the largest available
    if (!width) width = 3840;

    ////////

    // Create real img elements with Cloudflare-optimized URLs
    if (nextPost?.thumbnail) {
      const img = document.createElement("img");
      img.src = getCloudflareUrl(nextPost.thumbnail, width);
      console.log("Preloading next image:", img.src);
      img.style.position = "absolute";
      img.style.width = "1px";
      img.style.height = "1px";
      img.style.opacity = "0";
      img.style.pointerEvents = "none";
      img.style.left = "-9999px";
      document.body.appendChild(img);
      preloadImages.push(img);
    }

    if (previousPost?.thumbnail) {
      const img = document.createElement("img");
      img.src = getCloudflareUrl(previousPost.thumbnail, width);
      img.style.position = "absolute";
      img.style.width = "1px";
      img.style.height = "1px";
      img.style.opacity = "0";
      img.style.pointerEvents = "none";
      img.style.left = "-9999px";
      document.body.appendChild(img);
      preloadImages.push(img);
    }

    // Cleanup
    return () => {
      preloadImages.forEach((img) => {
        if (img.parentNode) {
          document.body.removeChild(img);
        }
      });
    };
  }, [nextPost?.thumbnail, previousPost?.thumbnail, onOff]);

  const handleCloseClick = () => {
    onClose();
  };

  const handleImageClick = (e) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* Backdrop with blur */}
      {onOff && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px]  touch-none z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-label={post ? `Image preview: ${post.title}` : "Image preview"}
        className="p-0 rounded-lg shadow-2xl overflow-hidden w-[95vw] md:w-[80vw] max-w-none md:max-w-5xl h-full max-h-[80vh] bg-neutral-900 z-50"
      >
        {post && (
          <div className="flex flex-col w-full h-full max-h-[80vh] bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-lg overflow-hidden">
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
                {post.blurDataURL && (
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
    ${wasCached ? "" : "transition-opacity duration-500 ease-out"}
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
                <div className="text-sm font-light text-neutral-400 leading-relaxed w-full break-words">
                  {post.description || (
                    <span className="italic opacity-50">...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
