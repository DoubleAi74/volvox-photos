// components/page/PageViewClient.js
"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Plus, LogOut, ArrowLeft, User as UserIcon } from "lucide-react";
import {
  getPostsForPage,
  createPost,
  updatePost,
  deletePost,
} from "@/lib/data";
import PostCard from "@/components/page/PostCard";
import CreatePostModal from "@/components/page/CreatePostModal";
import EditPostModal from "@/components/page/EditPostModal";
import PageInfoEditor from "@/components/page/PageInfoEditor";
import PhotoShowModal from "@/components/page/PhotoShowModal";

import { lighten } from "@/components/dashboard/DashHeader";
import { hexToRgba } from "@/components/dashboard/DashHeader";

import { useTheme } from "@/context/ThemeContext";
import ActionButton from "@/components/ActionButton";

// --- CHANGED: Import the new hook ---
import { usePostQueue } from "@/lib/usePostQueue";

const PostSkeleton = () => (
  <div className="w-full aspect-square bg-gray-200/50 rounded-xl animate-pulse shadow-sm" />
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
  const { themeState } = useTheme();

  // --- CHANGED: Initialize the Queue Hook ---
  const { addToQueue, isSyncing } = usePostQueue();

  const [page, setPage] = useState(initialPage);
  const [posts, setPosts] = useState(initialPosts);

  // UI States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editOn, setEditOn] = useState(false);
  const [selectedPostForModal, setSelectedPostForModal] = useState(null);

  // Note: loadingPosts is mostly unused now for mutations, only for full page re-fetches
  const [loadingPosts, setLoadingPosts] = useState(false);

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

  React.useEffect(() => {
    setPosts(initialPosts);
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
    // Basic checks
    if (!(isOwner || isPublic) || !page) return;

    // 1. Close Modal Immediately
    setShowCreateModal(false);

    // 2. Generate Temp ID
    const tempId = `temp-${Date.now()}`;

    // 3. OPTIMISTIC UPDATE
    // We calculate the order based on the CURRENT state at this exact moment.
    // Because we update state immediately after this, the next click will see the new count.
    let optimisticOrderIndex = 0;

    setPosts((currentPosts) => {
      // Calculate max order from the current (fresh) state
      const maxOrder =
        currentPosts.length > 0
          ? Math.max(...currentPosts.map((p) => p.order_index || 0))
          : 0;

      optimisticOrderIndex = maxOrder + 1;

      const optimisticPost = {
        id: tempId,
        ...postData,
        page_id: page.id,
        order_index: optimisticOrderIndex,
        created_date: new Date(),
        isOptimistic: true,
      };

      return [...currentPosts, optimisticPost];
    });

    // 4. ADD TO QUEUE
    addToQueue({
      actionFn: async () => {
        // We use the 'optimisticOrderIndex' we calculated above.
        // Since the queue runs serially, we don't strictly need to re-calculate
        // against the DB unless you have multiple users editing the same page simultaneously.
        // For a single user rapid-fire scenario, passing the calculated index is fine.

        await createPost({
          ...postData,
          page_id: page.id,
          order_index: optimisticOrderIndex,
        });
      },
      onRollback: () => {
        // Remove the specific temp post if it fails
        setPosts((prev) => prev.filter((p) => p.id !== tempId));
        alert("Failed to create post.");
      },
    });
  };

  const handleEditPost = async (postData) => {
    if (!isOwner || !editingPost) return;

    // Capture ID now because editingPost state might change
    const targetId = editingPost.id;
    setEditingPost(null);

    const previousPosts = [...posts];

    const optimisticPost = {
      ...editingPost,
      ...postData,
      isOptimistic: true,
    };

    // 1. Optimistic UI Update
    setPosts((currentPosts) => {
      const updatedList = currentPosts.map((p) =>
        p.id === targetId ? optimisticPost : p
      );
      return updatedList.sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0)
      );
    });

    // 2. Add to Queue
    addToQueue({
      actionFn: async () => {
        // Pass the snapshot 'previousPosts' if your logic relies on it
        await updatePost(targetId, postData, previousPosts);
      },
      onRollback: () => {
        setPosts(previousPosts);
        alert("Failed to update post.");
      },
    });
  };

  const handleDeletePost = async (postData) => {
    if (!isOwner || !page) return;

    // Remove the confirm dialog or keep it?
    // If you delete fast, confirming every time is annoying.
    // For now, let's assume we keep it, but user clicks fast.
    // If you want "super fast" delete, remove the confirm()
    // if (!confirm("Are you sure you want to delete this post?")) {
    //   return;
    // }

    const previousPosts = [...posts];

    // 1. OPTIMISTIC UI UPDATE
    setPosts((currentPosts) =>
      currentPosts.filter((p) => p.id !== postData.id)
    );

    // 2. Add to Queue
    addToQueue({
      actionFn: async () => {
        // --- IMPORTANT FIX FOR DB ERROR ---
        // Even though we use previousPosts for logic, simply by putting this
        // in the queue, we ensure 'deletePost' doesn't run while another
        // 'deletePost' is halfway through updating IDs.
        await deletePost(previousPosts, postData);
      },
      onRollback: () => {
        setPosts(previousPosts);
        alert("Something went wrong. The post could not be deleted.");
      },
    });

    // Note: We removed router.refresh() from here.
    // The hook handles it when the queue is empty.
  };

  // ... (Remainder of the file: handleNextPost, handlePreviousPost, Render logic) ...
  // ... Ensure you keep existing render logic ...

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

  const skeletonCount = page?.postCount ?? 0;

  return (
    <div
      className="p-0 md:px-6 pt-0 pb-0 min-h-screen w-fit min-w-full"
      style={{
        backgroundColor: hexToRgba(activeBackHex, 0.5),
      }}
    >
      {/* ... keeping your existing header code ... */}
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
            {/* Optional: Show a subtle indicator that work is happening */}
            {isSyncing && (
              <span className="absolute right-2 bottom-2 text-xs ml-4 opacity-70 font-normal">
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
        {/* ... Rest of your JSX remains exactly the same ... */}
        {/* ... Just Ensure you are using the updated handle functions ... */}
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
                  {displayedPosts.map((post) => (
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
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ... Footer / Modals ... */}
          {/* ... (Keep existing code) ... */}
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
          />

          {isOwner && (
            <>
              <CreatePostModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreatePost}
                lotusThumb={pageSlug === "meditations"}
              />
              <EditPostModal
                isOpen={!!editingPost}
                post={editingPost}
                onClose={() => setEditingPost(null)}
                onSubmit={handleEditPost}
              />
            </>
          )}

          {/* ... Buttons ... */}
          {/* ... (Keep existing code) ... */}
          {!isOwner && isPublic && (
            <CreatePostModal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              onSubmit={handleCreatePost}
            />
          )}
          <Link href={`/${usernameTag}`}>
            <ActionButton
              title="Back"
              className="fixed bottom-6 left-6 md:left-10 z-[100]"
            >
              <ArrowLeft className="w-5 h-5" />
            </ActionButton>
          </Link>

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
