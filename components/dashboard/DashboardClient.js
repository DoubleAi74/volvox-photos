// components/dashboard/DashboardClient.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
import DashHeader from "@/components/dashboard/DashHeader";
import DashboardInfoEditor from "@/components/dashboard/DashboardInfoEditor";
import { useAuth } from "@/context/AuthContext";
import { Plus, LogOut, User as UserIcon } from "lucide-react";
import PageCard from "@/components/dashboard/PageCard";
import CreatePageModal from "@/components/dashboard/CreatePageModal";
import EditPageModal from "@/components/dashboard/EditPageModal";
// 1. Next.js Navigation Hooks
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";

import {
  createPage,
  deletePage,
  getPages,
  updatePage,
  changeHexGlobal,
} from "@/lib/data";

const PageSkeleton = () => (
  <div className="w-full h-48 bg-gray-200/50 rounded-xl animate-pulse shadow-sm" />
);

export default function DashboardClient({
  profileUser, // Data passed from server
  initialPages, // Data passed from server
  initialHex, // Data passed from server
  initialInfoText,
}) {
  const { user: currentUser, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  // 2. Initialize URL hooks
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [pages, setPages] = useState(initialPages);
  const [headerColor, setHeaderColor] = useState(initialHex);
  const [loading, setLoading] = useState(false);

  // UI State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPage, setEditingPage] = useState(null);

  // 3. Initialize editOn based on presence of ANY 'edit' param
  // This ensures editOn is true for both '?edit=true' AND '?edit=title'
  const [editOn, setEditOn] = useState(searchParams.has("edit"));

  const isOwner =
    currentUser && profileUser && currentUser.uid === profileUser.uid;

  // 4. Sync State with URL (Handles Back/Forward buttons)
  useEffect(() => {
    setEditOn(searchParams.has("edit"));
  }, [searchParams]);

  // A. Auth-dependent re-fetch
  useEffect(() => {
    if (isOwner && profileUser) {
      const fetchPrivatePages = async () => {
        try {
          const privatePages = await getPages(profileUser.uid, true);
          setPages(privatePages);
        } catch (e) {
          console.error("Failed to fetch private pages:", e);
        }
      };
      fetchPrivatePages();
    }
  }, [isOwner, profileUser?.uid]);

  // B. DEBOUNCED COLOR SAVE
  useEffect(() => {
    if (headerColor === initialHex) return;

    const timer = setTimeout(async () => {
      if (profileUser) {
        try {
          await changeHexGlobal(profileUser.uid, headerColor);
          router.refresh();
        } catch (error) {
          console.error("Failed to auto-save color:", error);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [headerColor, initialHex, profileUser, router]);

  // ------------------------------------------------------------------
  // ACTION HANDLERS
  // ------------------------------------------------------------------

  const refreshPages = useCallback(async () => {
    setLoading(true);
    const userPages = await getPages(profileUser.uid, isOwner);
    setPages(userPages);
    setLoading(false);
    router.refresh();
  }, [isOwner, profileUser?.uid, router]);

  const handleHeaderColorChange = (newHex) => {
    setHeaderColor(newHex);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  // 5. MAIN EDIT TOGGLE HANDLER
  // - If Off: Sets '?edit=true' (General Edit Mode)
  // - If On (either 'true' or 'title'): Removes param (Off)
  const toggleEditMode = () => {
    const isCurrentlyEditing = searchParams.has("edit");

    // Update local state immediately for responsiveness
    setEditOn(!isCurrentlyEditing);

    const currentParams = new URLSearchParams(searchParams.toString());

    if (isCurrentlyEditing) {
      // Turn OFF: remove the param entirely
      currentParams.delete("edit");
    } else {
      // Turn ON: set to 'true' (General Edit Mode)
      // We do NOT set 'title' here. That is handled inside DashHeader.
      currentParams.set("edit", "true");
    }

    router.replace(`${pathname}?${currentParams.toString()}`, {
      scroll: false,
    });
  };

  const handleCreatePage = async (pageData) => {
    if (!isOwner || !profileUser) return;
    try {
      const maxOrder =
        pages.length > 0
          ? Math.max(...pages.map((p) => p.order_index || 0))
          : 0;

      await createPage(
        { ...pageData, order_index: maxOrder + 1 },
        profileUser.uid
      );
      setShowCreateModal(false);
      await refreshPages();
    } catch (error) {
      console.error("Failed to create page:", error);
      alert("Failed to create page.");
    }
  };

  const handleEditPage = async (pageData) => {
    if (!isOwner || !editingPage || !profileUser) return;
    try {
      await updatePage(editingPage.id, pageData, pages);
      setEditingPage(null);
      await refreshPages();
    } catch (error) {
      console.error("Failed to update page:", error);
      alert("Failed to update page.");
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!isOwner || !profileUser) return;
    if (
      confirm(
        "Are you sure you want to delete this page? This cannot be undone."
      )
    ) {
      try {
        await deletePage(pageId, pages);
        await refreshPages();
      } catch (error) {
        console.error("Failed to delete page:", error);
        alert("Failed to delete page.");
      }
    }
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
      {/* FIXED HEADER */}
      <div className=" fixed top-0 left-0 right-0 z-20 pt-2 px-0">
        <DashHeader
          profileUser={profileUser}
          defaultHex="#000000"
          alpha={1}
          uid={profileUser.uid}
          editTitleOn={editOn} // Passes true if param is 'true' OR 'title'
          hexColor={headerColor}
        />
      </div>

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
                initialData={initialInfoText}
              />
            </div>
          </div>
        </div>
      </div>

      {/* STICKY HEADER 2 */}
      <div className="sticky  top-[-2px] left-0 right-0 z-10 pt-3 px-0">
        <DashHeader
          title={""}
          defaultHex="#000000"
          alpha={1}
          uid={profileUser.uid}
          editColOn={editOn}
          hexColor={headerColor}
          heightShort={true}
          onColorChange={handleHeaderColorChange}
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
            {pages.map((page) => (
              <PageCard
                key={page.id}
                page={page}
                isOwner={isOwner}
                editModeOn={editOn}
                usernameTag={profileUser.usernameTag}
                onDelete={() => handleDeletePage(page.id)}
                onEdit={() => setEditingPage(page)}
              />
            ))}
          </div>
        )}
      </div>
      {/* Scroll Spacer */}
      <div className="p-6 min-h-[150vh]"></div>

      {/* BUTTONS & MODALS */}
      {authLoading ? (
        <div className="fixed bottom-6 right-8 z-[100] h-[44px] flex items-center">
          <div className="flex items-center gap-4 animate-pulse">
            <button
              onClick={() => router.push("/login")}
              className="flex text-sm font-medium items-center gap-2 hover:shadow-neumorphic-soft px-6 py-2 rounded-md bg-[#f7f3ed] shadow-md text-neumorphic-text h-[44px]"
            >
              <UserIcon className="w-5 h-5 " />
              <span className="text-sm">...</span>
            </button>
          </div>
        </div>
      ) : isOwner ? (
        <>
          {/* Mobile buttons view */}
          <div className="flex md:hidden items-center gap-4 mt-4 fixed bottom-6 right-8 z-[100]">
            {editOn && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-2 rounded-md bg-[#f7f3ed] shadow-md text-neumorphic-text font-medium hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed h-[44px]"
              >
                <Plus className="w-5 h-5" />
                New Page
              </button>
            )}

            {/* MAIN EDIT BUTTON */}
            <button
              onClick={toggleEditMode}
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

          {/* Desktop buttons view */}
          <div className="hidden md:flex items-center gap-4 mt-4 fixed bottom-6 right-8 z-[100]">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-2 rounded-md bg-[#f7f3ed] shadow-md text-neumorphic-text font-medium hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed h-[44px]"
            >
              <Plus className="w-5 h-5" />
              New Page
            </button>

            {/* MAIN EDIT BUTTON */}
            <button
              onClick={toggleEditMode}
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
      ) : (
        <div className="flex items-center gap-4 mt-4 fixed bottom-6 right-8 z-[100]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/welcome")}
              className="flex text-sm font-medium items-center gap-2 hover:shadow-neumorphic-soft px-3 py-2 rounded-md bg-[#f7f3ed] shadow-md text-neumorphic-text h-[35px] md:h-[44px] md:p-4"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm">Create your collection</span>
            </button>

            <button
              onClick={() => router.push("/login")}
              className="flex text-sm font-medium items-center gap-2 hover:shadow-neumorphic-soft px-3 py-2 rounded-md bg-[#f7f3ed] shadow-md text-neumorphic-text h-[35px] md:h-[44px] md:p-4"
            >
              <UserIcon className="w-5 h-5" />
              <span className="text-sm">Login</span>
            </button>
          </div>
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
    </>
  );
}
