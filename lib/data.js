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

export async function changeHexGlobal(uid, newHex) {
  if (!uid) throw new Error("uid required");
  const ref = doc(db, "users", uid);

  // Note: 'fields' was undefined in your original code here.
  // I removed the spread ...fields to fix the error.
  try {
    await updateDoc(ref, {
      "dashboard.dashHex": newHex,
    });
  } catch (e) {
    await setDoc(
      ref,
      {
        dashboard: {
          dashHex: newHex,
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

  while (!isSlugUnique) {
    const q = query(
      pagesCollectionRef,
      where("userId", "==", userId),
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

  await addDoc(pagesCollectionRef, {
    ...pageData,
    userId: userId,
    slug: finalSlug,
    created_date: Timestamp.now(),
    pageMetaData: {
      infoText1: "A brief intorduction...",
      infoText2: "More details here below...",
    },
  });
};

export const updatePage = async (pageId, pageData, allPages) => {
  const batch = writeBatch(db);
  const pageRef = doc(db, "pages", pageId);

  const originalPage = allPages.find((p) => p.id === pageId);

  // --- NEW: CLEANUP LOGIC FOR THUMBNAILS ---
  // If the thumbnail URL has changed, delete the old one from R2
  if (
    originalPage &&
    originalPage.thumbnail &&
    pageData.thumbnail &&
    originalPage.thumbnail !== pageData.thumbnail
  ) {
    console.log("Replacing page thumbnail: deleting old R2 object...");
    await deleteFileViaAPI(originalPage.thumbnail);
  }
  // -----------------------------------------

  const oldIndex = originalPage.order_index;
  const newIndex = pageData.order_index;

  // Only perform reordering logic if the index has actually changed
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

  batch.update(pageRef, pageData);
  await batch.commit();
};

export const deletePage = async (pageId, allPages) => {
  // 1. Find the page object
  const pageToDelete = allPages.find((p) => p.id === pageId);
  if (!pageToDelete) {
    console.error("Could not find page to delete. Aborting.");
    // Fallback: just delete the doc if we can't find the object in the list
    await deleteDoc(doc(db, "pages", pageId));
    return;
  }

  // 2. Fetch all posts that belong to this page (to delete their files too)
  const postsToDelete = await getPostsForPage(pageId);

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
  const deletedIndex = pageToDelete.order_index;

  // Delete all child posts
  postsToDelete.forEach((post) => {
    const postRef = doc(db, "posts", post.id);
    batch.delete(postRef);
  });

  // Reorder remaining pages
  allPages.forEach((page) => {
    if (page.order_index > deletedIndex) {
      const pageRef = doc(db, "pages", page.id);
      batch.update(pageRef, { order_index: page.order_index - 1 });
    }
  });

  // Delete the main page document
  const pageToDeleteRef = doc(db, "pages", pageId);
  batch.delete(pageToDeleteRef);

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

  await addDoc(postsCollectionRef, {
    ...postData,
    slug: finalSlug,
    created_date: Timestamp.now(),
  });
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

  // 1. CLEANUP CHECK: If the content URL changed, delete the old file from R2
  if (
    originalPost &&
    originalPost.content_type === "file" &&
    originalPost.content &&
    postData.content &&
    originalPost.content !== postData.content
  ) {
    // The user uploaded a NEW file, so we delete the OLD one
    console.log("Replacing file: deleting old R2 object...");
    await deleteFileViaAPI(originalPost.content);
  }

  // 2. REORDERING LOGIC (Kept exactly as it was)
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

  // 3. Commit changes
  batch.update(postRef, postData);
  await batch.commit();
};

export const deletePost = async (postId, allPosts) => {
  const postToDelete = allPosts.find((p) => p.id === postId);

  if (!postToDelete) {
    console.error("Could not find post to delete.");
    // Fallback: just try to delete the doc
    await deleteDoc(doc(db, "posts", postId));
    return;
  }

  // 1. DELETE FILES FROM R2
  // Only attempt to delete content if it was a file type.
  if (postToDelete.content_type === "file") {
    await deleteFileViaAPI(postToDelete.content);
  }
  // Delete thumbnail if it exists
  if (postToDelete.thumbnail) {
    await deleteFileViaAPI(postToDelete.thumbnail);
  }

  // 2. FIRESTORE BATCH DELETE
  const batch = writeBatch(db);
  const deletedIndex = postToDelete.order_index;

  // Shift order for remaining posts
  allPosts.forEach((post) => {
    if (post.order_index > deletedIndex) {
      const postRef = doc(db, "posts", post.id);
      batch.update(postRef, { order_index: post.order_index - 1 });
    }
  });

  const postToDeleteRef = doc(db, "posts", postId);
  batch.delete(postToDeleteRef);

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
