Can you have a good look at PageViewClient.js and PageInfoEditor.js and understand how they work.

Then have a look at DashboardViewClient.js and DashboardInfoEdit.js. There are a number of improvements I have made to PageViewClient.js and PageInfoEditor.js and i now want to transfer the same improvements over to DashboardViewClient.js and DashboardInfoEdit.js. Can you make a summary list of all of the features and improvments that can be added to DashboardViewClient.js and DashboardInfoEdit.js, to bring them up to par with PageViewClient.js and PageInfoEditor.js.

To give you some ideas, look at this list:

For DashboardViewClient.js (from PageViewClient.js):

Loading Overlay System (Lines 658-736)

Improved Scroll Management (Lines 154-173)

Code Simplifications & Cleanups

Dev Overlay Toggle (Lines 595-602)

For DashboardInfoEditor.js (from PageInfoEditor.js):

Advanced Styling System (Lines 22-29)

Dual-Layer Text Display (Lines 92-134)

Better Loading State (Lines 90, 95-104)

Better Loading State (Lines 90, 95-104)

Invisible Placeholder Handling (Lines 86-88)
6.Better Edit/View Toggle (Lines 85, 118-134)

Improved Textarea Styling (Lines 118-134)

Status Label Positioning (Lines 136-147)

Key Architectural Patterns to Adopt:

Optimistic Page Data from Context - PageViewClient uses themeState.optimisticPageData to show skeleton content immediately

Loading Overlay Pattern - Separate overlay that mirrors the real content structure

Sync-based Visibility - Content hidden until scroll position and data are ready

Grid-based Text Editor - Overlapping layers for smoother edit/view transitions

Comprehensive Status Tracking - Loading, syncing, uploading states all visible to user

//PageViewClient.js

"use client";

import React, {
useState,
useCallback,
useRef,
useEffect,
useLayoutEffect,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Plus, LogOut, ArrowLeft, User as UserIcon, Eye } from "lucide-react";
import {
getPostsForPage,
createPost,
updatePost,
deletePost,
uploadFile,
reindexPosts,
reconcilePostCount,
} from "@/lib/data";
import { fetchServerBlur } from "@/lib/processImage";
import PostCard from "@/components/page/PostCard";
import CreatePostModal from "@/components/page/CreatePostModal";
import EditPostModal from "@/components/page/EditPostModal";
import PageInfoEditor from "@/components/page/PageInfoEditor";
import PhotoShowModal from "@/components/page/PhotoShowModal";

import { lighten, hexToRgba } from "@/components/dashboard/DashHeader";
import { useTheme } from "@/context/ThemeContext";
import ActionButton from "@/components/ActionButton";
import { useQueue } from "@/lib/useQueue";

const PostSkeleton = ({ blurDataURL }) => (

  <div className="p-1 rounded-md bg-[#3f3e3b]/30 shadow-md h-full flex flex-col">
    <div
      className="w-full aspect-[4/3] rounded-sm overflow-hidden relative"
      style={{
        backgroundImage: blurDataURL ? `url("${blurDataURL}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: !blurDataURL ? "#e5e5e5" : undefined,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      {!blurDataURL && (
        <div className="absolute inset-0 bg-gray-200/50 animate-pulse" />
      )}
    </div>
  </div>
);


const TitleSkeleton = () => (

  <div className="h-8 w-48 bg-gray-200/50 rounded-md animate-pulse mb-2" />
);


export default function PageViewClient({
profileUser,
initialPage,
initialPosts,
initialInfoTexts,
dashboardPreviews = [],
totalDashboardCount = 0,
params,
}) {
const { usernameTag, pageSlug } = params;
const { user: currentUser, logout } = useAuth();
const router = useRouter();
const { themeState, setOptimisticDashboardData } = useTheme();

const [isSynced, setIsSynced] = useState(false);
const [debugOverlay, setDebugOverlay] = useState(false);

const [page, setPage] = useState(() => {
const optimistic = themeState.optimisticPageData;
if (optimistic && optimistic.slug === pageSlug && !initialPage) {
return optimistic;
}
return initialPage;
});

const [posts, setPosts] = useState(() => {
if (initialPosts && initialPosts.length > 0) {
return initialPosts;
}
const optimistic = themeState.optimisticPageData;
if (
optimistic &&
optimistic.slug === pageSlug &&
optimistic.postCount > 0
) {
return Array.from({ length: optimistic.postCount }, (_, i) => ({
id: skeleton-${i},
isSkeleton: true,
blurDataURL: optimistic.previewPostBlurs?.[i] || "",
order_index: i,
}));
}
return [];
});

const serverBlurs = initialPosts?.map((p) => p.blurDataURL) || [];
const optimisticBlurs =
themeState?.optimisticPageData?.previewPostBlurs || [];
const overlayBlurs = serverBlurs.length > 0 ? serverBlurs : optimisticBlurs;

const handleQueueEmpty = useCallback(async () => {
if (page?.id) {
await reindexPosts(page.id);
await reconcilePostCount(page.id);
const freshPosts = await getPostsForPage(page.id);
setPosts(freshPosts);
}
}, [page?.id]);

const { addToQueue, isSyncing } = useQueue(handleQueueEmpty);

const postsRef = useRef(initialPosts);
useEffect(() => {
postsRef.current = posts;
}, [posts]);

// UI States
const [showCreateModal, setShowCreateModal] = useState(false);
const [editingPost, setEditingPost] = useState(null);
const [editOn, setEditOn] = useState(false);
const [selectedPostForModal, setSelectedPostForModal] = useState(null);
const deletedIdsRef = useRef(new Set());
const topInfoRef = useRef(null);

const isOwner =
currentUser && profileUser && currentUser.uid === profileUser.uid;
const isPublic = page?.isPublic || false;
const useLiveTheme = themeState.uid === profileUser?.uid;

const activeDashHex =
useLiveTheme && themeState.dashHex
? themeState.dashHex
: profileUser?.dashboard?.dashHex || "#ffffff";

const activeBackHex =
useLiveTheme && themeState.backHex
? themeState.backHex
: profileUser?.dashboard?.backHex || "#ffffff";

useEffect(() => {
if (initialPage && initialPage.id) {
setPage(initialPage);
}
}, [initialPage?.id]);

// SIMPLIFICATION 1: Combined Layout Effects
useLayoutEffect(() => {
if (
typeof window !== "undefined" &&
"scrollRestoration" in window.history
) {
window.history.scrollRestoration = "manual";
}

code
Code
download
content_copy
expand_less
// Calculate scroll position immediately
if (topInfoRef.current) {
  const elementTop = topInfoRef.current.offsetTop;
  const headerHeight = 47;
  window.scrollTo({
    top: elementTop - headerHeight + 25,
    behavior: "instant",
  });
}

setIsSynced(true);

}, []);

const handleBackClick = () => {
if (profileUser) {
setOptimisticDashboardData({
uid: profileUser.uid,
pageCount: totalDashboardCount,
pageBlurs: dashboardPreviews,
dashHex: activeDashHex,
backHex: activeBackHex,
usernameTitle: profileUser?.usernameTitle || "",
usernameTag: profileUser?.usernameTag || "",
});
}
};

useEffect(() => {
if (!initialPosts || initialPosts.length === 0) return;

code
Code
download
content_copy
expand_less
const serverIds = new Set(initialPosts.map((p) => p.id));
deletedIdsRef.current.forEach((id) => {
  if (!serverIds.has(id)) {
    deletedIdsRef.current.delete(id);
  }
});

setPosts((currentLocalPosts) => {
  if (currentLocalPosts.length > 0 && currentLocalPosts[0]?.isSkeleton) {
    return initialPosts.filter((p) => !deletedIdsRef.current.has(p.id));
  }

  const validServerPosts = initialPosts.filter(
    (p) => !deletedIdsRef.current.has(p.id)
  );
  const optimisticPosts = currentLocalPosts.filter((p) => p.isOptimistic);
  const serverPostsByClientId = new Map();
  validServerPosts.forEach((p) => {
    if (p.clientId) serverPostsByClientId.set(p.clientId, p);
  });

  const merged = validServerPosts.map((serverPost) => {
    const matchingOptimistic = optimisticPosts.find(
      (opt) => opt.clientId && opt.clientId === serverPost.clientId
    );
    return matchingOptimistic ? serverPost : serverPost;
  });

  optimisticPosts.forEach((optPost) => {
    const hasServerVersion =
      optPost.clientId && serverPostsByClientId.has(optPost.clientId);
    const existsById = merged.some((p) => p.id === optPost.id);
    if (!hasServerVersion && !existsById) {
      merged.push(optPost);
    }
  });

  return merged.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
});

}, []);

const handleLogout = async () => {
try {
await logout();
router.push("/login");
} catch (error) {
console.error("Failed to log out:", error);
}
};

const handleCreatePost = async (postData) => {
if (!(isOwner || isPublic) || !page) return;
setShowCreateModal(false);

code
Code
download
content_copy
expand_less
const clientId = crypto.randomUUID();
const tempId = `temp-${Date.now()}`;
const currentList = postsRef.current;
const maxOrder =
  currentList.length > 0
    ? Math.max(...currentList.map((p) => p.order_index || 0))
    : 0;
const newOrderIndex = maxOrder + 1;

const optimisticPost = {
  id: tempId,
  title: postData.title,
  description: postData.description,
  thumbnail: "",
  blurDataURL: postData.blurDataURL || "",
  content_type: postData.content_type,
  content: postData.content,
  page_id: page.id,
  order_index: newOrderIndex,
  created_date: new Date(),
  isOptimistic: true,
  clientId: clientId,
  isUploadingHeic: postData.needsServerBlur,
};

postsRef.current = [...currentList, optimisticPost];
setPosts(postsRef.current);

addToQueue({
  type: "create",
  actionFn: async () => {
    const securePath = `users/${currentUser.uid}/post-thumbnails`;
    const thumbnailUrl = await uploadFile(postData.pendingFile, securePath);
    let blurDataURL = postData.blurDataURL;

    if (postData.needsServerBlur) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? { ...p, thumbnail: thumbnailUrl, isUploadingHeic: false }
            : p
        )
      );
      blurDataURL = await fetchServerBlur(thumbnailUrl);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === tempId ? { ...p, blurDataURL: blurDataURL || "" } : p
        )
      );
    }

    await createPost({
      title: postData.title,
      description: postData.description,
      thumbnail: thumbnailUrl,
      blurDataURL: blurDataURL || "",
      content_type: postData.content_type,
      content: postData.content,
      page_id: page.id,
      order_index: newOrderIndex,
      clientId: clientId,
    });
  },
  onRollback: () => {
    setPosts((prev) => prev.filter((p) => p.id !== tempId));
    alert("Failed to create post.");
  },
});

};

const handleEditPost = async (postData) => {
if (!isOwner || !editingPost) return;
const targetId = editingPost.id;
setEditingPost(null);
const previousPosts = [...posts];

code
Code
download
content_copy
expand_less
const optimisticPost = {
  ...editingPost,
  title: postData.title,
  description: postData.description,
  blurDataURL: postData.blurDataURL || editingPost.blurDataURL,
  order_index: postData.order_index,
  isOptimistic: true,
  isUploadingHeic: postData.needsServerBlur && postData.pendingFile,
};

setPosts((currentPosts) => {
  const updatedList = currentPosts.map((p) =>
    p.id === targetId ? optimisticPost : p
  );
  return updatedList.sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );
});

addToQueue({
  actionFn: async () => {
    let thumbnailUrl = postData.thumbnail;
    let blurDataURL = postData.blurDataURL;

    if (postData.pendingFile) {
      const securePath = `users/${currentUser.uid}/post-thumbnails`;
      thumbnailUrl = await uploadFile(postData.pendingFile, securePath);
      if (postData.needsServerBlur) {
        blurDataURL = await fetchServerBlur(thumbnailUrl);
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.id === targetId
            ? {
                ...p,
                thumbnail: thumbnailUrl,
                blurDataURL: blurDataURL || "",
                isUploadingHeic: false,
              }
            : p
        )
      );
    }

    const { pendingFile, needsServerBlur, ...cleanPostData } = postData;
    await updatePost(
      targetId,
      {
        ...cleanPostData,
        thumbnail: thumbnailUrl,
        blurDataURL: blurDataURL || "",
      },
      previousPosts
    );
  },
  onRollback: () => {
    setPosts(previousPosts);
    alert("Failed to update post.");
  },
});

};

const handleDeletePost = async (postData) => {
if (!isOwner || !page) return;
if (postData.isOptimistic || postData.id?.startsWith("temp-")) {
setPosts((currentPosts) =>
currentPosts.filter((p) => p.id !== postData.id)
);
return;
}

code
Code
download
content_copy
expand_less
const previousPosts = [...posts];
deletedIdsRef.current.add(postData.id);
setPosts((currentPosts) =>
  currentPosts.filter((p) => p.id !== postData.id)
);

addToQueue({
  actionFn: async () => {
    await deletePost(postData);
  },
  onRollback: () => {
    deletedIdsRef.current.delete(postData.id);
    setPosts(previousPosts);
    alert("Something went wrong. The post could not be deleted.");
  },
});

};

// SIMPLIFICATION 2: Removed redundant spread [...posts]
// posts is already an array in state; copying it is unnecessary for read-only ops.
const currentIndex = posts.findIndex(
(p) => p.id === selectedPostForModal?.id
);

const handleNextPost = () => {
if (currentIndex >= posts.length - 1) return;
setSelectedPostForModal(posts[currentIndex + 1]);
};

const handlePreviousPost = () => {
if (currentIndex <= 0) return;
setSelectedPostForModal(posts[currentIndex - 1]);
};

const nextPost =
currentIndex >= 0 && currentIndex < posts.length - 1
? posts[currentIndex + 1]
: null;
const previousPost = currentIndex > 0 ? posts[currentIndex - 1] : null;

return (
<>
<div
className="p-0 md:px-6 pt-0 pb-0 min-h-screen w-full"
style={{
backgroundColor: hexToRgba(activeBackHex, 0.5),
opacity: isSynced && !debugOverlay ? 1 : 0,
pointerEvents: isSynced && !debugOverlay ? "auto" : "none",
}}
>
<div className="sticky top-0 left-0 right-0 z-20 pt-[0px] px-0 bg-gray-100 shadow-md">
<div className="">
<div
className="flex items-center justify-center md:justify-start text-2xl font-bold h-[47px] pt-4 pb-3 text-white px-9 "
style={{
backgroundColor: activeDashHex || "#ffffff",
color: lighten(activeDashHex, 240) || "#000000",
}}
>
{page ? page.title : <TitleSkeleton />}
{isSyncing && (
<span className="absolute right-4 bottom-2 text-xs ml-4 opacity-70 font-normal">
Saving changes...
</span>
)}
</div>
</div>
</div>

code
Code
download
content_copy
expand_less
<div
      className="w-full px-4 md:px-5  py-3 shadow-sm"
      style={{
        backgroundColor: hexToRgba(activeBackHex, 1),
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="w-full">
          <PageInfoEditor
            pid={page?.id}
            canEdit={isOwner}
            editOn={editOn}
            initialData={initialInfoTexts?.infoText1}
            index={1}
          />
        </div>
      </div>
    </div>

    <div
      ref={topInfoRef}
      className="sticky z-10 w-full h-[4px] shadow-sm"
      style={{
        backgroundColor: lighten(activeDashHex, 30) || "#ffffff",
        top: "47px",
      }}
    />
    <div
      className="sticky z-10 w-full h-[7px] shadow-sm"
      style={{
        backgroundColor: activeDashHex || "#ffffff",
        top: "51px",
      }}
    />

    <div
      className="w-full min-h-screen px-4 md:px-5 pt-14 pb-0 shadow-xl"
      style={{
        backgroundColor: hexToRgba(activeBackHex, 1),
      }}
    >
      <div className="max-w-7xl mx-auto ">
        {/* SIMPLIFICATION 3: Removed dead "loadingPosts" branch */}
        {posts.length === 0 ? (
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold text-neumorphic mb-0">
              This page is empty
            </h3>
            {isOwner && (
              <p className="text-neumorphic-text mb-0">
                Create your first post to get started.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 px-2 lg:grid-cols-5 xl:grid-cols-5 gap-3">
            {posts.map((post, index) => (
              <div
                key={post.id}
                onClick={() => setSelectedPostForModal(post)}
                className="cursor-pointer"
              >
                <PostCard
                  post={post}
                  isOwner={isOwner}
                  editModeOn={editOn}
                  pageSlug={params.pageSlug}
                  onEdit={() => setEditingPost(post)}
                  onDelete={() => handleDeletePost(post)}
                  index={index}
                />
              </div>
            ))}
          </div>
        )}

        <div className="w-full mt-10">
          <PageInfoEditor
            pid={page?.id}
            canEdit={isOwner}
            editOn={editOn}
            initialData={initialInfoTexts?.infoText2}
            index={2}
          />
        </div>
        <div className="p-6 min-h-[50dvh]"></div>

        <PhotoShowModal
          post={selectedPostForModal}
          onOff={!!selectedPostForModal}
          onClose={() => setSelectedPostForModal(null)}
          onNext={handleNextPost}
          onPrevious={handlePreviousPost}
          hasNext={currentIndex < posts.length - 1}
          hasPrevious={currentIndex > 0}
          nextPost={nextPost}
          previousPost={previousPost}
        />

        {/* SIMPLIFICATION 4: Consolidated Modals */}
        {(isOwner || isPublic) && (
          <CreatePostModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreatePost}
          />
        )}

        {isOwner && (
          <EditPostModal
            isOpen={!!editingPost}
            post={editingPost}
            onClose={() => setEditingPost(null)}
            onSubmit={handleEditPost}
          />
        )}

        {usernameTag && (
          <Link
            href={`/${usernameTag}`}
            onClick={handleBackClick}
            prefetch={true}
          >
            <ActionButton
              title="Back"
              className="fixed bottom-6 left-6 md:left-10 z-[100]"
            >
              <ArrowLeft className="w-5 h-5" />
            </ActionButton>
          </Link>
        )}

        <div className="fixed bottom-6 right-6 md:right-10 z-[100] flex flex-wrap items-center gap-3">
          <ActionButton
            onClick={() => setDebugOverlay(!debugOverlay)}
            active={debugOverlay}
            title="Toggle Loading Overlay"
          >
            <Eye className="w-5 h-5" />
            <span className="hidden md:inline">Dev Overlay</span>
          </ActionButton>

          {/* SIMPLIFICATION 5: Simplified Conditional Button Rendering */}
          {(isOwner || isPublic) && (
            <ActionButton onClick={() => setShowCreateModal(true)}>
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New post</span>
            </ActionButton>
          )}

          {isOwner && (
            <>
              <ActionButton
                onClick={() => setEditOn(!editOn)}
                active={editOn}
                title="Toggle edit mode"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                  />
                </svg>
                <span className="hidden md:inline">Edit</span>
              </ActionButton>

              <div className="hidden sm:inline">
                <ActionButton
                  onClick={() => {
                    return;
                  }}
                  title="Email"
                >
                  <UserIcon className="w-5 h-5" />
                  <span className="text-sm">{currentUser?.email}</span>
                </ActionButton>
              </div>

              <ActionButton onClick={handleLogout} title="Log out">
                <LogOut className="w-5 h-5" />
              </ActionButton>
            </>
          )}
        </div>
      </div>
    </div>
  </div>

  {(!isSynced || debugOverlay) && (
    <LoadingOverlay
      activeDashHex={activeDashHex}
      activeBackHex={activeBackHex}
      pageTitle={page?.title || ""}
      skeletonCount={page?.postCount || 0}
      previewBlurs={overlayBlurs}
    />
  )}
</>

);
}

function LoadingOverlay({
activeDashHex,
activeBackHex,
pageTitle,
skeletonCount,
previewBlurs,
}) {
return (
<div
className="fixed inset-0 z-[9999] p-0 md:px-6 pt-0 pb-0 min-h-screen w-full overflow-hidden"
style={{
backgroundColor: hexToRgba(activeBackHex, 0.5),
}}
>
<div className="sticky top-0 left-0 right-0 z-10 pt-[0px] px-0 bg-gray-100 shadow-md">
<div className="">
<div
className="flex items-center justify-center md:justify-start text-2xl font-bold h-[47px] pt-4 pb-3 text-white px-9"
style={{
backgroundColor: activeDashHex,
color: lighten(activeDashHex, 240) || "#000000",
}}
>
{pageTitle || (
<div className="h-8 w-48 bg-white/20 rounded-md animate-pulse" />
)}
</div>
</div>
</div>

code
Code
download
content_copy
expand_less
<div
    className="sticky z-10 w-full h-[4px] shadow-sm"
    style={{
      backgroundColor: lighten(activeDashHex, 30) || "#ffffff",
      top: "47px",
    }}
  />
  <div
    className="sticky z-10 w-full h-[7px] shadow-sm"
    style={{
      backgroundColor: activeDashHex || "#ffffff",
      top: "51px",
    }}
  />

  <div
    className="min-h-screen px-4 md:px-5 pt-[31px] pb-0 shadow-xl"
    style={{
      backgroundColor: hexToRgba(activeBackHex, 1),
    }}
  >
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 px-2 lg:grid-cols-5 xl:grid-cols-5 gap-3">
        {Array.from({ length: Math.max(skeletonCount, 4) }).map((_, i) => (
          <PostSkeleton
            key={i}
            blurDataURL={previewBlurs[i] || ""}
            aspect="4/3"
          />
        ))}
      </div>
    </div>
  </div>
</div>

);
}

//PageInfoEditor.js.

// components/dashboard/PageInfoEditor.jsx
import React, { useEffect, useState, useRef } from "react";
import { listenUserPage, saveUserPage } from "@/lib/data";

export default function PageInfoEditor({
pid,
canEdit = false,
editOn = true,
initialData = "",
index,
}) {
const [text, setText] = useState(initialData);
const [serverText, setServerText] = useState(initialData);

const [loading, setLoading] = useState(
!initialData && initialData !== "" && !!pid
);
const [saving, setSaving] = useState(false);
const [error, setError] = useState(null);
const saveTimer = useRef(null);

// ------------------------------------------------------------------
// STYLES
// ------------------------------------------------------------------
const structuralStyles =
"col-start-1 row-start-1 w-full p-3 text-base leading-relaxed font-sans rounded-md break-words whitespace-pre-wrap outline-none resize-none overflow-hidden";

const transitionStyles =
"transition-[background-color,border-color,box-shadow] duration-100 ease-in-out";

useEffect(() => {
let unsub;
async function init() {
if (!pid) {
setLoading(false);
return;
}
try {
unsub = listenUserPage(pid, (data) => {
let remote;
if (index == 1) {
remote = data?.infoText1 ?? "";
} else if (index == 2) {
remote = data?.infoText2 ?? "";
}
setServerText(remote);
setText((prev) => (prev === serverText ? remote : prev));
setLoading(false);
});
} catch (err) {
console.error("Error loading dashboard info:", err);
}
}
init();
return () => {
if (unsub) unsub();
};
}, [pid]);

useEffect(() => {
if (!pid || !canEdit) return;
if (saveTimer.current) clearTimeout(saveTimer.current);
saveTimer.current = setTimeout(() => {
handleSave();
}, 1500);
return () => clearTimeout(saveTimer.current);
}, [text, pid, canEdit]);

async function handleSave() {
if (!pid || !canEdit) return;
if (text === serverText) return;
setSaving(true);
setError(null);
try {
await saveUserPage(pid, text, index);
setServerText(text);
} catch (err) {
console.error("Failed to save dashboard info:", err);
setError("Failed to save. Try again.");
} finally {
setSaving(false);
}
}

const isEditing = canEdit && editOn;
const displayContent = text || serverText || (
<span className="invisible"> </span>
);

const showSkeleton = loading && !text && !initialData;

return (
<section className="w-full block">
<div className="relative grid grid-cols-1 w-full min-h-[24px]">
{showSkeleton ? (
<div
className={${structuralStyles} animate-pulse ${ isEditing ? "bg-white/70 border-gray-300 text-transparent" : "bg-neutral-200/30 border-transparent text-gray-800 shadow-sm" }}
>
 
</div>
) : (
<>
<div
className={${structuralStyles} ${transitionStyles} ${ isEditing ? "bg-white/70 border-gray-300 text-transparent" : "bg-neutral-200/30 border-transparent text-gray-800 shadow-sm" }}
aria-hidden={isEditing}
>
{displayContent}
</div>

code
Code
download
content_copy
expand_less
<textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter page info..."
          readOnly={!isEditing}
          className={`
            ${structuralStyles}
            absolute inset-0 z-10
            bg-transparent border-transparent text-gray-800
            focus:ring-2 focus:ring-blue-100/50
            ${
              isEditing
                ? "opacity-100 visible"
                : "opacity-0 invisible pointer-events-none"
            }
          `}
        />

        <div
          className={`
            absolute bottom-2 right-2 z-20 pointer-events-none transition-opacity duration-200
            ${isEditing ? "opacity-100" : "opacity-0"}
          `}
        >
          <label className="text-xs text-neutral-500 font-medium bg-white/90 px-1.5 py-0.5 rounded shadow-sm border border-neutral-100">
            {saving
              ? "Saving..."
              : error ?? (text === serverText ? "Saved" : "Unsaved")}
          </label>
        </div>
      </>
    )}
  </div>
</section>

);
}

//DashboardViewClient.js

// components/dashboard/DashboardViewClient.js
"use client";

import React, {
useState,
useEffect,
useCallback,
useRef,
useTransition,
} from "react";
import DashHeader from "@/components/dashboard/DashHeader";
import DashboardInfoEditor from "@/components/dashboard/DashboardInfoEditor";
import { useAuth } from "@/context/AuthContext";
import { Plus, LogOut, User as UserIcon } from "lucide-react";
import PageCard from "@/components/dashboard/PageCard";
import CreatePageModal from "@/components/dashboard/CreatePageModal";
import EditPageModal from "@/components/dashboard/EditPageModal";
// 1. Next.js Navigation Hooks
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { hexToRgba } from "@/components/dashboard/DashHeader";
import { useTheme } from "@/context/ThemeContext";

import ActionButton from "@/components/ActionButton";

import { useQueue } from "@/lib/useQueue";

import {
createPage,
deletePage,
updatePage,
uploadFile,
updateUserColours,
reindexPages,
reconcilePageCount,
} from "@/lib/data";
import { fetchServerBlur } from "@/lib/processImage";

const PageSkeleton = () => (

  <div className="w-full h-48 bg-gray-200/50 rounded-xl animate-pulse shadow-sm" />
);


export default function DashboardViewClient({
profileUser, // Data passed from server
initialPages, // Data passed from server
}) {
const { user: currentUser, logout, loading: authLoading } = useAuth();
const router = useRouter();

// 1. Grab themeState so we can check for fresh colors
const { updateTheme, themeState } = useTheme();

// 2. Initialize URL hooks
const searchParams = useSearchParams();
const pathname = usePathname();
const [isPending, startTransition] = useTransition();

const [pages, setPages] = useState(initialPages);

const handleQueueEmpty = useCallback(async () => {
console.log("Queue is empty, reindexing pages...");
if (pagesRef.current?.length) {
await reindexPages(pagesRef.current);
}

code
Code
download
content_copy
expand_less
// Reconcile pageCount to ensure it matches actual pages in database
if (currentUser?.uid) {
  await reconcilePageCount(currentUser.uid);
}

}, [currentUser?.uid]);

const { addToQueue, isSyncing } = useQueue(handleQueueEmpty);

const pagesRef = useRef(initialPages);
useEffect(() => {
pagesRef.current = pages;
}, [pages]);

const deletedIdsRef = useRef(new Set());

const [loading, setLoading] = useState(false);

// UI State
const [showCreateModal, setShowCreateModal] = useState(false);
const [editingPage, setEditingPage] = useState(null);

// 3. Initialize editOn based on presence of ANY 'edit' param
const [editOn, setEditOn] = useState(searchParams.has("edit"));

const isOwner =
currentUser && profileUser && currentUser.uid === profileUser.uid;

// ---------------------------------------------------------
// COLOR STATE INITIALIZATION FIX
// ---------------------------------------------------------

// Helper: Check if Context has fresh data for THIS user (Active Session)
const useLiveContext = themeState.uid === profileUser?.uid;

// If Context has data, use it (Live). Otherwise, fall back to Server Prop (Stale).
const [dashHex, setDashHex] = useState(
useLiveContext && themeState.dashHex
? themeState.dashHex
: profileUser?.dashboard?.dashHex || "#000000"
);

const [backHex, setBackHex] = useState(
useLiveContext && themeState.backHex
? themeState.backHex
: profileUser?.dashboard?.backHex || "#F4F4F5"
);

// ---------------------------------------------------------
// SYNC EFFECTS
// ---------------------------------------------------------

// Handle Dash Hex Changes
useEffect(() => {
// A. Sync to Global Context immediately so PageClientView sees it instantly
if (profileUser?.uid) {
updateTheme(profileUser.uid, dashHex, backHex);
}

code
Code
download
content_copy
expand_less
// B. Stop if the state matches the Server Data (Prevent Loop)
if (dashHex === profileUser?.dashboard?.dashHex) return;

// C. Debounce the Database Save
const handler = setTimeout(async () => {
  if (profileUser?.uid) {
    await updateUserColours(profileUser.uid, "dashboard.dashHex", dashHex);

    // FIX: Wrap refresh in startTransition to prevent loading screen
    startTransition(() => {
      router.refresh();
    });
  }
}, 1000);

return () => clearTimeout(handler);

}, [dashHex, backHex, profileUser, router, updateTheme]);

// Handle Back Hex Changes
useEffect(() => {
// A. Sync Context
if (profileUser?.uid) {
updateTheme(profileUser.uid, dashHex, backHex);
}

code
Code
download
content_copy
expand_less
// B. Safety Check
if (backHex === profileUser?.dashboard?.backHex) return;

// C. Debounce Save
const handler = setTimeout(async () => {
  if (profileUser?.uid) {
    await updateUserColours(profileUser.uid, "dashboard.backHex", backHex);

    // FIX: Wrap refresh in startTransition to prevent loading screen
    startTransition(() => {
      router.refresh();
    });
  }
}, 1000);

return () => clearTimeout(handler);

}, [backHex, dashHex, profileUser, router, updateTheme]);

// 4. Sync State with URL (Handles Back/Forward buttons)
useEffect(() => {
// Because we use window.history in toggleEditMode, we don't need complex locking.
// This simply listens for browser Back/Forward navigation.
setEditOn(searchParams.has("edit"));
}, [searchParams]);

// // 4. Sync State with URL (Handles Back/Forward buttons)
// // useEffect(() => {
// //   setEditOn(searchParams.has("edit"));
// // }, [searchParams]);

// // 2. NEW: Add a Ref to track your "Optimistic Intent"
// // This tracks what we WANT the state to be, ignoring the URL for a moment
// const optimisticEditMode = useRef(null);

// // 3. FIXED: Update the Sync Effect to respect your manual toggle
// useEffect(() => {
//   const urlHasEdit = searchParams.has("edit");

//   // If we have a pending manual change (in the Ref)
//   if (optimisticEditMode.current !== null) {
//     // If the URL hasn't caught up to our intent yet, STOP.
//     // Don't let the stale URL overwrite our local state.
//     if (optimisticEditMode.current !== urlHasEdit) {
//       return;
//     }
//     // If they match, the URL has caught up! We can clear the lock.
//     optimisticEditMode.current = null;
//   }

//   // Otherwise, sync normally (handles Browser Back/Forward buttons)
//   setEditOn(urlHasEdit);
// }, [searchParams]);

// IMPORTANT: Reconcile server pages with optimistic local state
useEffect(() => {
const serverIds = new Set(initialPages.map((p) => p.id));

code
Code
download
content_copy
expand_less
// Clean up deleted IDs that the server no longer knows about
deletedIdsRef.current.forEach((id) => {
  if (!serverIds.has(id)) {
    deletedIdsRef.current.delete(id);
  }
});

setPages((currentLocalPages) => {
  // 1. Filter out deleted pages from server data
  const validServerPages = initialPages.filter(
    (p) => !deletedIdsRef.current.has(p.id)
  );

  // 2. Extract optimistic pages (new/editing/reordering)
  const optimisticPages = currentLocalPages.filter((p) => p.isOptimistic);

  // 3. Index server pages by clientId for reconciliation
  const serverPagesByClientId = new Map();
  validServerPages.forEach((p) => {
    if (p.clientId) {
      serverPagesByClientId.set(p.clientId, p);
    }
  });

  // 4. Build merged list - prefer server versions when they exist
  const merged = [];
  const addedClientIds = new Set();
  const addedIds = new Set();

  // Add all server pages (these are the source of truth)
  validServerPages.forEach((serverPage) => {
    merged.push(serverPage);
    if (serverPage.clientId) {
      addedClientIds.add(serverPage.clientId);
    }
    addedIds.add(serverPage.id);
  });

  // 5. Add optimistic pages that haven't been confirmed by server yet
  optimisticPages.forEach((optPage) => {
    const hasServerVersion =
      optPage.clientId && addedClientIds.has(optPage.clientId);
    const existsById = addedIds.has(optPage.id);

    // Only add if server doesn't have this page yet
    if (!hasServerVersion && !existsById) {
      merged.push(optPage);
    }
  });

  // 6. Sort by order_index for stable display
  return merged.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
});

}, [initialPages]);

const handleLogout = async () => {
try {
await logout();
router.push("/login");
} catch (error) {
console.error("Failed to log out:", error);
}
};

// const toggleEditMode = () => {
//   const isCurrentlyEditing = searchParams.has("edit");

//   // Update local state immediately for responsiveness
//   setEditOn(!isCurrentlyEditing);

//   const currentParams = new URLSearchParams(searchParams.toString());

//   if (isCurrentlyEditing) {
//     // Turn OFF: remove the param entirely
//     currentParams.delete("edit");
//   } else {
//     // Turn ON: set to 'true' (General Edit Mode)
//     currentParams.set("edit", "true");
//   }

//   router.replace(${pathname}?${currentParams.toString()}, {
//     scroll: false,
//   });
// };

// const toggleEditMode = () => {
//   // Calculate the new state based on local state (Client Truth)
//   const shouldBeEditing = !editOn;

//   // A. Lock the effect: Tell it we expect this specific state
//   optimisticEditMode.current = shouldBeEditing;

//   // B. Update UI immediately
//   setEditOn(shouldBeEditing);

//   // C. Perform the navigation
//   const currentParams = new URLSearchParams(searchParams.toString());
//   if (shouldBeEditing) {
//     currentParams.set("edit", "true");
//   } else {
//     currentParams.delete("edit");
//   }

//   router.replace(${pathname}?${currentParams.toString()}, {
//     scroll: false,
//   });
// };

const toggleEditMode = () => {
// 1. Calculate new state locally
const shouldBeEditing = !editOn;

code
Code
download
content_copy
expand_less
// 2. Update UI immediately
setEditOn(shouldBeEditing);

// 3. Construct the new URL parameters
const currentParams = new URLSearchParams(searchParams.toString());
if (shouldBeEditing) {
  currentParams.set("edit", "true");
} else {
  currentParams.delete("edit");
}

// 4. Update URL silently (Prevents loading.js and race conditions)
const newUrl = `${pathname}?${currentParams.toString()}`;
window.history.replaceState(null, "", newUrl);

};

const handleCreatePage = async (pageData) => {
if (!isOwner || !profileUser) return;

code
Code
download
content_copy
expand_less
setShowCreateModal(false);

const clientId = crypto.randomUUID();
const tempId = `temp-${Date.now()}`;

const currentList = pagesRef.current;

const maxOrder =
  currentList.length > 0
    ? Math.max(...currentList.map((p) => p.order_index || 0))
    : 0;
const newOrderIndex = maxOrder + 1;

// Generate a temporary slug for the optimistic page
const tempSlug = `temp-${pageData.title
  .toLowerCase()
  .trim()
  .replace(/\s+/g, "-")
  .replace(/[^\w-]+/g, "")
  .replace(/--+/g, "-")}-${Date.now()}`;

// Optimistic page
const optimisticPage = {
  id: tempId,
  title: pageData.title,
  description: pageData.description,
  thumbnail: "", // Empty until upload completes
  blurDataURL: pageData.blurDataURL || "", // Empty for HEIC
  userId: currentUser.uid,
  slug: tempSlug, // Temporary slug for PageCard link
  order_index: newOrderIndex,
  created_date: new Date(),
  isOptimistic: true,
  clientId: clientId,
  isPrivate: pageData.isPrivate || false,
  isPublic: pageData.isPublic || false,
  isUploadingHeic: pageData.needsServerBlur,
};

// Update ref and state immediately
pagesRef.current = [...currentList, optimisticPage];
setPages(pagesRef.current);

// Queue the upload + blur fetch (if needed) + create operation
addToQueue({
  type: "create",
  actionFn: async () => {
    // Step 1: Upload the file
    const securePath = `users/${currentUser.uid}/page-thumbnails`;
    const thumbnailUrl = await uploadFile(pageData.pendingFile, securePath);

    // Step 2: Get blur (either from postData or fetch from server for HEIC)
    let blurDataURL = pageData.blurDataURL;

    if (pageData.needsServerBlur) {
      // Update optimistic page to show blur is being generated
      setPages((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? { ...p, thumbnail: thumbnailUrl, isUploadingHeic: false }
            : p
        )
      );

      blurDataURL = await fetchServerBlur(thumbnailUrl);

      // Update optimistic post with blur
      setPages((prev) =>
        prev.map((p) =>
          p.id === tempId ? { ...p, blurDataURL: blurDataURL || "" } : p
        )
      );
    }

    // Step 3: Create the page in database
    await createPage({
      title: pageData.title,
      description: pageData.description,
      thumbnail: thumbnailUrl,
      blurDataURL: blurDataURL || "",
      userId: currentUser.uid,
      order_index: newOrderIndex,
      clientId: clientId,
      isPrivate: pageData.isPrivate || false,
      isPublic: pageData.isPublic || false,
    });
  },
  onRollback: () => {
    setPages((prev) => prev.filter((p) => p.id !== tempId));
    alert("Failed to create page.");
  },
});

};

const handleEditPage = async (pageData) => {
if (!isOwner || !editingPage) return;

code
Code
download
content_copy
expand_less
const targetId = editingPage.id;
setEditingPage(null);

const previousPages = [...pages];

// Optimistic update
const optimisticPage = {
  ...editingPage,
  title: pageData.title,
  description: pageData.description,
  blurDataURL: pageData.blurDataURL || editingPage.blurDataURL,
  order_index: pageData.order_index,
  isPrivate: pageData.isPrivate,
  isPublic: pageData.isPublic,
  isOptimistic: true,
  isUploadingHeic: pageData.needsServerBlur && pageData.pendingFile,
};

setPages((currentPages) => {
  const updatedList = currentPages.map((p) =>
    p.id === targetId ? optimisticPage : p
  );
  return updatedList.sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );
});

addToQueue({
  actionFn: async () => {
    let thumbnailUrl = pageData.thumbnail;
    let blurDataURL = pageData.blurDataURL;

    // If there's a new image to upload
    if (pageData.pendingFile) {
      const securePath = `users/${currentUser.uid}/page-thumbnails`;
      thumbnailUrl = await uploadFile(pageData.pendingFile, securePath);

      if (pageData.needsServerBlur) {
        blurDataURL = await fetchServerBlur(thumbnailUrl);
      }

      // Update optimistic page with real thumbnail
      setPages((prev) =>
        prev.map((p) =>
          p.id === targetId
            ? {
                ...p,
                thumbnail: thumbnailUrl,
                blurDataURL: blurDataURL || "",
                isUploadingHeic: false,
              }
            : p
        )
      );
    }

    // IMPORTANT: Remove non-serializable fields before sending to Firestore
    const { pendingFile, needsServerBlur, ...cleanPageData } = pageData;

    await updatePage(
      targetId,
      {
        ...cleanPageData,
        thumbnail: thumbnailUrl,
        blurDataURL: blurDataURL || "",
      },
      previousPages
    );
  },
  onRollback: () => {
    setPages(previousPages);
    alert("Failed to update page.");
  },
});

};

const handleDeletePage = async (pageData) => {
if (!isOwner || !profileUser) return;

code
Code
download
content_copy
expand_less
if (
  !confirm(
    "Are you sure you want to delete this page? This cannot be undone."
  )
) {
  return;
}

// Don't try to delete optimistic posts from Firestore
if (pageData.isOptimistic || pageData.id?.startsWith("temp-")) {
  setPages((currentPages) =>
    currentPages.filter((p) => p.id !== pageData.id)
  );
  return;
}

// 2. Snapshot for rollback
const previousPages = [...pages];

// 3. Mark as deleted optimistically
deletedIdsRef.current.add(pageData.id);

// 4. Remove immediately from UI
setPages((currentPages) =>
  currentPages.filter((p) => p.id !== pageData.id)
);

// 5. Queue the actual delete
addToQueue({
  actionFn: async () => {
    await deletePage(pageData);
  },
  onRollback: () => {
    deletedIdsRef.current.delete(pageData.id);
    setPages(previousPages);
    alert("Something went wrong. The page could not be deleted.");
  },
});

};

// ------------------------------------------------------------------
// RENDER
// ------------------------------------------------------------------

if (!profileUser) {
return (
<div className="flex flex-col items-center justify-center min-h-[50vh] text-neumorphic">
<div className="text-xl">Loading or User not found...</div>
</div>
);
}

return (
<>
<div
className="min-h-[100dvh]"
style={{
backgroundColor: hexToRgba(backHex, 1),
}}
>
{/* FIXED HEADER */}
<div className=" fixed top-0 left-0 right-0 z-20 pt-2 px-0">
<DashHeader
profileUser={profileUser}
alpha={1}
editTitleOn={editOn} // Passes true if param is 'true' OR 'title'
dashHex={dashHex}
isSyncing={isSyncing}
/>
</div>

code
Code
download
content_copy
expand_less
{/* CONTENT AREA */}
    <div className="pt-6">
      <div className="min-h-[100px] sm:min-h-[120px]"></div>

      {/* Bio / Info Editor */}
      <div className="max-w-8xl mx-auto">
        <div className="flex">
          <div className="w-full ml-7 mr-9">
            <DashboardInfoEditor
              uid={profileUser.uid}
              canEdit={isOwner}
              editOn={editOn}
              initialData={profileUser.dashboard?.infoText || "Add info..."}
            />
          </div>
        </div>
      </div>
    </div>

    {/* STICKY HEADER 2 */}
    <div className="sticky  top-[-2px] left-0 right-0 z-10 pt-3 px-0">
      <DashHeader
        title={""}
        alpha={1}
        profileUser={profileUser}
        editColOn={editOn}
        heightShort={true}
        dashHex={dashHex}
        setDashHex={setDashHex}
        backHex={backHex}
        setBackHex={setBackHex}
      />
    </div>

    {/* PAGES GRID */}
    <div className="p-3 md:p-6">
      {loading || pages.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
          {pages.length === 0 && !loading && !isOwner ? (
            <div className="text-center py-16 w-full col-span-full">
              <h3 className="text-xl font-semibold text-neumorphic">
                No public pages.
              </h3>
            </div>
          ) : (
            [1, 2, 3, 4, 5, 6, 7, 8].map((i) => <PageSkeleton key={i} />)
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-5">
          {pages
            .filter((page) => {
              // Client-side filtering: only show private pages if user is owner
              if (page.isPrivate && !isOwner) {
                return false;
              }
              return true;
            })
            .map((page, index) => (
              <PageCard
                key={page.id}
                page={page}
                isOwner={isOwner}
                editModeOn={editOn}
                usernameTag={profileUser.usernameTag}
                onDelete={() => handleDeletePage(page)}
                onEdit={() => setEditingPage(page)}
                index={index}
                allPages={pages}
                profileUser={profileUser}
              />
            ))}
        </div>
      )}
    </div>
    {/* Scroll Spacer */}

    <div className="p-6 min-h-[50vh]"></div>

    {/* BUTTONS & MODALS */}
    {authLoading ? (
      /* ---------- Auth Loading (non-interactive) ---------- */
      <div
        className="fixed bottom-6 right-6 z-[100]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center gap-2 h-[44px] px-4 rounded-sm bg-black/30 text-zinc-300 backdrop-blur-[1px] border border-white/10 opacity-60 pointer-events-none">
          <UserIcon className="w-5 h-5" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    ) : isOwner ? (
      /* ---------- Owner Controls ---------- */
      <div
        className="fixed bottom-6 right-6 z-[100] flex flex-wrap items-center gap-3"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* New Page (only when edit mode is ON) */}
        {editOn && (
          <ActionButton onClick={() => setShowCreateModal(true)}>
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Page</span>
          </ActionButton>
        )}

        {/* Edit Toggle */}
        <ActionButton onClick={toggleEditMode} active={editOn}>
          <span className="">
            {/* pencil icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
              />
            </svg>
          </span>
          <span className="hidden md:inline">Edit</span>
        </ActionButton>

        {/* Desktop-only user badge */}
        <div className="hidden sm:inline">
          <ActionButton
            onClick={() => {
              return;
            }}
            title="Email"
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-sm">{currentUser?.email}</span>
          </ActionButton>
        </div>

        {/* Logout */}
        <ActionButton onClick={handleLogout} title="Log out">
          <LogOut className="w-5 h-5" />
        </ActionButton>
      </div>
    ) : (
      /* ---------- Logged-out View ---------- */
      <div
        className="fixed bottom-6 right-6 z-[100] flex items-center gap-3"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ActionButton onClick={() => router.push("/")}>
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Create your collection</span>
        </ActionButton>

        <ActionButton onClick={() => router.push("/login")}>
          <UserIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Login</span>
        </ActionButton>
      </div>
    )}

    {/* MODALS */}
    {isOwner && (
      <>
        <CreatePageModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePage}
        />
        <EditPageModal
          isOpen={!!editingPage}
          page={editingPage}
          onClose={() => setEditingPage(null)}
          onSubmit={handleEditPage}
        />
      </>
    )}
  </div>
</>

);
}

//DashboardInfoEdit.js

// components/dashboard/DashboardInfoEditor.jsx
import React, { useEffect, useState, useRef } from "react";
import {
fetchUserDashboard,
listenUserDashboard,
saveUserDashboard,
} from "@/lib/data"; // adjust path to match your project

/**

Props:

uid: string | null  -> the target user's uid whose dashboard info we should show

canEdit: boolean    -> whether to show editor UI (defaults to false)
*/
export default function DashboardInfoEditor({
uid,
canEdit = false,
editOn = true,
initialData = "",
}) {
// 1. Initialize with Server Data immediately
// The page loads with content already present. No "Loading..." state needed.
const [text, setText] = useState(initialData);
const [serverText, setServerText] = useState(initialData);

// Start loading as false if we have data
const [loading, setLoading] = useState(!initialData && !!uid);
const [saving, setSaving] = useState(false);
const [error, setError] = useState(null);
const saveTimer = useRef(null);
//   const [editOn, setEditOn] = useState(false);

useEffect(() => {
let unsub;

code
Code
download
content_copy
expand_less
async function init() {
  if (!uid) {
    setLoading(false);
    return;
  }

  setLoading(true);

  try {
    // 2) Simply subscribe for live updates (Realtime Listener)
    unsub = listenUserDashboard(uid, (data) => {
      const remote = data?.infoText ?? "";
      setServerText(remote);

      // Only update local text if the user hasn't started typing yet
      // (Compares against the previous server version)
      setText((prev) => (prev === serverText ? remote : prev));
      setLoading(false);
    });
  } catch (err) {
    console.error("Error connecting to dashboard listener:", err);
  }
}

init();

return () => {
  if (unsub) unsub();
};
// eslint-disable-next-line react-hooks/exhaustive-deps

}, [uid]);

// autosave when editable
useEffect(() => {
if (!uid || !canEdit) return;
if (saveTimer.current) clearTimeout(saveTimer.current);
saveTimer.current = setTimeout(() => {
handleSave();
}, 1500);
return () => clearTimeout(saveTimer.current);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [text, uid, canEdit]);

async function handleSave() {
if (!uid || !canEdit) return;
if (text === serverText) return;
setSaving(true);
setError(null);
try {
// we pass editor uid as null here — server rules will enforce auth; if you want to pass editor id,
// call saveUserDashboard(uid, text, currentUser.uid) from the caller or grab auth here.
await saveUserDashboard(uid, text, null);
setServerText(text);
} catch (err) {
console.error("Failed to save dashboard info:", err);
setError("Failed to save. Try again.");
} finally {
setSaving(false);
}
}

return (
<section className="mb-3 mt-[-15px]">
{/* Optimization: Only show "Loading" if we truly have NO data.
Since we passed initialData, this skeleton rarely shows, eliminating the flicker.
*/}
{loading && !text ? (
<div className="text-sm text-muted animate-pulse">Loading info...</div>
) : canEdit ? (
editOn ? (
// ... Your existing Edit Mode UI ...
<div className="relative">
<textarea
value={text}
onChange={(e) => setText(e.target.value)}
rows={5}
className="w-full p-3 border rounded-md resize-none"
placeholder="Write something for your dashboard..."
/>
<div className="absolute bottom-4 right-3">
<label className="flex items-center gap-2 text-sm text-neutral-600">
{saving
? "Saving..."
: error ??
(text === serverText ? "Saved" : "Unsaved changes")}
</label>
</div>
</div>
) : (
// ... Your existing Preview Mode UI ...
<div className="prose max-w-none relative">
{serverText ? (
<div
className="bg-[#f7efe4] p-3 rounded-md shadow-sm text-[#474747]"
dangerouslySetInnerHTML={{ __html: serverText }}
/>
) : (
<div className="text-sm text-neutral-500">Welcome</div>
)}
</div>
)
) : (
// Read-only view for visitors
<div className="prose max-w-none">
{serverText ? (
<div
className="bg-[#f7efe4] p-3 rounded-md shadow-sm"
dangerouslySetInnerHTML={{ __html: serverText }}
/>
) : (
<div className="text-sm bg-[#f7efe4] text-neutral-500">Welcome</div>
)}
</div>
)}
</section>
);
}