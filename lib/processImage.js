"use client";

/**
 * Generates a tiny blur placeholder from an image element
 * @param {HTMLImageElement} img - The loaded image
 * @returns {string} Base64 data URL of the blur
 */
const generateBlurDataURL = (img) => {
  // Create a tiny canvas for the blur (10px wide, proportional height)
  const blurSize = 10;
  const aspectRatio = img.height / img.width;
  const blurWidth = blurSize;
  const blurHeight = Math.round(blurSize * aspectRatio);

  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = blurWidth;
  blurCanvas.height = blurHeight;

  const blurCtx = blurCanvas.getContext("2d");

  // Draw the image at tiny size (this naturally creates blur due to downsampling)
  blurCtx.drawImage(img, 0, 0, blurWidth, blurHeight);

  // Convert to base64 with low quality for smallest size
  return blurCanvas.toDataURL("image/jpeg", 0.5);
};

/**
 * Check if file is HEIC/HEIF format
 * @param {File} file
 * @returns {boolean}
 */
const isHeicFile = (file) => {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
};

/**
 * Try to load an image and see if the browser can decode it natively
 * @param {File} file
 * @returns {Promise<HTMLImageElement|null>}
 */
const tryNativeLoad = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Check if image actually loaded with dimensions (not a broken decode)
        if (img.width > 0 && img.height > 0) {
          console.log("[processImage] Native decode succeeded");
          resolve(img);
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = event.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

/**
 * Process the image once we have a decoded HTMLImageElement
 * @param {HTMLImageElement} img
 * @param {File} originalFile
 * @returns {Promise<{file: File, blurDataURL: string}>}
 */
const processLoadedImage = (img, originalFile) => {
  return new Promise((resolve) => {
    try {
      // Generate blur FIRST
      const blurDataURL = generateBlurDataURL(img);
      console.log("[processImage] Blur generated, length:", blurDataURL.length);

      let width = img.width;
      let height = img.height;
      const maxEdge = 2400;

      const needsResize = width > maxEdge || height > maxEdge;

      if (needsResize) {
        if (width > height) {
          height = Math.round((height * maxEdge) / width);
          width = maxEdge;
        } else {
          width = Math.round((width * maxEdge) / height);
          height = maxEdge;
        }
        console.log("[processImage] Resizing to:", width, "x", height);
      } else {
        console.log("[processImage] No resize needed");
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      console.log("[processImage] Drawing to canvas succeeded");

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.warn("[processImage] toBlob returned null");
            resolve({ file: originalFile, blurDataURL });
            return;
          }

          console.log(
            "[processImage] JPEG conversion succeeded, size:",
            Math.round(blob.size / 1024),
            "KB"
          );

          const newName = originalFile.name.replace(/\.[^/.]+$/, "") + ".jpg";

          const jpegFile = new File([blob], newName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          resolve({ file: jpegFile, blurDataURL });
        },
        "image/jpeg",
        0.9
      );
    } catch (err) {
      console.warn("[processImage] Canvas processing failed:", err);
      resolve({ file: originalFile, blurDataURL: null });
    }
  });
};

/**
 * Processes an image file: resizes if needed and generates a blur placeholder
 * For HEIC files that can't be decoded client-side, returns a flag indicating server processing is needed
 *
 * @param {File} file - The raw file from input
 * @returns {Promise<{file: File, blurDataURL: string|null, needsServerBlur: boolean}>}
 */
export const processImage = async (file) => {
  console.log("[processImage] Start:", file.name, file.type);

  // Try native browser decode first (works for Safari with HEIC, and all standard formats)
  const nativeImg = await tryNativeLoad(file);

  if (nativeImg) {
    console.log("[processImage] Using native decode path");
    const result = await processLoadedImage(nativeImg, file);
    return { ...result, needsServerBlur: false };
  }

  // If native decode failed and it's HEIC, flag for server-side processing
  if (isHeicFile(file)) {
    console.log(
      "[processImage] HEIC detected, needs server-side blur generation"
    );
    return {
      file,
      blurDataURL: null,
      needsServerBlur: true,
    };
  }

  // For other formats that failed to decode, return as-is
  console.warn(
    "[processImage] Decode failed for non-HEIC file, returning original"
  );
  return { file, blurDataURL: null, needsServerBlur: false };
};

/**
 * Fetches blur from server after image has been uploaded
 * @param {string} imageUrl - The uploaded image URL
 * @returns {Promise<string|null>} - The blur data URL or null on failure
 */
export const fetchServerBlur = async (imageUrl) => {
  try {
    console.log("[fetchServerBlur] Fetching blur for:", imageUrl);
    const res = await fetch("/api/generate-blur", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });

    if (!res.ok) {
      console.error("[fetchServerBlur] Failed:", res.status);
      return null;
    }

    const { blurDataURL } = await res.json();
    console.log("[fetchServerBlur] Success, length:", blurDataURL?.length);
    return blurDataURL;
  } catch (err) {
    console.error("[fetchServerBlur] Error:", err);
    return null;
  }
};
