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
import DashHeader from "@/components/dashboard/DashHeader";
import DashboardInfoEditor from "@/components/dashboard/DashboardInfoEditor";
import { useAuth } from "@/context/AuthContext";
import { Plus, LogOut, User as UserIcon, Eye } from "lucide-react";
import PageCard from "@/components/dashboard/PageCard";
import CreatePageModal from "@/components/dashboard/CreatePageModal";
import EditPageModal from "@/components/dashboard/EditPageModal";
// 1. Next.js Navigation Hooks
import { useRouter, useSearchParams, usePathname } from "next/navigation";
// import { hexToRgba } from "@/components/dashboard/DashHeader";
import { lighten, hexToRgba } from "@/components/dashboard/DashHeader";
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

  const [pages, setPages] = useState(() => {
    if (initialPages && initialPages.length > 0) {
      return initialPages;
    }
    const optimistic = themeState.optimisticDashboardData;
    if (
      optimistic &&
      optimistic.uid === profileUser?.uid &&
      optimistic.pageCount > 0
    ) {
      return Array.from({ length: optimistic.pageCount }, (_, i) => ({
        id: `skeleton-${i}`,
        isSkeleton: true,
        blurDataURL: optimistic.pageBlurs?.[i] || "",
        order_index: i,
      }));
    }
    return initialPages;
  });

  const serverBlurs = initialPages?.map((p) => p.blurDataURL) || [];
  const optimisticBlurs = themeState?.optimisticDashboardData?.pageBlurs || [];
  const overlayBlurs = serverBlurs.length > 0 ? serverBlurs : optimisticBlurs;

  const handleQueueEmpty = useCallback(async () => {
    console.log("Queue is empty, reindexing pages...");
    if (pagesRef.current?.length) {
      await reindexPages(pagesRef.current);
    }

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
  const [isSynced, setIsSynced] = useState(false);
  const [debugOverlay, setDebugOverlay] = useState(false);

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

  // Improved Scroll Management
  useLayoutEffect(() => {
    if (
      typeof window !== "undefined" &&
      "scrollRestoration" in window.history
    ) {
      window.history.scrollRestoration = "manual";
    }

    // Scroll to top immediately
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });

    setIsSynced(true);
  }, []);

  // Sync State with URL (Handles Back/Forward buttons)
  useEffect(() => {
    setEditOn(searchParams.has("edit"));
  }, [searchParams]);

  // IMPORTANT: Reconcile server pages with optimistic local state
  useEffect(() => {
    if (!initialPages || initialPages.length === 0) return;

    const serverIds = new Set(initialPages.map((p) => p.id));

    // Clean up deleted IDs that the server no longer knows about
    deletedIdsRef.current.forEach((id) => {
      if (!serverIds.has(id)) {
        deletedIdsRef.current.delete(id);
      }
    });

    setPages((currentLocalPages) => {
      // If we have skeleton posts, replace them with server data
      if (currentLocalPages.length > 0 && currentLocalPages[0]?.isSkeleton) {
        return initialPages.filter((p) => !deletedIdsRef.current.has(p.id));
      }

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
      const merged = validServerPages.map((serverPage) => {
        const matchingOptimistic = optimisticPages.find(
          (opt) => opt.clientId && opt.clientId === serverPage.clientId
        );
        return matchingOptimistic ? serverPage : serverPage;
      });

      // 5. Add optimistic pages that haven't been confirmed by server yet
      optimisticPages.forEach((optPage) => {
        const hasServerVersion =
          optPage.clientId && serverPagesByClientId.has(optPage.clientId);
        const existsById = merged.some((p) => p.id === optPage.id);

        // Only add if server doesn't have this page yet
        if (!hasServerVersion && !existsById) {
          merged.push(optPage);
        }
      });

      // 6. Sort by order_index for stable display
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

  const toggleEditMode = () => {
    // 1. Calculate new state locally
    const shouldBeEditing = !editOn;

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
          opacity: isSynced && !debugOverlay ? 1 : 0,
          pointerEvents: isSynced && !debugOverlay ? "auto" : "none",
        }}
      >
        <div
          className=" sticky z-50 w-full h-[8px] "
          style={{
            backgroundColor: backHex || "#ffffff",
            top: "0px",
          }}
        />

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

        {/* CONTENT AREA */}
        <div
          className="pt-[12px]"
          style={{
            backgroundColor: lighten(backHex, -30),
          }}
        >
          <div className="min-h-[58px] sm:min-h-[78px] "></div>

          {/* Bio / Info Editor */}

          <div className="max-w-8xl mx-auto py-4 ">
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
        <div className="sticky  top-[94px] left-0 right-0 z-10 pt-0 px-0">
          <DashHeader
            title={""}
            alpha={1}
            profileUser={profileUser}
            editColOn={editOn}
            heightShort={true}
            dashHex={lighten(dashHex, 30)}
            setDashHex={setDashHex}
            backHex={backHex}
            setBackHex={setBackHex}
          />
        </div>

        <div className={`${editOn ? "h-[19px]" : "h-[47px]"}`}></div>

        {/* PAGES GRID */}
        <div className="p-3 md:p-6 ">
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
            {/* Dev Overlay Toggle */}
            <ActionButton
              onClick={() => setDebugOverlay(!debugOverlay)}
              active={debugOverlay}
              title="Toggle Loading Overlay"
            >
              <Eye className="w-5 h-5" />
              <span className="hidden md:inline">Dev Overlay</span>
            </ActionButton>

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

      {(!isSynced || debugOverlay) && (
        <LoadingOverlay
          dashHex={dashHex}
          backHex={backHex}
          profileUser={profileUser}
          skeletonCount={pages?.length || 8}
          previewBlurs={overlayBlurs}
        />
      )}
    </>
  );
}

function LoadingOverlay({
  dashHex,
  backHex,
  profileUser,
  skeletonCount,
  previewBlurs,
}) {
  const PageSkeleton = ({ blurDataURL }) => (
    <div
      className="w-full h-48 rounded-xl shadow-sm overflow-hidden relative"
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
  );

  return (
    <div
      className="fixed inset-0 z-[9999] min-h-[100dvh] overflow-hidden"
      style={{
        backgroundColor: hexToRgba(backHex, 1),
      }}
    >
      {/* FIXED HEADER */}
      <div className="fixed top-0 left-0 right-0 z-20 pt-2 px-0">
        <DashHeader
          profileUser={profileUser}
          alpha={1}
          editTitleOn={false}
          dashHex={dashHex}
          isSyncing={false}
        />
      </div>

      {/* CONTENT AREA */}
      <div className="pt-6">
        <div className="min-h-[100px] sm:min-h-[120px]"></div>
      </div>

      {/* STICKY HEADER 2 */}
      <div className="sticky top-[-2px] left-0 right-0 z-10 pt-3 px-0">
        <DashHeader
          title={""}
          alpha={1}
          profileUser={profileUser}
          editColOn={false}
          heightShort={true}
          dashHex={dashHex}
          backHex={backHex}
        />
      </div>

      {/* PAGES GRID SKELETON */}
      <div className="p-3 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-5">
          {Array.from({ length: Math.max(skeletonCount, 8) }).map((_, i) => (
            <PageSkeleton key={i} blurDataURL={previewBlurs[i] || ""} />
          ))}
        </div>
      </div>
    </div>
  );
}
