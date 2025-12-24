"use client";

// export const processImage = (file) => {
//   return new Promise((resolve) => {
//     const reader = new FileReader();

//     reader.onload = (event) => {
//       const img = new Image();

//       img.onload = () => {
//         try {
//           let width = img.width;
//           let height = img.height;
//           const maxEdge = 2400;

//           // Scale down if needed
//           if (width > maxEdge || height > maxEdge) {
//             if (width > height) {
//               height = Math.round((height * maxEdge) / width);
//               width = maxEdge;
//             } else {
//               width = Math.round((width * maxEdge) / height);
//               height = maxEdge;
//             }
//           }

//           const canvas = document.createElement("canvas");
//           canvas.width = width;
//           canvas.height = height;

//           const ctx = canvas.getContext("2d");
//           ctx.drawImage(img, 0, 0, width, height);

//           // Try JPEG conversion first
//           canvas.toBlob(
//             (blob) => {
//               if (!blob) {
//                 resolve(file);
//                 return;
//               }

//               const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";

//               const jpegFile = new File([blob], newName, {
//                 type: "image/jpeg",
//                 lastModified: Date.now(),
//               });

//               resolve(jpegFile);
//             },
//             "image/jpeg",
//             0.9
//           );
//         } catch {
//           // Any unexpected canvas failure → fallback
//           resolve(file);
//         }
//       };

//       img.onerror = () => {
//         // Decode failed (e.g. Chrome + HEIC)
//         resolve(file);
//       };

//       img.src = event.target.result;
//     };

//     reader.onerror = () => {
//       resolve(file);
//     };

//     reader.readAsDataURL(file);
//   });
// };

export const processImage = (file) => {
  return new Promise((resolve) => {
    console.log("[processImage] Start:", file.name, file.type);

    const reader = new FileReader();

    reader.onload = (event) => {
      console.log("[processImage] FileReader loaded");

      const img = new Image();

      img.onload = () => {
        console.log(
          "[processImage] Image decoded:",
          img.width,
          "x",
          img.height
        );

        try {
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

          console.log("[processImage] Attempting JPEG conversion");

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                console.warn(
                  "[processImage] toBlob returned null — fallback to original"
                );
                resolve(file);
                return;
              }

              console.log(
                "[processImage] JPEG conversion succeeded",
                "size:",
                Math.round(blob.size / 1024),
                "KB"
              );

              const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";

              const jpegFile = new File([blob], newName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });

              resolve(jpegFile);
            },
            "image/jpeg",
            0.9
          );
        } catch (err) {
          console.warn(
            "[processImage] Canvas processing failed — fallback",
            err
          );
          resolve(file);
        }
      };

      img.onerror = () => {
        console.warn(
          "[processImage] Image decode failed — fallback to original"
        );
        resolve(file);
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      console.warn("[processImage] FileReader failed — fallback to original");
      resolve(file);
    };

    reader.readAsDataURL(file);
  });
};
