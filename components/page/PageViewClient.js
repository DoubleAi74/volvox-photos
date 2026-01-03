// components/page/PageViewClient.js
"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Plus, LogOut, ArrowLeft, User as UserIcon } from "lucide-react";
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

import { lighten } from "@/components/dashboard/DashHeader";
import { hexToRgba } from "@/components/dashboard/DashHeader";

import { useTheme } from "@/context/ThemeContext";
import ActionButton from "@/components/ActionButton";

import { useQueue } from "@/lib/useQueue";

const PostSkeleton = ({ blurDataURL }) => (
  <div
    className="w-full aspect-square rounded-xl shadow-sm relative overflow-hidden"
    style={{
      backgroundImage: blurDataURL ? `url("${blurDataURL}")` : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: !blurDataURL ? "#e5e5e5" : undefined,
    }}
  >
    {/* Shimmer overlay effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />

    {/* Subtle loading indicator */}
    {!blurDataURL && (
      <div className="absolute inset-0 bg-gray-200/50 animate-pulse" />
    )}
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
  params,
}) {
  const { usernameTag, pageSlug } = params;
  const { user: currentUser, logout } = useAuth();
  const router = useRouter();
  const { themeState, clearOptimisticPageData } = useTheme();

  // Initialize with optimistic data if available and matches current slug
  const [page, setPage] = useState(() => {
    const optimistic = themeState.optimisticPageData;
    if (optimistic && optimistic.slug === pageSlug && !initialPage) {
      return optimistic; // Use optimistic data for instant render
    }
    return initialPage; // Fall back to server data
  });

  const [posts, setPosts] = useState(() => {
    // If we have real posts from server, use them
    if (initialPosts && initialPosts.length > 0) {
      return initialPosts;
    }

    // Otherwise, if we have optimistic data, create skeleton posts
    const optimistic = themeState.optimisticPageData;
    if (
      optimistic &&
      optimistic.slug === pageSlug &&
      optimistic.postCount > 0
    ) {
      return Array.from({ length: optimistic.postCount }, (_, i) => ({
        id: `skeleton-${i}`,
        isSkeleton: true,
        blurDataURL: optimistic.previewPostBlurs?.[i] || "",
        order_index: i,
      }));
    }

    return [];
  });

  const handleQueueEmpty = useCallback(async () => {
    if (page?.id) {
      await reindexPosts(page.id);

      // Reconcile postCount to ensure it matches actual posts in database
      await reconcilePostCount(page.id);

      // Fetch fresh posts from server to remove optimistic flags
      const freshPosts = await getPostsForPage(page.id);
      setPosts(freshPosts);
    }
  }, [page?.id]);

  const { addToQueue, isSyncing } = useQueue(handleQueueEmpty);

  const postsRef = useRef(initialPosts);
  useEffect(() => {
    postsRef.current = posts;
    console.log("Posts ref updated:", postsRef.current);
    const currentList = postsRef.current;
    const maxOrder =
      currentList.length > 0
        ? Math.max(...currentList.map((p) => p.order_index || 0))
        : 0;
    console.log("Max order index:", maxOrder);
  }, [posts]);

  // UI States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editOn, setEditOn] = useState(false);
  const [selectedPostForModal, setSelectedPostForModal] = useState(null);

  const [loadingPosts, setLoadingPosts] = useState(false);

  const deletedIdsRef = useRef(new Set());

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

  // Reconcile optimistic page data with server data
  useEffect(() => {
    if (initialPage && initialPage.id) {
      setPage(initialPage);
      // Clear optimistic data once we have real server data
      clearOptimisticPageData();
    }
  }, [initialPage, clearOptimisticPageData]);

  // Prefetch dashboard for instant back navigation
  useEffect(() => {
    if (usernameTag) {
      router.prefetch(`/${usernameTag}`);
    }
  }, [usernameTag, router]);

  // Reconcile server posts with local optimistic state - run once on mount
  useEffect(() => {
    // Only run if we have real server data
    if (!initialPosts || initialPosts.length === 0) {
      return;
    }

    const serverIds = new Set(initialPosts.map((p) => p.id));
    deletedIdsRef.current.forEach((id) => {
      if (!serverIds.has(id)) {
        deletedIdsRef.current.delete(id);
      }
    });

    setPosts((currentLocalPosts) => {
      // If posts are skeletons, replace them entirely with server data
      if (currentLocalPosts.length > 0 && currentLocalPosts[0]?.isSkeleton) {
        return initialPosts.filter((p) => !deletedIdsRef.current.has(p.id));
      }

      const validServerPosts = initialPosts.filter(
        (p) => !deletedIdsRef.current.has(p.id)
      );

      const optimisticPosts = currentLocalPosts.filter((p) => p.isOptimistic);

      const serverPostsByClientId = new Map();
      validServerPosts.forEach((p) => {
        if (p.clientId) {
          serverPostsByClientId.set(p.clientId, p);
        }
      });

      const merged = validServerPosts.map((serverPost) => {
        const matchingOptimistic = optimisticPosts.find(
          (opt) => opt.clientId && opt.clientId === serverPost.clientId
        );

        if (matchingOptimistic) {
          return serverPost;
        }
        return serverPost;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const handleCreatePost = async (postData) => {
    // postData contains: { title, description, blurDataURL, pendingFile, needsServerBlur, content_type, content }
    // For regular images: blurDataURL is set, needsServerBlur is false
    // For HEIC: blurDataURL is empty, needsServerBlur is true
    if (!(isOwner || isPublic) || !page) return;

    setShowCreateModal(false);

    const clientId = crypto.randomUUID();
    const tempId = `temp-${Date.now()}`;

    const currentList = postsRef.current;
    const maxOrder =
      currentList.length > 0
        ? Math.max(...currentList.map((p) => p.order_index || 0))
        : 0;
    const newOrderIndex = maxOrder + 1;

    // Optimistic post - shows blur if available, otherwise shows as "uploading"
    const optimisticPost = {
      id: tempId,
      title: postData.title,
      description: postData.description,
      thumbnail: "", // Empty until upload completes
      blurDataURL: postData.blurDataURL || "", // Empty for HEIC
      content_type: postData.content_type,
      content: postData.content,
      page_id: page.id,
      order_index: newOrderIndex,
      created_date: new Date(),
      isOptimistic: true,
      clientId: clientId,
      isUploadingHeic: postData.needsServerBlur, // Flag for PostCard to show special state
    };

    // Update ref and state immediately
    postsRef.current = [...currentList, optimisticPost];
    setPosts(postsRef.current);

    // Queue the upload + blur fetch (if needed) + create operation
    addToQueue({
      type: "create",
      actionFn: async () => {
        // Step 1: Upload the file
        const securePath = `users/${currentUser.uid}/post-thumbnails`;
        const thumbnailUrl = await uploadFile(postData.pendingFile, securePath);
        console.log("[handleCreatePost] Upload complete:", thumbnailUrl);

        // Step 2: Get blur (either from postData or fetch from server for HEIC)
        let blurDataURL = postData.blurDataURL;

        if (postData.needsServerBlur) {
          console.log("[handleCreatePost] Fetching server blur for HEIC...");

          // Update optimistic post to show blur is being generated
          setPosts((prev) =>
            prev.map((p) =>
              p.id === tempId
                ? { ...p, thumbnail: thumbnailUrl, isUploadingHeic: false }
                : p
            )
          );

          blurDataURL = await fetchServerBlur(thumbnailUrl);
          console.log("[handleCreatePost] Server blur fetched");

          // Update optimistic post with blur
          setPosts((prev) =>
            prev.map((p) =>
              p.id === tempId ? { ...p, blurDataURL: blurDataURL || "" } : p
            )
          );
        }

        // Step 3: Create the post in database
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

    // Optimistic update (show blur preview if available)
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

        // If there's a new image to upload
        if (postData.pendingFile) {
          const securePath = `users/${currentUser.uid}/post-thumbnails`;
          thumbnailUrl = await uploadFile(postData.pendingFile, securePath);

          if (postData.needsServerBlur) {
            blurDataURL = await fetchServerBlur(thumbnailUrl);
          }

          // Update optimistic post with real thumbnail
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

        // IMPORTANT: Remove non-serializable fields before sending to Firestore
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

    // Don't try to delete optimistic posts from Firestore
    if (postData.isOptimistic || postData.id?.startsWith("temp-")) {
      // Just remove from local state
      setPosts((currentPosts) =>
        currentPosts.filter((p) => p.id !== postData.id)
      );
      return;
    }

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

  const displayedPosts = [...posts];
  const currentIndex = displayedPosts.findIndex(
    (p) => p.id === selectedPostForModal?.id
  );

  const handleNextPost = () => {
    if (currentIndex >= displayedPosts.length - 1) return;
    setSelectedPostForModal(displayedPosts[currentIndex + 1]);
  };

  const handlePreviousPost = () => {
    if (currentIndex <= 0) return;
    setSelectedPostForModal(displayedPosts[currentIndex - 1]);
  };

  // Get next and previous posts for preloading
  const nextPost = currentIndex >= 0 && currentIndex < displayedPosts.length - 1
    ? displayedPosts[currentIndex + 1]
    : null;
  const previousPost = currentIndex > 0
    ? displayedPosts[currentIndex - 1]
    : null;

  const skeletonCount = page?.postCount ?? 0;

  return (
    <div
      className="p-0 md:px-6 pt-0 pb-0 min-h-screen w-fit min-w-full"
      style={{
        backgroundColor: hexToRgba(activeBackHex, 0.5),
      }}
    >
      <div className="sticky top-0 left-0 right-0 z-10 pt-[0px] px-0 bg-gray-100 shadow-md">
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

      <div
        className=" min-h-screen px-4 md:px-5 pt-5 pb-0 shadow-xl"
        style={{
          backgroundColor: hexToRgba(activeBackHex, 1),
        }}
      >
        <div className="max-w-7xl mx-auto ">
          <div className="w-full">
            <PageInfoEditor
              pid={page?.id}
              canEdit={isOwner}
              editOn={editOn}
              initialData={initialInfoTexts.infoText1}
              index={1}
            />
          </div>

          {loadingPosts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6">
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <PostSkeleton key={i} aspect="4/3" />
              ))}
            </div>
          ) : (
            <>
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
                  {displayedPosts.map((post, index) => (
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
            </>
          )}

          <div className="w-full mt-10">
            <PageInfoEditor
              pid={page?.id}
              canEdit={isOwner}
              editOn={editOn}
              initialData={initialInfoTexts.infoText2}
              index={2}
            />
          </div>
          <div className="p-6 min-h-[50vh]"></div>

          <PhotoShowModal
            post={selectedPostForModal}
            onOff={!!selectedPostForModal}
            onClose={() => setSelectedPostForModal(null)}
            onNext={handleNextPost}
            onPrevious={handlePreviousPost}
            hasNext={currentIndex < displayedPosts.length - 1}
            hasPrevious={currentIndex > 0}
            nextPost={nextPost}
            previousPost={previousPost}
          />

          {isOwner && (
            <>
              <CreatePostModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreatePost}
              />
              <EditPostModal
                isOpen={!!editingPost}
                post={editingPost}
                onClose={() => setEditingPost(null)}
                onSubmit={handleEditPost}
              />
            </>
          )}

          {!isOwner && isPublic && (
            <CreatePostModal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              onSubmit={handleCreatePost}
            />
          )}
          {usernameTag && (
            <Link href={`/${usernameTag}`}>
              <ActionButton
                title="Back"
                className="fixed bottom-6 left-6 md:left-10 z-[100]"
              >
                <ArrowLeft className="w-5 h-5" />
              </ActionButton>
            </Link>
          )}

          <div
            className="fixed bottom-6 right-6 md:right-10 z-[100] flex flex-wrap items-center gap-3"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {!isOwner && isPublic && (
              <ActionButton onClick={() => setShowCreateModal(true)}>
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">New post</span>
              </ActionButton>
            )}

            {isOwner && (
              <>
                <ActionButton onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">New post</span>
                </ActionButton>

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

                <ActionButton
                  onClick={() => {
                    return;
                  }}
                  title="Email"
                >
                  <UserIcon className="w-5 h-5" />
                  <span className="text-sm">{currentUser?.email}</span>
                </ActionButton>

                <ActionButton onClick={handleLogout} title="Log out">
                  <LogOut className="w-5 h-5" />
                </ActionButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
