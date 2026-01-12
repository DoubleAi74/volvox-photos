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
import BulkUploadModal from "@/components/page/BulkUploadModal";
import PageInfoEditor from "@/components/page/PageInfoEditor";
import PhotoShowModal from "@/components/page/PhotoShowModal";

import { lighten, hexToRgba } from "@/components/dashboard/DashHeader";
import { useTheme } from "@/context/ThemeContext";
import ActionButton from "@/components/ActionButton";
import { useQueue } from "@/lib/useQueue";

const PostSkeleton = ({ blurDataURL }) => (
  <div className="p-1 rounded-[2px] bg-neutral-900/30 shadow-md h-full flex flex-col">
    <div
      className="w-full aspect-[4/3] rounded-sm overflow-hidden relative"
      style={{
        backgroundImage: blurDataURL ? `url("${blurDataURL}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: !blurDataURL ? "#e5e5e5" : undefined,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-100/10 to-transparent animate-shimmer" />
      {!blurDataURL && (
        <div className="absolute inset-0 bg-neutral-200/30 animate-pulse" />
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
  const { user: currentUser, logout, loading: authLoading } = useAuth();
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
        id: `skeleton-${i}`,
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
      // No longer fetching and replacing posts here - optimistic updates
      // now handle state correctly by updating with real server data
      // after each create/edit operation completes
    }
  }, [page?.id]);

  const { addToQueue, isSyncing } = useQueue(handleQueueEmpty);

  const postsRef = useRef(initialPosts);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  // UI States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
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

  const hasScrolledRef = useRef(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (hasScrolledRef.current) return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    window.scrollTo(0, 0);

    const scrollToTarget = () => {
      if (hasScrolledRef.current) return;

      if (topInfoRef.current) {
        topInfoRef.current.scrollIntoView({ behavior: "instant" });
      }
      hasScrolledRef.current = true;
      setIsSynced(true);
    };

    const waitForFontsAndPaint = async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(scrollToTarget);
      });
    };

    waitForFontsAndPaint();
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
  }, [initialPosts]);

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

        const createdPost = await createPost({
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

        // Replace optimistic post with real server data
        setPosts((prev) =>
          prev.map((p) =>
            p.id === tempId
              ? {
                  ...createdPost,
                  isOptimistic: false,
                  isUploadingHeic: false,
                }
              : p
          )
        );
      },
      onRollback: () => {
        setPosts((prev) => prev.filter((p) => p.id !== tempId));
        alert("Failed to create post.");
      },
    });
  };

  const handleBulkUpload = async (postsData) => {
    if (!(isOwner || isPublic) || !page) return;
    setShowBulkUploadModal(false);

    const currentList = postsRef.current;
    let maxOrder =
      currentList.length > 0
        ? Math.max(...currentList.map((p) => p.order_index || 0))
        : 0;

    // Create optimistic posts and queue uploads for each image
    for (const postData of postsData) {
      const clientId = crypto.randomUUID();
      const tempId = `temp-${Date.now()}-${clientId}`;
      maxOrder += 1;
      const newOrderIndex = maxOrder;

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

      postsRef.current = [...postsRef.current, optimisticPost];
      setPosts([...postsRef.current]);

      addToQueue({
        type: "create",
        actionFn: async () => {
          const securePath = `users/${currentUser.uid}/post-thumbnails`;
          const thumbnailUrl = await uploadFile(
            postData.pendingFile,
            securePath
          );
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

          const createdPost = await createPost({
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

          // Replace optimistic post with real server data
          setPosts((prev) =>
            prev.map((p) =>
              p.id === tempId
                ? {
                    ...createdPost,
                    isOptimistic: false,
                    isUploadingHeic: false,
                  }
                : p
            )
          );
        },
        onRollback: () => {
          setPosts((prev) => prev.filter((p) => p.id !== tempId));
        },
      });
    }
  };

  const handleEditPost = async (postData) => {
    if (!isOwner || !editingPost) return;
    const targetId = editingPost.id;
    setEditingPost(null);
    const previousPosts = [...posts];

    const oldIndex = editingPost.order_index;
    const newIndex = postData.order_index;

    setPosts((currentPosts) => {
      // Update all affected posts' order indices (same logic as server)
      const updatedList = currentPosts.map((p) => {
        if (p.id === targetId) {
          // The edited post itself
          return {
            ...editingPost,
            title: postData.title,
            description: postData.description,
            blurDataURL: postData.blurDataURL || editingPost.blurDataURL,
            order_index: newIndex,
            isOptimistic: true,
            isUploadingHeic: postData.needsServerBlur && postData.pendingFile,
          };
        }

        // Adjust other posts' indices if order changed
        if (oldIndex !== newIndex) {
          if (oldIndex > newIndex) {
            // Moving up: posts between newIndex and oldIndex shift down (+1)
            if (p.order_index >= newIndex && p.order_index < oldIndex) {
              return { ...p, order_index: p.order_index + 1 };
            }
          } else {
            // Moving down: posts between oldIndex and newIndex shift up (-1)
            if (p.order_index > oldIndex && p.order_index <= newIndex) {
              return { ...p, order_index: p.order_index - 1 };
            }
          }
        }

        return p;
      });

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

        // Clear optimistic flag after successful update and re-sort
        setPosts((prev) => {
          const updated = prev.map((p) =>
            p.id === targetId
              ? {
                  ...p,
                  isOptimistic: false,
                  isUploadingHeic: false,
                }
              : p
          );
          return updated.sort(
            (a, b) => (a.order_index || 0) - (b.order_index || 0)
          );
        });
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

  const handleMovePost = (postId, direction) => {
    if (!isOwner || !page) return;

    const currentIndex = posts.findIndex((p) => p.id === postId);
    if (currentIndex === -1) return;

    const newIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= posts.length) return;

    const post = posts[currentIndex];
    const swapPost = posts[newIndex];
    const previousPosts = [...posts];

    // Optimistically swap order indices
    setPosts((currentPosts) => {
      const updatedList = currentPosts.map((p) => {
        if (p.id === post.id) {
          return { ...p, order_index: swapPost.order_index };
        }
        if (p.id === swapPost.id) {
          return { ...p, order_index: post.order_index };
        }
        return p;
      });
      return updatedList.sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0)
      );
    });

    addToQueue({
      actionFn: async () => {
        // Update the moved post with its new order_index
        await updatePost(
          post.id,
          { order_index: swapPost.order_index },
          previousPosts
        );
        await updatePost(
          swapPost.id,
          { order_index: post.order_index },
          previousPosts
        );
      },
      onRollback: () => {
        setPosts(previousPosts);
        alert("Failed to reorder posts.");
      },
    });
  };

  // SIMPLIFICATION 2: Removed redundant spread [...posts]
  // `posts` is already an array in state; copying it is unnecessary for read-only ops.
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
        className="p-0 md:px-6 pt-0 pb-0 min-h-[150vh] w-full"
        style={{
          backgroundColor: hexToRgba(activeBackHex, 0.5),
          opacity: isSynced && !debugOverlay ? 1 : 0,
          pointerEvents: isSynced && !debugOverlay ? "auto" : "none",
        }}
      >
        <div className="sticky top-[-1px] left-0 right-0 z-50 pt-[0px] px-0 bg-gray-100 shadow-md">
          <div className="">
            <div
              className="flex items-center justify-center md:justify-start text-2xl font-bold h-[48px] pt-4 pb-3 text-white px-9 "
              style={{
                backgroundColor: activeDashHex || "#ffffff",
                color: lighten(activeDashHex, 240) || "#000000",
              }}
            >
              {page ? page.title : <TitleSkeleton />}
              {isSyncing && (
                <>
                  <span className="hidden sm:block absolute right-4 bottom-2 text-xs ml-4 opacity-70 font-normal">
                    Saving changes...
                  </span>
                  <div className="block sm:hidden absolute right-6 bottom-2 w-7 h-7 border-4 border-white/10 border-t-white/50 rounded-full animate-spin"></div>
                </>
              )}
            </div>
          </div>
        </div>

        <div
          className="w-full px-4 md:px-5  py-3 shadow-sm"
          style={{
            backgroundColor: lighten(activeBackHex, -30),
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
          className="sticky z-10 w-full h-[9px] shadow-sm scroll-mt-[3px] sm:scroll-mt-[17px]"
          style={{
            backgroundColor: lighten(activeDashHex, 30) || "#ffffff",
            top: "42px",
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
          className="w-full min-h-screen px-2 sm:px-4 md:px-5 pt-[0] sm:pt-[56px] pb-0 shadow-xl"
          style={{
            backgroundColor: hexToRgba(activeBackHex, 1),
          }}
        >
          {/* Buttons On mobile at top */}
          <div className=" left-0 w-full pb-[14px] pt-[8px]  flex  sm:!hidden justify-between  px-[5px] z-[100]">
            {usernameTag && (
              <Link
                href={`/${usernameTag}`}
                onClick={handleBackClick}
                prefetch={true}
              >
                <ActionButton
                  title="Back"
                  className="  z-[100]"
                  disabled={isSyncing}
                >
                  <ArrowLeft className="w-5 h-5" />
                  {isSyncing && "Saving"}
                </ActionButton>
              </Link>
            )}

            <div className="flex justify-end gap-3">
              {(isOwner || isPublic) && editOn && (
                <>
                  <ActionButton onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">New post</span>
                  </ActionButton>
                </>
              )}

              {authLoading ? (
                <ActionButton
                  onClick={() => {}}
                  title="Loading..."
                  className="pointer-events-none w-[54px] "
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="animate-pulse"
                  >
                    <circle cx="3" cy="12" r="3" fill="currentColor" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                    <circle cx="21" cy="12" r="3" fill="currentColor" />
                  </svg>
                </ActionButton>
              ) : isOwner ? (
                <ActionButton
                  onClick={() => setEditOn(!editOn)}
                  active={editOn}
                  title="Toggle edit mode"
                  className="w-[54px]  "
                >
                  {editOn ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                      style={{ transform: "scaleX(-1)" }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                      />
                    </svg>
                  ) : (
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
                  )}

                  <span className="hidden md:inline">Edit</span>
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={() => router.push("/welcome")}
                  title="Create your collection"
                  className="w-[54px] gap-[2px] px-[8px]"
                >
                  <Plus className="w-5 h-5" />
                  <UserIcon className="w-4 h-4" />
                </ActionButton>
              )}

              {/* <div className="w-6 h-4 bg-red-400">a</div> */}
              {/* <div className="w-6 h-4 bg-red-400">a</div> */}
            </div>
          </div>

          <div className="max-w-7xl mx-auto ">
            {/* <div className=" w-full h-5 bg-red-500 sm:!hidden"></div> */}

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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 sm:px-2 lg:grid-cols-5 xl:grid-cols-5 gap-[7px] sm:gap-3">
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
                      onMoveLeft={() => handleMovePost(post.id, "left")}
                      onMoveRight={() => handleMovePost(post.id, "right")}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === posts.length - 1}
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

            {/* Buttons On mobile at bottom */}
            <div className=" left-0 w-full pb-[14px] pt-[14px]  flex  sm:!hidden justify-between  px-[5px] z-[100]">
              {usernameTag && (
                <Link
                  href={`/${usernameTag}`}
                  onClick={handleBackClick}
                  prefetch={true}
                >
                  <ActionButton
                    title="Back"
                    className="  z-[100]"
                    disabled={isSyncing}
                  >
                    <ArrowLeft className="w-5 h-5" />
                    {isSyncing && "Saving"}
                  </ActionButton>
                </Link>
              )}

              <div className="flex justify-end gap-3">
                {(isOwner || isPublic) && editOn && (
                  <>
                    <ActionButton onClick={() => setShowCreateModal(true)}>
                      <Plus className="w-5 h-5" />
                      <span className="hidden sm:inline">New post</span>
                    </ActionButton>
                  </>
                )}

                {authLoading ? (
                  <ActionButton
                    onClick={() => {}}
                    title="Loading..."
                    className="pointer-events-none w-[54px] "
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="animate-pulse"
                    >
                      <circle cx="3" cy="12" r="3" fill="currentColor" />
                      <circle cx="12" cy="12" r="3" fill="currentColor" />
                      <circle cx="21" cy="12" r="3" fill="currentColor" />
                    </svg>
                  </ActionButton>
                ) : isOwner ? (
                  <ActionButton
                    onClick={() => setEditOn(!editOn)}
                    active={editOn}
                    title="Toggle edit mode"
                    className="w-[54px]  "
                  >
                    {editOn ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                        style={{ transform: "scaleX(-1)" }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                        />
                      </svg>
                    ) : (
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
                    )}

                    <span className="hidden md:inline">Edit</span>
                  </ActionButton>
                ) : (
                  <ActionButton
                    onClick={() => router.push("/welcome")}
                    title="Create your collection"
                    className="w-[54px] gap-[2px] px-[8px]"
                  >
                    <Plus className="w-5 h-5" />
                    <UserIcon className="w-4 h-4" />
                  </ActionButton>
                )}
              </div>
            </div>

            {/* Some spacing */}
            <div className="p-6 min-h-[70vh]"></div>

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
                onToMultiple={() => {
                  setShowBulkUploadModal(true);
                  setShowCreateModal(false);
                }}
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

            {(isOwner || isPublic) && (
              <BulkUploadModal
                isOpen={showBulkUploadModal}
                onClose={() => setShowBulkUploadModal(false)}
                onBackToSingle={() => {
                  setShowBulkUploadModal(false);
                  setShowCreateModal(true);
                }}
                onSubmit={handleBulkUpload}
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
                  className="hidden sm:block sm:fixed bottom-6 left-6 md:left-10 z-[100] "
                  disabled={isSyncing}
                >
                  <ArrowLeft className="w-5 h-5" />
                  {isSyncing && "Saving"}
                </ActionButton>
              </Link>
            )}

            <div className="hidden sm:flex sm:fixed bottom-6 right-6 md:right-10 z-[100]  flex-wrap items-center gap-3">
              {!isOwner && isPublic && editOn && (
                <ActionButton onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">New post</span>
                </ActionButton>
              )}

              {false && (
                <ActionButton
                  onClick={() => setDebugOverlay(!debugOverlay)}
                  active={debugOverlay}
                  title="Toggle Loading Overlay"
                >
                  <Eye className="w-5 h-5" />
                  <span className="hidden md:inline">Dev Overlay</span>
                </ActionButton>
              )}

              {isOwner && (
                <>
                  {editOn && (
                    <>
                      <ActionButton onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">New post</span>
                      </ActionButton>
                    </>
                  )}

                  <ActionButton
                    onClick={() => setEditOn(!editOn)}
                    active={editOn}
                    title="Toggle edit mode"
                  >
                    <>
                      {editOn ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                          style={{ transform: "scaleX(-1)" }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                          />
                        </svg>
                      ) : (
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
                      )}
                      <span className="hidden md:inline">Edit</span>
                    </>
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
      className="fixed inset-0 z-[9999] p-0 md:px-6 pt-0 pb-0 min-h-[150vh] w-full overflow-hidden"
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
        className="min-h-screen px-2 sm:px-4 md:px-5 pt-[23px] sm:pt-[31px] pb-0 shadow-xl"
        style={{
          backgroundColor: hexToRgba(activeBackHex, 1),
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 sm:px-2 lg:grid-cols-5 xl:grid-cols-5 gap-[7px]  sm:gap-3">
            {Array.from({ length: Math.max(skeletonCount) }).map((_, i) => (
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
