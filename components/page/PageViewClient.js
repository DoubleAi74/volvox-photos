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
  console.log(initialInfoTexts.infoText1);
  console.log(initialInfoTexts.infoText2);
  const { usernameTag, pageSlug } = params;
  const { user: currentUser, logout } = useAuth();
  const router = useRouter();

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

  const handleDeletePost = async (postId) => {
    if (!isOwner || !page) return;
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        await deletePost(postId, posts);
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
  console.log(profileUser?.dashboard?.dashHex);
  const dashHexVal = profileUser?.dashboard?.dashHex;
  return (
    <div className="p-3 md:px-6 pt-0 pb-0  min-h-screen bg-white/60">
      <div className="sticky top-0 left-0 right-0 z-10 pt-[0px] px-0 bg-gray-100">
        <div className="">
          <div
            className="flex items-center  justify-center md:justify-start text-2xl font-bold h-[47px] pt-4 pb-3  text-white px-9 "
            style={{
              backgroundColor: dashHexVal || "#ffffff",
              color: lighten(dashHexVal, 240) || "#000000",
            }}
          >
            {page ? page.title : <TitleSkeleton />}
          </div>
        </div>
      </div>

      <div className="bg-[#faebd9] min-h-screen px-4 md:px-5 pt-4 pb-0  shadow-slate-800">
        <div className="max-w-7xl mx-auto">
          {/* HEADER SECTION - Rendered with Server Data immediately */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            {/* Action Buttons */}
          </div>

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
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <PostSkeleton key={i} />
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
                        onDelete={() => handleDeletePost(post.id)}
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
            <button className="p-3 fixed bottom-6 left-7 md:left-10 h-[44px] w-auto rounded-md bg-[#f7f3ed] shadow-md hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed">
              <ArrowLeft className="w-5 h-5 text-neumorphic-text mx-0" />
            </button>
          </Link>

          {/* FLOATING ACTION BUTTONS (Mobile & Desktop) */}

          {/* Show 'New Post' button */}
          {!isOwner && isPublic && (
            <>
              {/* Mobile view */}
              <div className="flex md:hidden items-center gap-4 mt-4 fixed bottom-6 right-7 z-[100]">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 py-2 rounded-md bg-[#f7f3ed] shadow-md text-neumorphic-text font-medium hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed h-[44px]"
                >
                  <Plus className="w-5 h-5" />
                  New Post
                </button>
              </div>

              {/* Desktop view */}
              <div className="hidden md:flex items-center gap-4 mt-4 fixed bottom-6 right-10 z-[100]">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 py-2 rounded-md bg-[#f7f3ed] shadow-md text-neumorphic-text font-medium hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed h-[44px]"
                >
                  <Plus className="w-5 h-5" />
                  New Post
                </button>
              </div>
            </>
          )}

          {isOwner && (
            <>
              {/* Mobile view */}
              <div className="flex md:hidden items-center gap-4 mt-4 fixed bottom-6 right-7 z-[100]">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 py-2 rounded-md bg-[#f7f3ed] shadow-md text-neumorphic-text font-medium hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed h-[44px]"
                >
                  <Plus className="w-5 h-5" />
                  New Post
                </button>

                <button
                  onClick={() => setEditOn(!editOn)}
                  className={`flex text-sm items-center gap-2 px-4 py-2 rounded-md shadow-md text-neumorphic-text font-medium hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed h-[44px] ${
                    editOn ? "bg-[#0e4f19]" : "bg-[#f7f3ed]"
                  }`}
                >
                  <div className={editOn ? "text-white" : ""}>
                    Edit: {editOn ? "on" : "off"}
                  </div>
                </button>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center px-6 py-2 rounded-md bg-[#f7f3ed] shadow-md text-neumorphic-text hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed h-[44px]"
                    title="Log Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Desktop view */}
              <div className="hidden md:flex items-center gap-4 mt-4 fixed bottom-6 right-10 z-[100]">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 py-2 rounded-md bg-[#f7f3ed] shadow-md text-neumorphic-text font-medium hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed h-[44px]"
                >
                  <Plus className="w-5 h-5" />
                  New Post
                </button>

                <button
                  onClick={() => setEditOn(!editOn)}
                  className={`flex text-sm items-center gap-2 px-4 py-2 rounded-md shadow-md text-neumorphic-text font-medium hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed h-[44px] ${
                    editOn ? "bg-[#0e4f19]" : "bg-[#f7f3ed]"
                  }`}
                >
                  <div className={editOn ? "text-white" : ""}>
                    Edit: {editOn ? "on" : "off"}
                  </div>
                </button>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-6 py-2 rounded-md bg-[#f7f3ed] shadow-md text-neumorphic-text h-[44px]">
                    <UserIcon className="w-5 h-5" />
                    <span className="text-sm">{currentUser?.email}</span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center px-6 py-2 rounded-md bg-[#f7f3ed] shadow-md text-neumorphic-text hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed h-[44px]"
                    title="Log Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
