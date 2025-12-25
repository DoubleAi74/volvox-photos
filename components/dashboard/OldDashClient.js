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

export default function DashboardClient({ profileUser, initialPages }) {
  const { user: currentUser, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const { updateTheme } = useTheme();

  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [pages, setPages] = useState(initialPages);
  const [loading, setLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPage, setEditingPage] = useState(null);

  const [editOn, setEditOn] = useState(searchParams.has("edit"));

  const isOwner =
    currentUser && profileUser && currentUser.uid === profileUser.uid;

  const [dashHex, setDashHex] = useState(
    profileUser?.dashboard?.dashHex || "#000000"
  );
  const [backHex, setBackHex] = useState(
    profileUser?.dashboard?.backHex || "#F4F4F5"
  );

  // ------------------------------------------------------------------
  // DASH HEX EFFECT
  // ------------------------------------------------------------------
  useEffect(() => {
    if (profileUser?.uid) {
      updateTheme(profileUser.uid, dashHex, backHex);
    }

    if (dashHex === profileUser?.dashboard?.dashHex) return;

    const handler = setTimeout(async () => {
      if (profileUser?.uid) {
        await updateUserColours(profileUser.uid, "dashboard.dashHex", dashHex);
        router.refresh();
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [dashHex, backHex, profileUser, router, updateTheme]);

  // ------------------------------------------------------------------
  // BACK HEX EFFECT
  // ------------------------------------------------------------------
  useEffect(() => {
    if (profileUser?.uid) {
      updateTheme(profileUser.uid, dashHex, backHex);
    }

    if (backHex === profileUser?.dashboard?.backHex) return;

    const handler = setTimeout(async () => {
      if (profileUser?.uid) {
        await updateUserColours(profileUser.uid, "dashboard.backHex", backHex);
        router.refresh();
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [backHex, dashHex, profileUser, router, updateTheme]);

  // ------------------------------------------------------------------
  // SYNC EDIT MODE WITH URL
  // ------------------------------------------------------------------
  useEffect(() => {
    setEditOn(searchParams.has("edit"));
  }, [searchParams]);

  // ------------------------------------------------------------------
  // FETCH PRIVATE PAGES FOR OWNER
  // ------------------------------------------------------------------
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
  }, [isOwner, profileUser]);

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

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const toggleEditMode = () => {
    const isCurrentlyEditing = searchParams.has("edit");
    setEditOn(!isCurrentlyEditing);

    const currentParams = new URLSearchParams(searchParams.toString());

    if (isCurrentlyEditing) {
      currentParams.delete("edit");
    } else {
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
        style={{ backgroundColor: hexToRgba(backHex, 1) }}
      >
        {/* FIXED HEADER */}
        <div className="fixed top-0 left-0 right-0 z-20 pt-2 px-0">
          <DashHeader
            profileUser={profileUser}
            alpha={1}
            editTitleOn={editOn}
            dashHex={dashHex}
          />
        </div>

        <div className="pt-6">
          <div className="min-h-[100px] sm:min-h-[120px]" />

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
        <div className="sticky top-[-2px] left-0 right-0 z-10 pt-3 px-0">
          <DashHeader
            title=""
            alpha={1}
            profileUser={profileUser}
            editColOn={editOn}
            heightShort
            dashHex={dashHex}
            setDashHex={setDashHex}
            backHex={backHex}
            setBackHex={setBackHex}
          />
        </div>

        {/* PAGES GRID */}
        <div className="p-3 md:p-6">
          {loading || pages.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {pages.length === 0 && !loading && !isOwner ? (
                <div className="text-center py-16 col-span-full">
                  <h3 className="text-xl font-semibold text-neumorphic">
                    No public pages.
                  </h3>
                </div>
              ) : (
                [1, 2, 3, 4, 5, 6, 7, 8].map((i) => <PageSkeleton key={i} />)
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
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

        <div className="p-6 min-h-[50vh]" />

        {/* BUTTONS & MODALS */}
        {authLoading ? (
          <div className="fixed bottom-6 right-6 z-[100] opacity-60">
            <div className="flex items-center gap-2 h-[44px] px-4 bg-black/30 text-zinc-300 border border-white/10">
              <UserIcon className="w-5 h-5" />
              <span className="text-sm">Loading…</span>
            </div>
          </div>
        ) : isOwner ? (
          <div className="fixed bottom-6 right-6 z-[100] flex gap-3">
            {editOn && (
              <ActionButton onClick={() => setShowCreateModal(true)}>
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">New Page</span>
              </ActionButton>
            )}

            <ActionButton onClick={toggleEditMode} active={editOn}>
              <span className="hidden md:inline">Edit</span>
            </ActionButton>

            <ActionButton onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </ActionButton>
          </div>
        ) : null}

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
