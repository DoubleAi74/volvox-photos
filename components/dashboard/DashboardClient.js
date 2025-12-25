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
import { hexToRgba } from "@/components/dashboard/DashHeader";
import { useTheme } from "@/context/ThemeContext";

import ActionButton from "@/components/ActionButton";

import {
  createPage,
  deletePage,
  getPages,
  updatePage,
  updateUserColours,
} from "@/lib/data";

const PageSkeleton = () => (
  <div className="w-full h-48 bg-gray-200/50 rounded-xl animate-pulse shadow-sm" />
);

export default function DashboardClient({
  profileUser, // Data passed from server
  initialPages, // Data passed from server
}) {
  const { user: currentUser, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const { updateTheme } = useTheme();

  // 2. Initialize URL hooks
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [pages, setPages] = useState(initialPages);

  const [loading, setLoading] = useState(false);

  // UI State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPage, setEditingPage] = useState(null);

  // 3. Initialize editOn based on presence of ANY 'edit' param
  // This ensures editOn is true for both '?edit=true' AND '?edit=title'
  const [editOn, setEditOn] = useState(searchParams.has("edit"));

  const isOwner =
    currentUser && profileUser && currentUser.uid === profileUser.uid;

  const [dashHex, setDashHex] = useState(
    profileUser?.dashboard?.dashHex || "#000000"
  );
  const [backHex, setBackHex] = useState(
    profileUser?.dashboard?.backHex || "#F4F4F5"
  );

  // Handle Dash Hex Changes
  useEffect(() => {
    // A. Always sync to Global Context immediately so PageClientView sees it
    if (profileUser?.uid) {
      updateTheme(profileUser.uid, dashHex, backHex);
    }

    // B. Stop if the state matches the Server Data (Prevent Back-Button Overwrite)
    if (dashHex === profileUser?.dashboard?.dashHex) return;

    // C. Debounce the Database Save
    const handler = setTimeout(async () => {
      if (profileUser?.uid) {
        await updateUserColours(profileUser.uid, "dashboard.dashHex", dashHex);
        router.refresh(); // Refresh server cache
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [dashHex, profileUser, router]);

  // Handle Back Hex Changes
  useEffect(() => {
    // A. Sync Context
    if (profileUser?.uid) {
      updateTheme(profileUser.uid, dashHex, backHex);
    }

    // B. Safety Check
    if (backHex === profileUser?.dashboard?.backHex) return;

    // C. Debounce Save
    const handler = setTimeout(async () => {
      if (profileUser?.uid) {
        await updateUserColours(profileUser.uid, "dashboard.backHex", backHex);
        router.refresh();
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [backHex, profileUser, router]); // Remove dashHex from

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

  const handleDeletePage = async (pageData) => {
    if (!isOwner || !profileUser) return;
    if (
      confirm(
        "Are you sure you want to delete this page? This cannot be undone."
      )
    ) {
      try {
        await deletePage(pages, pageData);
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
      <div
        className="min-h-[100vh]"
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
              {pages.map((page) => (
                <PageCard
                  key={page.id}
                  page={page}
                  isOwner={isOwner}
                  editModeOn={editOn}
                  usernameTag={profileUser.usernameTag}
                  onDelete={() => handleDeletePage(page)}
                  onEdit={() => setEditingPage(page)}
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
            <div className="hidden md:flex items-center gap-2 h-[44px] px-4 rounded-sm bg-black/30 text-zinc-300 backdrop-blur-[1px] border border-white/10">
              <UserIcon className="w-5 h-5" />
              <span className="text-sm">{currentUser?.email}</span>
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
