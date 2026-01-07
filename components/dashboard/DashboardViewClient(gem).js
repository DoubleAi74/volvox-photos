// components/dashboard/DashboardViewClient.js
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useTransition,
  useLayoutEffect,
} from "react";
import DashHeader, { hexToRgba } from "@/components/dashboard/DashHeader";
import DashboardInfoEditor from "@/components/dashboard/DashboardInfoEditor";
import { useAuth } from "@/context/AuthContext";
import { Plus, LogOut, User as UserIcon, Eye } from "lucide-react";
import PageCard from "@/components/dashboard/PageCard";
import CreatePageModal from "@/components/dashboard/CreatePageModal";
import EditPageModal from "@/components/dashboard/EditPageModal";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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

// Standard Skeleton used in real view
const PageSkeleton = () => (
  <div className="w-full h-48 bg-gray-200/50 rounded-xl animate-pulse shadow-sm" />
);

export default function DashboardViewClient({ profileUser, initialPages }) {
  const { user: currentUser, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const { updateTheme, themeState } = useTheme();

  // Navigation
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // ---------------------------------------------------------
  // 1. SYNC & OVERLAY STATE
  // ---------------------------------------------------------
  const [isSynced, setIsSynced] = useState(false);
  const [debugOverlay, setDebugOverlay] = useState(false);
  const topRef = useRef(null);

  const [pages, setPages] = useState(initialPages);

  // ---------------------------------------------------------
  // 2. SCROLL & SYNC EFFECT
  // ---------------------------------------------------------
  useLayoutEffect(() => {
    if (
      typeof window !== "undefined" &&
      "scrollRestoration" in window.history
    ) {
      window.history.scrollRestoration = "manual";
    }

    // Since Dashboard usually starts at top, we ensure that
    window.scrollTo({ top: 0, behavior: "instant" });

    setIsSynced(true);
  }, []);

  // Queue & Reindexing
  const handleQueueEmpty = useCallback(async () => {
    if (pagesRef.current?.length) {
      await reindexPages(pagesRef.current);
    }
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
  const [editOn, setEditOn] = useState(searchParams.has("edit"));

  const isOwner =
    currentUser && profileUser && currentUser.uid === profileUser.uid;

  // ---------------------------------------------------------
  // COLOR STATE (Optimistic)
  // ---------------------------------------------------------
  const useLiveContext = themeState.uid === profileUser?.uid;

  // RESTORED: useState is needed here so setDashHex/setBackHex exist
  const [dashHex, setDashHex] = useState(
    useLiveContext && themeState.dashHex
      ? themeState.dashHex
      : profileUser?.dashboard?.dashHex || "#000000"
  );

  // RESTORED: useState is needed here so setDashHex/setBackHex exist
  const [backHex, setBackHex] = useState(
    useLiveContext && themeState.backHex
      ? themeState.backHex
      : profileUser?.dashboard?.backHex || "#F4F4F5"
  );

  // Handle Dash Hex Changes
  useEffect(() => {
    if (profileUser?.uid) updateTheme(profileUser.uid, dashHex, backHex);
    if (dashHex === profileUser?.dashboard?.dashHex) return;

    const handler = setTimeout(async () => {
      if (profileUser?.uid) {
        await updateUserColours(profileUser.uid, "dashboard.dashHex", dashHex);
        startTransition(() => {
          router.refresh();
        });
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [dashHex, backHex, profileUser, router, updateTheme]);

  // Handle Back Hex Changes
  useEffect(() => {
    if (profileUser?.uid) updateTheme(profileUser.uid, dashHex, backHex);
    if (backHex === profileUser?.dashboard?.backHex) return;

    const handler = setTimeout(async () => {
      if (profileUser?.uid) {
        await updateUserColours(profileUser.uid, "dashboard.backHex", backHex);
        startTransition(() => {
          router.refresh();
        });
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [backHex, dashHex, profileUser, router, updateTheme]);

  // Sync Edit Mode with URL
  useEffect(() => {
    setEditOn(searchParams.has("edit"));
  }, [searchParams]);

  // Reconcile server pages with optimistic local state
  useEffect(() => {
    if (!initialPages) return;
    const serverIds = new Set(initialPages.map((p) => p.id));
    deletedIdsRef.current.forEach((id) => {
      if (!serverIds.has(id)) deletedIdsRef.current.delete(id);
    });

    setPages((currentLocalPages) => {
      const validServerPages = initialPages.filter(
        (p) => !deletedIdsRef.current.has(p.id)
      );
      const optimisticPages = currentLocalPages.filter((p) => p.isOptimistic);
      const serverPagesByClientId = new Map();
      validServerPages.forEach((p) => {
        if (p.clientId) serverPagesByClientId.set(p.clientId, p);
      });

      const merged = [];
      const addedClientIds = new Set();
      const addedIds = new Set();

      validServerPages.forEach((serverPage) => {
        merged.push(serverPage);
        if (serverPage.clientId) addedClientIds.add(serverPage.clientId);
        addedIds.add(serverPage.id);
      });

      optimisticPages.forEach((optPage) => {
        const hasServerVersion =
          optPage.clientId && addedClientIds.has(optPage.clientId);
        const existsById = addedIds.has(optPage.id);
        if (!hasServerVersion && !existsById) {
          merged.push(optPage);
        }
      });

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

  const toggleEditMode = () => {
    const shouldBeEditing = !editOn;
    setEditOn(shouldBeEditing);
    const currentParams = new URLSearchParams(searchParams.toString());
    if (shouldBeEditing) {
      currentParams.set("edit", "true");
    } else {
      currentParams.delete("edit");
    }
    const newUrl = `${pathname}?${currentParams.toString()}`;
    window.history.replaceState(null, "", newUrl);
  };

  const handleCreatePage = async (pageData) => {
    if (!isOwner || !profileUser) return;
    setShowCreateModal(false);
    const clientId = crypto.randomUUID();
    const tempId = `temp-${Date.now()}`;
    const currentList = pagesRef.current;
    const maxOrder =
      currentList.length > 0
        ? Math.max(...currentList.map((p) => p.order_index || 0))
        : 0;
    const newOrderIndex = maxOrder + 1;
    const tempSlug = `temp-${Date.now()}`;

    const optimisticPage = {
      id: tempId,
      title: pageData.title,
      description: pageData.description,
      thumbnail: "",
      blurDataURL: pageData.blurDataURL || "",
      userId: currentUser.uid,
      slug: tempSlug,
      order_index: newOrderIndex,
      created_date: new Date(),
      isOptimistic: true,
      clientId: clientId,
      isPrivate: pageData.isPrivate || false,
      isPublic: pageData.isPublic || false,
      isUploadingHeic: pageData.needsServerBlur,
    };

    pagesRef.current = [...currentList, optimisticPage];
    setPages(pagesRef.current);

    addToQueue({
      type: "create",
      actionFn: async () => {
        const securePath = `users/${currentUser.uid}/page-thumbnails`;
        const thumbnailUrl = await uploadFile(pageData.pendingFile, securePath);
        let blurDataURL = pageData.blurDataURL;

        if (pageData.needsServerBlur) {
          setPages((prev) =>
            prev.map((p) =>
              p.id === tempId
                ? { ...p, thumbnail: thumbnailUrl, isUploadingHeic: false }
                : p
            )
          );
          blurDataURL = await fetchServerBlur(thumbnailUrl);
          setPages((prev) =>
            prev.map((p) =>
              p.id === tempId ? { ...p, blurDataURL: blurDataURL || "" } : p
            )
          );
        }

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
    const targetId = editingPage.id;
    setEditingPage(null);
    const previousPages = [...pages];

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
        if (pageData.pendingFile) {
          const securePath = `users/${currentUser.uid}/page-thumbnails`;
          thumbnailUrl = await uploadFile(pageData.pendingFile, securePath);
          if (pageData.needsServerBlur) {
            blurDataURL = await fetchServerBlur(thumbnailUrl);
          }
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
    if (!confirm("Are you sure?")) return;

    if (pageData.isOptimistic || pageData.id?.startsWith("temp-")) {
      setPages((currentPages) =>
        currentPages.filter((p) => p.id !== pageData.id)
      );
      return;
    }

    const previousPages = [...pages];
    deletedIdsRef.current.add(pageData.id);
    setPages((currentPages) =>
      currentPages.filter((p) => p.id !== pageData.id)
    );

    addToQueue({
      actionFn: async () => {
        await deletePage(pageData);
      },
      onRollback: () => {
        deletedIdsRef.current.delete(pageData.id);
        setPages(previousPages);
        alert("Failed to delete.");
      },
    });
  };

  if (!profileUser) {
    return <div className="text-center mt-20">Loading...</div>;
  }

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------
  return (
    <>
      <div
        ref={topRef}
        className="min-h-[100dvh]"
        style={{
          backgroundColor: hexToRgba(backHex, 1),
          // 3. FADE IN LOGIC
          opacity: isSynced && !debugOverlay ? 1 : 0,
          pointerEvents: isSynced && !debugOverlay ? "auto" : "none",
        }}
      >
        {/* FIXED HEADER */}
        <div className="fixed top-0 left-0 right-0 z-20 pt-2 px-0">
          <DashHeader
            profileUser={profileUser}
            alpha={1}
            editTitleOn={editOn}
            dashHex={dashHex}
            isSyncing={isSyncing}
          />
        </div>

        {/* CONTENT AREA */}
        <div className="pt-6">
          <div className="min-h-[100px] sm:min-h-[120px]"></div>

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
                [1, 2, 3, 4].map((i) => <PageSkeleton key={i} />)
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-5">
              {pages
                .filter((page) => {
                  if (page.isPrivate && !isOwner) return false;
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
        <div className="p-6 min-h-[50vh]"></div>

        {/* BUTTONS */}
        <div
          className="fixed bottom-6 right-6 z-[100] flex flex-wrap items-center gap-3"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* 4. DEV OVERLAY TOGGLE */}
          <ActionButton
            onClick={() => setDebugOverlay(!debugOverlay)}
            active={debugOverlay}
            title="Toggle Loading Overlay"
          >
            <Eye className="w-5 h-5" />
            <span className="hidden md:inline">Dev Overlay</span>
          </ActionButton>

          {isOwner && editOn && (
            <ActionButton onClick={() => setShowCreateModal(true)}>
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Page</span>
            </ActionButton>
          )}

          {isOwner && (
            <>
              <ActionButton onClick={toggleEditMode} active={editOn}>
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
                <ActionButton onClick={() => {}} title="Email">
                  <UserIcon className="w-5 h-5" />
                  <span className="text-sm">{currentUser?.email}</span>
                </ActionButton>
              </div>
              <ActionButton onClick={handleLogout} title="Log out">
                <LogOut className="w-5 h-5" />
              </ActionButton>
            </>
          )}

          {!isOwner && !authLoading && (
            <>
              <ActionButton onClick={() => router.push("/")}>
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create your collection</span>
              </ActionButton>
              <ActionButton onClick={() => router.push("/login")}>
                <UserIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Login</span>
              </ActionButton>
            </>
          )}
        </div>

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

      {/* 5. LOADING OVERLAY IMPLEMENTATION */}
      {(!isSynced || debugOverlay) && (
        <DashboardLoadingOverlay
          profileUser={profileUser}
          dashHex={dashHex}
          backHex={backHex}
          skeletonCount={pages?.length || 4}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------
// NEW COMPONENT: DashboardLoadingOverlay
// ---------------------------------------------------------
function DashboardLoadingOverlay({
  profileUser,
  dashHex,
  backHex,
  skeletonCount,
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] min-h-screen w-full overflow-hidden"
      style={{
        backgroundColor: hexToRgba(backHex, 1),
      }}
    >
      {/* 1. Header Copy */}
      <div className="fixed top-0 left-0 right-0 z-20 pt-2 px-0">
        <DashHeader
          profileUser={profileUser}
          alpha={1}
          dashHex={dashHex}
          isSyncing={false}
        />
      </div>

      <div className="pt-6">
        <div className="min-h-[100px] sm:min-h-[120px]"></div>
        {/* 2. Info Editor Skeleton */}
        <div className="max-w-8xl mx-auto">
          <div className="flex">
            <div className="w-full ml-7 mr-9 mb-3 mt-[-15px]">
              {/* Matches structural styles of DashboardInfoEditor */}
              <div className="w-full p-3 h-[48px] bg-neutral-200/30 rounded-md animate-pulse border-transparent shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sticky Bar Copy */}
      <div className="sticky top-[-2px] left-0 right-0 z-10 pt-3 px-0">
        <DashHeader
          title={""}
          alpha={1}
          profileUser={profileUser}
          heightShort={true}
          dashHex={dashHex}
          backHex={backHex}
        />
      </div>

      {/* 4. Grid Skeleton */}
      <div className="p-3 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-5">
          {Array.from({ length: Math.max(skeletonCount, 4) }).map((_, i) => (
            <PageSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
