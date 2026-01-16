"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// Helper to generate Cloudflare CDN URL
const getCloudflareUrl = (src, width, quality = 75) => {
  try {
    const url = new URL(src);
    const path = url.pathname;
    return `https://files.volvox.pics/cdn-cgi/image/width=${width},quality=${quality},format=auto${path}`;
  } catch (e) {
    return src;
  }
};

// Number of images to preload in each direction
const PRELOAD_COUNT = 2;

export default function PhotoShowModal({
  post,
  onOff,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  posts = [],
  currentIndex = -1,
}) {
  const dialogRef = useRef(null);
  const imageRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [wasCached, setWasCached] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);

  /* ---------------------------------------------
   * Lock body scroll BEFORE dialog opens to prevent position flash on mobile
   * Using useLayoutEffect ensures this runs synchronously before paint
   * ------------------------------------------- */
  useLayoutEffect(() => {
    if (onOff) {
      // 1. Save current scroll position
      const scrollY = window.scrollY;

      // 2. Calculate scrollbar width to prevent layout shift
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      // 3. Lock scroll while preserving visual position
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overscrollBehavior = "none";
    } else {
      // 1. Get the scroll position we saved (stored in body.style.top)
      const scrollY = document.body.style.top;

      // 2. Remove all the locks
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.paddingRight = "";
      document.body.style.overscrollBehavior = "";

      // 3. Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0", 10) * -1);
      }
    }

    // Cleanup on unmount
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.paddingRight = "";
      document.body.style.overscrollBehavior = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0", 10) * -1);
      }
    };
  }, [onOff]);

  /* ---------------------------------------------
   * Sync <dialog> open/close with parent state
   * This runs AFTER the scroll lock is applied (useEffect runs after useLayoutEffect)
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
    setThumbnailLoaded(false);
  }, [post?.id]);

  /* ---------------------------------------------
   * Preload adjacent images using Cloudflare-optimized URLs
   * Preloads PRELOAD_COUNT images in each direction for smooth navigation
   * ------------------------------------------- */
  useEffect(() => {
    if (!onOff || currentIndex < 0 || posts.length === 0) return;

    const preloadImages = [];

    // Calculate viewport-appropriate width
    const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    let requiredWidth;
    if (vw <= 768) {
      requiredWidth = vw * dpr;
    } else {
      requiredWidth = vw * 0.5 * dpr;
    }

    const supportedWidths = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
    let width = supportedWidths.find((w) => w >= requiredWidth) || 3840;

    // Helper to preload a single image
    const preloadImage = (thumbnail) => {
      if (!thumbnail) return;
      try {
        const url = new URL(thumbnail);
        const path = url.pathname;
        const optimizedUrl = `https://files.volvox.pics/cdn-cgi/image/width=${width},quality=75,format=auto${path}`;

        const img = document.createElement("img");
        img.src = optimizedUrl;
        img.style.position = "absolute";
        img.style.width = "1px";
        img.style.height = "1px";
        img.style.opacity = "0";
        img.style.pointerEvents = "none";
        img.style.left = "-9999px";
        document.body.appendChild(img);
        preloadImages.push(img);
      } catch (e) {
        // Ignore URL parsing errors
      }
    };

    // Preload images ahead (next N posts)
    for (let i = 1; i <= PRELOAD_COUNT; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < posts.length) {
        preloadImage(posts[nextIndex]?.thumbnail);
      }
    }

    // Preload images behind (previous N posts)
    for (let i = 1; i <= PRELOAD_COUNT; i++) {
      const prevIndex = currentIndex - i;
      if (prevIndex >= 0) {
        preloadImage(posts[prevIndex]?.thumbnail);
      }
    }

    // Cleanup
    return () => {
      preloadImages.forEach((img) => {
        if (img.parentNode) {
          document.body.removeChild(img);
        }
      });
    };
  }, [currentIndex, posts, onOff]);

  const handleCloseClick = () => {
    onClose();
  };

  const handleImageClick = (e) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* Backdrop with blur */}
      {/* {onOff && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px]  touch-none z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )} */}

      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-label={post ? `Image preview: ${post.title}` : "Image preview"}
        className="p-0 rounded-lg shadow-2xl overflow-hidden w-[95vw] md:w-[80vw] max-w-none md:max-w-5xl h-full max-h-[80vh] bg-neutral-900 z-50"
      >
        {post && (
          <div className="flex flex-col w-full h-full max-h-[80vh] bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-lg overflow-hidden">
            {/* HEADER  */}
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
            {/* <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y"> */}
            <div className="flex-1 overflow-y-auto overscroll-none">
              {/* IMAGE AREA */}
              <div
                key={post.id}
                onClick={handleImageClick}
                className="relative bg-black select-none flex justify-center items-center overflow-hidden h-[65vh] w-full"
              >
                {/* LAYER 1: BLUR PLACEHOLDER (always visible as base) */}
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

                {/* LAYER 2: GRID THUMBNAIL (small, already cached from grid view) */}
                {/* Stays visible until full image is loaded - no fade out to prevent jitter */}
                {post.thumbnail && (
                  <img
                    src={getCloudflareUrl(post.thumbnail, 384)}
                    alt=""
                    aria-hidden
                    onLoad={() => setThumbnailLoaded(true)}
                    className={`
                      absolute inset-0 w-full h-full object-contain pointer-events-none
                      ${thumbnailLoaded ? "opacity-100" : "opacity-0"}
                    `}
                  />
                )}

                {/* LAYER 3: FULL IMAGE (modal size) */}
                {/* Fades in over the thumbnail - no transition on thumbnail prevents jitter */}
                <Image
                  ref={imageRef}
                  src={post.thumbnail}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  onLoad={() => setIsLoaded(true)}
                  className={`
                    object-contain
                    ${
                      wasCached
                        ? ""
                        : "transition-opacity duration-300 ease-out"
                    }
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
                {post.description ? (
                  <div
                    className="
        w-full min-w-0 
        text-sm font-light text-neutral-400 leading-relaxed
        
        text-justify 
        hyphens-none       /* CHANGE 1: Disables automatic hyphenation */
        break-words        /* CHANGE 2: Keeps words together, wraps whole word to next line */
        
        whitespace-pre-line
        [&_p]:mb-3 [&_p:last-child]:mb-0
      "
                    style={{
                      textAlign: "justify",
                      textJustify: "inter-word",
                      // overflowWrap: "anywhere" // Optional: Use this if you have massive URLs that break layout
                    }}
                    dangerouslySetInnerHTML={{ __html: post.description }}
                  />
                ) : (
                  <div className="text-sm font-light text-neutral-400 leading-relaxed w-full">
                    <span className="italic opacity-50">...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
