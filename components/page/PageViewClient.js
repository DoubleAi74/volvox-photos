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

// 1. Define Skeletons within the Client Component (Crucial Fix)
const PostSkeleton = () => (
  <div className="w-full aspect-square bg-gray-200/50 rounded-xl animate-pulse shadow-sm" />
);

const TitleSkeleton = () => (
  <div className="h-8 w-48 bg-gray-200/50 rounded-md animate-pulse mb-2" />
);

export default function PageViewClient({
  profileUser, // Server Data
  initialPage, // Server Data
  initialPosts, // Server Data
  initialInfoTexts, // info text (both for now)
  params, // Server Data
}) {
  const { usernameTag, pageSlug } = params;
  const { user: currentUser, logout } = useAuth();
  const router = useRouter();
  const { themeState } = useTheme();

  // 1. Initialize State with Server Props
  const [page, setPage] = useState(initialPage);
  const [posts, setPosts] = useState(initialPosts);

  // UI States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editOn, setEditOn] = useState(false);
  const [selectedPostForModal, setSelectedPostForModal] = useState(null);
  const [loadingPosts, setLoadingPosts] = useState(false); // Only used for client-side re-fetching

  // Derived State (Uses client-side auth context)
  const isOwner =
    currentUser && profileUser && currentUser.uid === profileUser.uid;
  const isPublic = page?.isPublic || false;

  // ------------------------------------------------------------------
  // ACTION HANDLERS
  // ------------------------------------------------------------------

  // Does the context match the user we are currently looking at?
  const useLiveTheme = themeState.uid === profileUser?.uid;

  // Use Context if available, otherwise use Server Prop
  const activeDashHex =
    useLiveTheme && themeState.dashHex
      ? themeState.dashHex
      : profileUser?.dashboard?.dashHex || "#ffffff";

  const activeBackHex =
    useLiveTheme && themeState.backHex
      ? themeState.backHex
      : profileUser?.dashboard?.backHex || "#ffffff";

  const refreshPosts = useCallback(async () => {
    if (!page?.id) return;
    setLoadingPosts(true);

    // 1. Fetch fresh data locally for instant state update
    const postData = await getPostsForPage(page.id);
    setPosts(postData);
    setLoadingPosts(false);

    // 2. Tell Next.js to refresh the Server Component cache for this route
    router.refresh();
  }, [page?.id, router]);

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
    try {
      const maxOrder =
        posts.length > 0
          ? Math.max(...posts.map((p) => p.order_index || 0))
          : 0;

      await createPost({
        ...postData,
        page_id: page.id,
        order_index: maxOrder + 1,
      });
      await refreshPosts(); // Use the optimized refresh
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  const handleEditPost = async (postData) => {
    if (!isOwner || !editingPost) return;
    try {
      await updatePost(editingPost.id, postData, posts);
      await refreshPosts(); // Use the optimized refresh
      setEditingPost(null);
    } catch (error) {
      console.error("Error updating post:", error);
    }
  };

  const handleDeletePost = async (postData) => {
    if (!isOwner || !page) return;
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        await deletePost(posts, postData);
        await refreshPosts(); // Use the optimized refresh
      } catch (error) {
        console.error("Error deleting post:", error);
      }
    }
  };

  // Modal Navigation Logic
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

  // --- RENDER LOGIC ---

  // Since the Server Component already handled the 404/User not found cases,
  // we can rely on initialPage existing here. If it was null, the Server would have rendered the 404.

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
            className="flex items-center  justify-center md:justify-start text-2xl font-bold h-[47px] pt-4 pb-3  text-white px-9 "
            style={{
              backgroundColor: activeDashHex || "#ffffff",
              color: lighten(activeDashHex, 240) || "#000000",
            }}
          >
            {page ? page.title : <TitleSkeleton />}
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
          {/* HEADER SECTION - Rendered with Server Data immediately */}

          {/* Page Info Editor */}
          <div className="w-full">
            <PageInfoEditor
              pid={page?.id}
              canEdit={isOwner}
              editOn={editOn}
              initialData={initialInfoTexts.infoText1}
              index={1}
            />
          </div>
          {/* POSTS GRID */}
          {loadingPosts ? ( // Use local loading state for mutations/re-fetches
            // SKELETON GRID
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6">
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <PostSkeleton key={i} aspect="4/3" />
              ))}
            </div>
          ) : (
            // REAL CONTENT
            <>
              {posts.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="text-xl font-semibold text-neumorphic mb-0">
                    This page is empty
                  </h3>
                  {isOwner && (
                    <>
                      <p className="text-neumorphic-text mb-0">
                        Create your first post to get started.
                      </p>
                    </>
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
          {/* MODALS */}
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
          {/* If public but not owner, simple create modal */}
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
          {/* FLOATING ACTION BUTTONS (Mobile & Desktop) */}
          {/* Show 'New Post' button */}
          <div
            className="fixed bottom-6 right-6 md:right-10 z-[100] flex flex-wrap items-center gap-3"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Public, non-owner */}
            {!isOwner && isPublic && (
              <ActionButton onClick={() => setShowCreateModal(true)}>
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">New post</span>
              </ActionButton>
            )}

            {/* Owner controls */}
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

                {/* Desktop user badge */}
                <div className="hidden md:flex items-center gap-2 h-[44px] px-4 rounded-sm bg-black/30 text-zinc-300 backdrop-blur-[1px] border border-white/10">
                  <UserIcon className="w-5 h-5" />
                  <span className="text-sm">{currentUser?.email}</span>
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
  );
}
