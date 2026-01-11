import { db } from "./firebase"; // Removed 'storage' import
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  writeBatch,
  onSnapshot,
  setDoc,
  serverTimestamp,
  limit,
  increment,
  getCountFromServer,
} from "firebase/firestore";

// Removed firebase/storage imports (ref, uploadBytes, etc)

// =================================================================
// USER-RELATED FUNCTIONS
// =================================================================

export const getUserByUsername = async (usernameTag) => {
  if (!usernameTag) return null;
  const q = query(
    collection(db, "users"),
    where("usernameTag", "==", usernameTag)
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log("No user found with that username.");
    return null;
  }
  return querySnapshot.docs[0].data();
};

// =================================================================
// FILE UPLOAD (MIGRATED TO R2)
// =================================================================

export const uploadFile = async (file, path) => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  // 1. Request a Presigned URL from our Next.js API
  const response = await fetch("/api/storage/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      folder: path, // <--- ADD THIS LINE to send the path to the server
    }),
  });

  if (!response.ok) throw new Error("Failed to get upload URL");

  const { signedUrl, publicUrl } = await response.json();

  // 2. Upload the file directly to R2 using the signed URL
  const uploadResponse = await fetch(signedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error("Upload to R2 failed");
  }

  // 3. Return the public URL to be saved in Firestore
  return publicUrl;
};

export const processImage = (file) => {
  return new Promise((resolve, reject) => {
    // 1. Create a FileReader to read the file
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        // 2. Calculate new dimensions
        let width = img.width;
        let height = img.height;
        const maxEdge = 2400;

        // Only scale down if the longest edge is bigger than maxEdge
        if (width > maxEdge || height > maxEdge) {
          if (width > height) {
            // Width is the longest
            height *= maxEdge / width;
            width = maxEdge;
          } else {
            // Height is the longest
            width *= maxEdge / height;
            height = maxEdge;
          }
        }

        // 3. Draw to Canvas
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // 4. Export as JPEG
        // Quality 0.85 is a good balance for web
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas to Blob conversion failed"));
              return;
            }

            // Rename file to .jpg
            const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";

            // Create new File object
            const newFile = new File([blob], newName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            resolve(newFile);
          },
          "image/jpeg",
          0.85
        );
      };

      img.onerror = (error) => reject(error);
    };

    reader.onerror = (error) => reject(error);
  });
};

// Helper function to call the Next.js API for deletion
const deleteFileViaAPI = async (url) => {
  if (!url) return;
  try {
    // Check if it's actually an R2 URL (optional safety check)
    if (!url.includes(process.env.NEXT_PUBLIC_R2_DOMAIN)) {
      console.warn("Skipping deletion of non-R2 URL:", url);
      return;
    }

    await fetch("/api/storage/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl: url }),
    });
  } catch (error) {
    console.error(`Failed to delete ${url} from storage:`, error);
  }
};

// =================================================================
// Dashboard modification
// =================================================================

export async function fetchUserDashboard(uid) {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return data?.dashboard ?? null;
}

export function listenUserDashboard(uid, onChange) {
  if (!uid) return () => {};
  const ref = doc(db, "users", uid);
  const unsubscribe = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(snap.data()?.dashboard ?? null);
    },
    (err) => {
      console.error("listenUserDashboard error", err);
      onChange(null);
    }
  );
  return unsubscribe;
}

export async function saveUserDashboard(uid, infoText, editorUid = null) {
  if (!uid) throw new Error("uid required");
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      dashboard: {
        infoText,
      },
    },
    { merge: true }
  );
}

export async function updateUserDashboardFields(uid, fields) {
  if (!uid) throw new Error("uid required");
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    ...fields,
    "dashboard.lastEditedAt": serverTimestamp(),
  });
}

export async function updateUserColours(uid, fieldPath, newHex) {
  if (!uid) throw new Error("uid required");
  const ref = doc(db, "users", uid);

  // Note: 'fields' was undefined in your original code here.
  // I removed the spread ...fields to fix the error.
  try {
    await updateDoc(ref, {
      [fieldPath]: newHex,
    });
  } catch (e) {
    // fallback if field doesn't exist yet
    const [, key] = fieldPath.split(".");
    await setDoc(
      ref,
      {
        dashboard: {
          [key]: value,
        },
      },
      { merge: true }
    );
  }
}

export async function fetchHex(uid) {
  const hex = await fetchUserDashboard(uid);
  return hex?.dashHex;
}

// =================================================================
// Page header modification
// =================================================================

export async function updateUsername(uid, usernameTag, usernameTitle) {
  if (!uid) throw new Error("uid required");
  const ref = doc(db, "users", uid);

  await setDoc(
    ref,
    {
      usernameTag: usernameTag,
      usernameTitle: usernameTitle,
    },
    { merge: true }
  );
}

export async function fetchUserPage(pid) {
  if (!pid) return null;
  const ref = doc(db, "pages", pid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return data?.pageMetaData ?? null;
}

export function listenUserPage(pid, onChange) {
  if (!pid) return () => {};
  const ref = doc(db, "pages", pid);
  const unsubscribe = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(snap.data()?.pageMetaData ?? null);
    },
    (err) => {
      console.error("listenUserPage error", err);
      onChange(null);
    }
  );
  return unsubscribe;
}

export async function saveUserPage(pid, infoText, index) {
  if (!pid) throw new Error("pid required");
  const ref = doc(db, "pages", pid);
  if (index == 1) {
    const infoText1 = infoText;
    await setDoc(
      ref,
      {
        pageMetaData: {
          infoText1,
        },
      },
      { merge: true }
    );
  } else if (index == 2) {
    const infoText2 = infoText;
    await setDoc(
      ref,
      {
        pageMetaData: {
          infoText2,
        },
      },
      { merge: true }
    );
  }
}

export async function updateUserPageFields(pid, fields) {
  if (!pid) throw new Error("pid required");
  const ref = doc(db, "pages", pid);
  await updateDoc(ref, {
    ...fields,
  });
}

// =================================================================
// PAGE-RELATED FUNCTIONS
// =================================================================

export const getPages = async (userId, isOwner = false) => {
  if (!userId) return [];
  let q = query(collection(db, "pages"), where("userId", "==", userId));
  if (!isOwner) {
    q = query(q, where("isPrivate", "==", false));
  }
  q = query(q, orderBy("order_index", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    created_date: doc.data().created_date.toDate(),
  }));
};

// Fetch first 20 post blur URLs for a specific page (for preview optimization)
export const getPagePreviewBlurs = async (pageId) => {
  if (!pageId) return [];
  const q = query(
    collection(db, "posts"),
    where("page_id", "==", pageId),
    orderBy("order_index", "asc"),
    limit(25)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data().blurDataURL || "");
};

// Batch fetch preview blurs for multiple pages (called after LCP)
export const batchFetchPagePreviews = async (pageIds) => {
  if (!pageIds || pageIds.length === 0) return {};

  // Fetch blurs for all pages in parallel
  const previewPromises = pageIds.map(async (pageId) => {
    const blurs = await getPagePreviewBlurs(pageId);
    return { pageId, blurs };
  });

  const results = await Promise.all(previewPromises);

  // Convert to object map: { pageId: [blur1, blur2, ...] }
  return results.reduce((acc, { pageId, blurs }) => {
    acc[pageId] = blurs;
    return acc;
  }, {});
};

export const getDashboardCount = async (userId) => {
  if (!userId) return 0;
  try {
    const coll = collection(db, "pages");
    const q = query(coll, where("userId", "==", userId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (err) {
    console.error("Error fetching dashboard count:", err);
    return 0;
  }
};

export const fetchDashboardPreviews = async (userId) => {
  if (!userId) return [];

  try {
    const q = query(
      collection(db, "pages"),
      where("userId", "==", userId),
      orderBy("order_index", "asc"),
      limit(12) // <--- 2. Add the limit here
    );

    const querySnapshot = await getDocs(q);

    // Only return the fields strictly needed for the Dashboard Skeleton
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      blurDataURL: doc.data().blurDataURL || "",
      thumbnail: doc.data().thumbnail || "",
    }));
  } catch (error) {
    console.error("Error fetching dashboard previews:", error);
    return [];
  }
};

export const getPageById = async (pageId) => {
  if (!pageId) return null;
  const pageDocRef = doc(db, "pages", pageId);
  const docSnap = await getDoc(pageDocRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
      created_date: docSnap.data().created_date.toDate(),
    };
  }
  console.log("No such page found in Firestore!");
  return null;
};

export const createPage = async (pageData, userId) => {
  const baseSlug = pageData.title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

  let finalSlug = baseSlug;
  let counter = 2;
  let isSlugUnique = false;

  const pagesCollectionRef = collection(db, "pages");

  // Generate blur placeholder if thumbnail exists
  const blurDataURL = pageData.blurDataURL || null;

  while (!isSlugUnique) {
    const q = query(
      pagesCollectionRef,
      where("userId", "==", pageData.userId),
      where("slug", "==", finalSlug)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      isSlugUnique = true;
    } else {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  const { pendingFile, ...dataToSave } = pageData;

  const createdDate = Timestamp.now();
  const docRef = await addDoc(pagesCollectionRef, {
    ...pageData,
    slug: finalSlug,
    blurDataURL,
    created_date: createdDate,
    pageMetaData: {
      infoText1: "A brief intorduction...",
      infoText2: "More details here below...",
    },
    postCount: 0,
  });

  await setDoc(
    doc(db, "users", pageData.userId),
    {
      pageCount: increment(1),
    },
    { merge: true }
  );

  // Return the created page data so caller can update local state
  return {
    id: docRef.id,
    ...pageData,
    slug: finalSlug,
    blurDataURL,
    created_date: createdDate.toDate(),
    pageMetaData: {
      infoText1: "A brief intorduction...",
      infoText2: "More details here below...",
    },
    postCount: 0,
  };
};

export const updatePage = async (pageId, pageData, allPages) => {
  const batch = writeBatch(db);
  const pageRef = doc(db, "pages", pageId);

  const originalPage = allPages.find((p) => p.id === pageId);
  if (!originalPage) {
    throw new Error(`updatePage: page ${pageId} not found in allPages`);
  }

  /* ---------------------------------------------
   * 1. THUMBNAIL CHANGE → GENERATE BLUR
   * ------------------------------------------- */
  if (pageData.thumbnail && originalPage.thumbnail !== pageData.thumbnail) {
    const res = await fetch("/api/generate-blur", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: pageData.thumbnail }),
    });

    if (res.ok) {
      const data = await res.json();
      pageData.blurDataURL = data.blurDataURL;
    } else {
      pageData.blurDataURL = null;
    }
  }

  /* ---------------------------------------------
   * 2. CLEANUP LOGIC FOR THUMBNAILS (R2)
   * ------------------------------------------- */
  if (
    originalPage.thumbnail &&
    pageData.thumbnail &&
    originalPage.thumbnail !== pageData.thumbnail
  ) {
    console.log("Replacing page thumbnail: deleting old R2 object...");
    await deleteFileViaAPI(originalPage.thumbnail);
  }

  /* ---------------------------------------------
   * 3. REORDERING LOGIC (UNCHANGED)
   * ------------------------------------------- */
  const oldIndex = originalPage.order_index;
  const newIndex = pageData.order_index;

  if (oldIndex !== newIndex) {
    const clampedNewIndex = Math.max(1, Math.min(newIndex, allPages.length));
    pageData.order_index = clampedNewIndex;

    if (oldIndex > clampedNewIndex) {
      allPages.forEach((p) => {
        if (
          p.id !== pageId &&
          p.order_index >= clampedNewIndex &&
          p.order_index < oldIndex
        ) {
          const pRef = doc(db, "pages", p.id);
          batch.update(pRef, { order_index: p.order_index + 1 });
        }
      });
    } else {
      allPages.forEach((p) => {
        if (
          p.id !== pageId &&
          p.order_index > oldIndex &&
          p.order_index <= clampedNewIndex
        ) {
          const pRef = doc(db, "pages", p.id);
          batch.update(pRef, { order_index: p.order_index - 1 });
        }
      });
    }
  }

  /* ---------------------------------------------
   * 4. COMMIT
   * ------------------------------------------- */
  batch.update(pageRef, pageData);
  await batch.commit();
};

export const deletePage = async (pageData) => {
  // Guard against temp IDs that haven't been created yet
  if (!pageData.id || pageData.id.startsWith("temp-")) {
    console.warn("[deletePage] Skipping delete for temp/missing ID:", pageData.id);
    return;
  }

  const pageDoc = await getDoc(doc(db, "pages", pageData.id));

  if (!pageDoc.exists()) {
    // Page doesn't exist - this can happen if:
    // 1. Page was already deleted
    // 2. Page creation is still in progress
    // We log but don't throw, since the page is effectively "deleted" from user's perspective
    console.warn("[deletePage] Page not found, may have been already deleted:", pageData.id);
    return;
  }

  const pageToDelete = pageDoc.data();

  ////

  // 2. Fetch all posts that belong to this page (to delete their files too)
  const postsToDelete = await getPostsForPage(pageData.id);

  // 3. Gather ALL file URLs (Page thumbnail + Post thumbnails + Post files)
  const urlsToDelete = [];

  // Add the page's own thumbnail
  if (pageToDelete.thumbnail) {
    urlsToDelete.push(pageToDelete.thumbnail);
  }

  // Add files from child posts
  postsToDelete.forEach((post) => {
    // Post thumbnail
    if (post.thumbnail) {
      urlsToDelete.push(post.thumbnail);
    }
    // Post content (only if it's a file)
    if (post.content_type === "file" && post.content) {
      urlsToDelete.push(post.content);
    }
  });

  // 4. DELETE FROM R2 (The Update)
  // We use Promise.all to delete them all in parallel for speed
  const deletePromises = urlsToDelete.map((url) => deleteFileViaAPI(url));
  await Promise.all(deletePromises);

  // 5. FIRESTORE CLEANUP (Same as before)
  const batch = writeBatch(db);

  // Delete all child posts
  postsToDelete.forEach((post) => {
    const postRef = doc(db, "posts", post.id);
    batch.delete(postRef);
  });

  // Delete the main page document
  const pageToDeleteRef = doc(db, "pages", pageData.id);
  batch.delete(pageToDeleteRef);

  await setDoc(
    doc(db, "users", pageData.userId),
    {
      pageCount: increment(-1),
    },
    { merge: true }
  );

  // 6. Commit database changes
  await batch.commit();
};

// =================================================================
// POST-RELATED FUNCTIONS
// =================================================================

export const getPostsForPage = async (pageId) => {
  if (!pageId) return [];
  const q = query(
    collection(db, "posts"),
    where("page_id", "==", pageId),
    orderBy("order_index", "asc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    created_date: doc.data().created_date.toDate(),
  }));
};

export const getPostById = async (postId) => {
  if (!postId) return null;
  const postDocRef = doc(db, "posts", postId);
  const docSnap = await getDoc(postDocRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
      created_date: docSnap.data().created_date.toDate(),
    };
  }
  return null;
};

// Updated createPost function for lib/data.js
// Replace your existing createPost with this version

export const createPost = async (postData) => {
  const baseSlug = postData.title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

  let finalSlug = baseSlug;
  let counter = 2;
  let isSlugUnique = false;
  const postsCollectionRef = collection(db, "posts");

  // blurDataURL is now passed in from client-side generation
  // No need to fetch from server anymore!
  const blurDataURL = postData.blurDataURL || null;

  while (!isSlugUnique) {
    const q = query(
      postsCollectionRef,
      where("page_id", "==", postData.page_id),
      where("slug", "==", finalSlug)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      isSlugUnique = true;
    } else {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // Remove client-only fields from what gets saved to Firestore
  const {
    pendingFile,
    isOptimistic,
    clientId,
    isUploadingHeic,
    ...dataToSave
  } = postData;

  const createdDate = Timestamp.now();
  const docRef = await addDoc(postsCollectionRef, {
    ...dataToSave,
    slug: finalSlug,
    blurDataURL,
    created_date: createdDate,
  });

  await setDoc(
    doc(db, "pages", postData.page_id),
    {
      postCount: increment(1),
    },
    { merge: true }
  );

  // Return the created post data so caller can update local state
  return {
    id: docRef.id,
    ...dataToSave,
    slug: finalSlug,
    blurDataURL,
    created_date: createdDate.toDate(),
  };
};

export const getPostBySlug = async (pageId, slug) => {
  if (!pageId || !slug) return null;
  const q = query(
    collection(db, "posts"),
    where("page_id", "==", pageId),
    where("slug", "==", slug)
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    console.log("No post found with that slug for this page.");
    return null;
  }
  const postDoc = querySnapshot.docs[0];
  return {
    id: postDoc.id,
    ...postDoc.data(),
    created_date: postDoc.data().created_date.toDate(),
  };
};

export const updatePost = async (postId, postData, allPosts) => {
  const batch = writeBatch(db);
  const postRef = doc(db, "posts", postId);

  const originalPost = allPosts.find((p) => p.id === postId);
  if (!originalPost) {
    throw new Error(`updatePost: post ${postId} not found in allPosts`);
  }

  /* ---------------------------------------------
   * 1. THUMBNAIL CHANGE → GENERATE BLUR
   * ------------------------------------------- */
  if (postData.thumbnail && originalPost.thumbnail !== postData.thumbnail) {
    const res = await fetch("/api/generate-blur", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: postData.thumbnail }),
    });

    if (res.ok) {
      const data = await res.json();
      postData.blurDataURL = data.blurDataURL;
    } else {
      postData.blurDataURL = null;
    }
  }

  /* ---------------------------------------------
   * 2. CLEANUP CHECK (R2 FILE REPLACEMENT)
   * ------------------------------------------- */
  if (
    originalPost.content_type === "file" &&
    originalPost.content &&
    postData.content &&
    originalPost.content !== postData.content
  ) {
    console.log("Replacing file: deleting old R2 object...");
    await deleteFileViaAPI(originalPost.content);
  }

  /* ---------------------------------------------
   * 3. REORDERING LOGIC (UNCHANGED)
   * ------------------------------------------- */
  const oldIndex = originalPost.order_index;
  const newIndex = postData.order_index;

  if (oldIndex !== newIndex) {
    const clampedNewIndex = Math.max(1, Math.min(newIndex, allPosts.length));
    postData.order_index = clampedNewIndex;

    if (oldIndex > clampedNewIndex) {
      allPosts.forEach((p) => {
        if (
          p.id !== postId &&
          p.order_index >= clampedNewIndex &&
          p.order_index < oldIndex
        ) {
          const pRef = doc(db, "posts", p.id);
          batch.update(pRef, { order_index: p.order_index + 1 });
        }
      });
    } else {
      allPosts.forEach((p) => {
        if (
          p.id !== postId &&
          p.order_index > oldIndex &&
          p.order_index <= clampedNewIndex
        ) {
          const pRef = doc(db, "posts", p.id);
          batch.update(pRef, { order_index: p.order_index - 1 });
        }
      });
    }
  }

  /* ---------------------------------------------
   * 4. COMMIT (Remove client-only fields before saving)
   * ------------------------------------------- */
  const { isOptimistic, clientId, isUploadingHeic, ...cleanPostData } =
    postData;
  batch.update(postRef, cleanPostData);
  await batch.commit();
};

export const deletePost = async (postData) => {
  // Guard against temp IDs that haven't been created yet
  if (!postData.id || postData.id.startsWith("temp-")) {
    console.warn("[deletePost] Skipping delete for temp/missing ID:", postData.id);
    return;
  }

  const postDoc = await getDoc(doc(db, "posts", postData.id));

  if (!postDoc.exists()) {
    // Post doesn't exist - this can happen if:
    // 1. Post was already deleted
    // 2. Post creation is still in progress
    // We log but don't throw, since the post is effectively "deleted" from user's perspective
    console.warn("[deletePost] Post not found, may have been already deleted:", postData.id);
    return;
  }

  const postToDelete = postDoc.data();

  // 1. DELETE FILES FROM R2
  if (postToDelete.content_type === "file") {
    await deleteFileViaAPI(postToDelete.content);
  }
  if (postToDelete.thumbnail) {
    await deleteFileViaAPI(postToDelete.thumbnail);
  }

  // 2. FIRESTORE DELETE
  const batch = writeBatch(db);

  batch.delete(doc(db, "posts", postData.id));

  const pageRef = doc(db, "pages", postData.page_id);
  batch.update(pageRef, { postCount: increment(-1) });

  await batch.commit();
};

// In lib/data.js
export const reindexPosts = async (pageId) => {
  const posts = await getPostsForPage(pageId);

  // Filter out any optimistic posts and sort by current order
  const confirmedPosts = posts
    .filter((p) => !p.isOptimistic)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const batch = writeBatch(db);

  confirmedPosts.forEach((post, index) => {
    const newIndex = index + 1; // 1-based indexing
    if (post.order_index !== newIndex) {
      const postRef = doc(db, "posts", post.id);
      batch.update(postRef, { order_index: newIndex });
    }
  });

  await batch.commit();
};

// Reconcile postCount by counting actual posts in the database
export const reconcilePostCount = async (pageId) => {
  const posts = await getPostsForPage(pageId);

  // Count only confirmed (non-optimistic) posts
  const actualCount = posts.filter((p) => !p.isOptimistic).length;

  // Update the page's postCount to match reality
  const pageRef = doc(db, "pages", pageId);
  await updateDoc(pageRef, { postCount: actualCount });

  return actualCount;
};

// Reconcile pageCount by counting actual pages in the database
export const reconcilePageCount = async (userId) => {
  const pages = await getPages(userId, true);

  // Count only confirmed (non-optimistic) pages
  const actualCount = pages.filter((p) => !p.isOptimistic).length;

  // Update the user's pageCount to match reality
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { pageCount: actualCount });

  return actualCount;
};

export const reindexPages = async (userId) => {
  // Fetch fresh pages from database (like reindexPosts does)
  const pages = await getPages(userId, true);

  // Filter out any optimistic pages and sort by current order
  const confirmedPages = pages
    .filter((p) => !p.isOptimistic)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const batch = writeBatch(db);

  confirmedPages.forEach((page, index) => {
    const newIndex = index + 1;
    if (page.order_index !== newIndex) {
      const pageRef = doc(db, "pages", page.id);
      batch.update(pageRef, { order_index: newIndex });
    }
  });

  await batch.commit();
};

export const getPageBySlug = async (userId, slug) => {
  if (!userId || !slug) return null;
  const q = query(
    collection(db, "pages"),
    where("userId", "==", userId),
    where("slug", "==", slug)
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    console.log("No page found with that slug for this user.");
    return null;
  }
  const pageDoc = querySnapshot.docs[0];
  return {
    id: pageDoc.id,
    ...pageDoc.data(),
    created_date: pageDoc.data().created_date.toDate(),
  };
};

// =================================================================

export const lowercaseDashed = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // spaces → dashes
    .replace(/[^\w-]+/g, "") // remove emojis + symbols
    .replace(/-+/g, "-") // collapse multiple dashes
    .replace(/^-+|-+$/g, ""); // remove leading/trailing dashes

export const findAvailableUsernameTag = async (baseTag, thisUserTag = null) => {
  if (!baseTag) return null;
  if (baseTag === thisUserTag) return baseTag;

  const usersRef = collection(db, "users");
  let currentTag = baseTag;
  let isTaken = true;
  let increment = 1;

  while (isTaken && increment < 10) {
    // Check if currentTag exists
    const q = query(usersRef, where("usernameTag", "==", currentTag), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      isTaken = false; // It's free!
    } else {
      // It's taken, increment and try again
      increment++;
      currentTag = `${baseTag}${increment}`;
    }
  }

  // Fallback if 1-10 are all taken
  if (isTaken) {
    currentTag = `${baseTag}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return currentTag;
};
