// components/dashboard/DashboardViewClient.js
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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

import { useQueue } from "@/lib/useQueue";

import {
  createPage,
  deletePage,
  updatePage,
  uploadFile,
  updateUserColours,
  reindexPages,
  batchFetchPagePreviews,
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
  const { updateTheme } = useTheme();

  // 2. Initialize URL hooks
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [pages, setPages] = useState(initialPages);
  const [previewsLoaded, setPreviewsLoaded] = useState(false);

  ////// New

  // const handleQueueEmpty = useCallback(async () => {
  //   console.log("Queue is empty, reindexing pages...");
  //   if (currentUser?.uid) {
  //     console.log("Reindexing pages...");
  //     await reindexPages(currentUser.uid);
  //   }
  // }, [currentUser?.uid]);

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
    console.log("Pages ref updated:", pagesRef.current);
    const currentList = pagesRef.current;
    const maxOrder =
      currentList.length > 0
        ? Math.max(...currentList.map((p) => p.order_index || 0))
        : 0;
    console.log("Max order index:", maxOrder);
  }, [pages]);

  const deletedIdsRef = useRef(new Set());

  ///// ^ new

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

  // 5. Lazy load preview blurs after LCP
  useEffect(() => {
    if (previewsLoaded || !pages.length) return;

    // Use requestIdleCallback to defer loading until browser is idle
    const loadPreviews = async () => {
      try {
        const pageIds = pages.map((p) => p.id);
        const previewMap = await batchFetchPagePreviews(pageIds);

        // Update pages with preview data
        setPages((currentPages) =>
          currentPages.map((page) => ({
            ...page,
            previewPostBlurs: previewMap[page.id] || [],
          }))
        );

        setPreviewsLoaded(true);
      } catch (error) {
        console.error("Failed to load preview blurs:", error);
      }
    };

    // Defer loading to after initial render
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(() => loadPreviews());
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(loadPreviews, 100);
    }
  }, [pages.length, previewsLoaded]);

  // REMOVED: Auth-dependent re-fetch was causing phantom page behavior
  // The server component already passes initialPages with correct auth context
  // Adding a client-side fetch here causes race conditions with optimistic updates

  // ------------------------------------------------------------------
  // ACTION HANDLERS
  // ------------------------------------------------------------------

  //  useEffect(() => {
  //   /// IMPORTANT — reconcile server pages with optimistic local state

  //   // 1. Build a set of server-known page IDs
  //   const serverIds = new Set(initialPages.map((p) => p.id));

  //   // 2. Clean up deleted IDs that the server no longer knows about
  //   deletedIdsRef.current.forEach((id) => {
  //     if (!serverIds.has(id)) {
  //       deletedIdsRef.current.delete(id);
  //     }
  //   });

  //   setPages((currentLocalPages) => {
  //     // 3. Remove locally-deleted pages from server data
  //     const validServerPages = initialPages.filter(
  //       (p) => !deletedIdsRef.current.has(p.id)
  //     );

  //     // 4. Extract optimistic pages (new / editing / reordering)
  //     const optimisticPages = currentLocalPages.filter((p) => p.isOptimistic);

  //     // 5. Index server pages by clientId (optimistic → canonical bridge)
  //     const serverPagesByClientId = new Map();
  //     validServerPages.forEach((p) => {
  //       if (p.clientId) {
  //         serverPagesByClientId.set(p.clientId, p);
  //       }
  //     });

  //     // 6. Prefer server versions over optimistic ones when matched
  //     const merged = validServerPages.map((serverPage) => {
  //       const matchingOptimistic = optimisticPages.find(
  //         (opt) => opt.clientId && opt.clientId === serverPage.clientId
  //       );

  //       // If server version exists, always prefer it
  //       if (matchingOptimistic) {
  //         return serverPage;
  //       }

  //       return serverPage;
  //     });

  //     // 7. Keep optimistic pages that don’t have a server version yet
  //     optimisticPages.forEach((optPage) => {
  //       const hasServerVersion =
  //         optPage.clientId && serverPagesByClientId.has(optPage.clientId);
  //       const existsById = merged.some((p) => p.id === optPage.id);

  //       if (!hasServerVersion && !existsById) {
  //         merged.push(optPage);
  //       }
  //     });

  //     // 8. Enforce stable ordering
  //     return merged.sort(
  //       (a, b) => (a.order_index || 0) - (b.order_index || 0)
  //     );
  //   });
  // }, [initialPages]);

  // SAME I THINK
  useEffect(() => {
    /// IMPORTANT: Reconcile server pages with optimistic local state
    const serverIds = new Set(initialPages.map((p) => p.id));

    // Clean up deleted IDs that the server no longer knows about
    deletedIdsRef.current.forEach((id) => {
      if (!serverIds.has(id)) {
        deletedIdsRef.current.delete(id);
      }
    });

    setPages((currentLocalPages) => {
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
      const merged = [];
      const addedClientIds = new Set();
      const addedIds = new Set();

      // Add all server pages (these are the source of truth)
      validServerPages.forEach((serverPage) => {
        merged.push(serverPage);
        if (serverPage.clientId) {
          addedClientIds.add(serverPage.clientId);
        }
        addedIds.add(serverPage.id);
      });

      // 5. Add optimistic pages that haven't been confirmed by server yet
      optimisticPages.forEach((optPage) => {
        const hasServerVersion =
          optPage.clientId && addedClientIds.has(optPage.clientId);
        const existsById = addedIds.has(optPage.id);

        // Only add if server doesn't have this page yet
        if (!hasServerVersion && !existsById) {
          merged.push(optPage);
        }
      });

      // 6. Sort by order_index for stable display
      return merged.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    });
  }, [initialPages]);

  // const refreshPages = useCallback(async () => {
  //   setLoading(true);
  //   const userPages = await getPages(profileUser.uid, isOwner);
  //   setPages(userPages);
  //   setLoading(false);
  //   router.refresh();
  // }, [isOwner, profileUser?.uid, router]);

  // const handleHeaderColorChange = (newHex) => {
  //   setHeaderColor(newHex);
  // };

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

    setShowCreateModal(false);

    const clientId = crypto.randomUUID();
    const tempId = `temp-${Date.now()}`;

    const currentList = pagesRef.current;

    const maxOrder =
      currentList.length > 0
        ? Math.max(...currentList.map((p) => p.order_index || 0))
        : 0;
    const newOrderIndex = maxOrder + 1;

    // Generate a temporary slug for the optimistic page (will be replaced with real one from server)
    const tempSlug = `temp-${pageData.title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")}-${Date.now()}`;

    // Optimistic page - shows blur if available, otherwise shows as "uploading"
    const optimisticPage = {
      id: tempId,
      title: pageData.title,
      description: pageData.description,
      thumbnail: "", // Empty until upload completes
      blurDataURL: pageData.blurDataURL || "", // Empty for HEIC
      userId: currentUser.uid, // IMPORTANT: Must be uid string, not user object
      slug: tempSlug, // Temporary slug for PageCard link
      order_index: newOrderIndex,
      created_date: new Date(),
      isOptimistic: true,
      clientId: clientId,
      isPrivate: pageData.isPrivate || false,
      isPublic: pageData.isPublic || false,
      isUploadingHeic: pageData.needsServerBlur, // Flag for PageCard to show special state
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
        console.log("[handleCreatePage] Upload complete:", thumbnailUrl);

        // Step 2: Get blur (either from postData or fetch from server for HEIC)
        let blurDataURL = pageData.blurDataURL;

        if (pageData.needsServerBlur) {
          console.log("[handleCreatePage] Fetching server blur for HEIC...");

          // Update optimistic page to show blur is being generated
          setPages((prev) =>
            prev.map((p) =>
              p.id === tempId
                ? { ...p, thumbnail: thumbnailUrl, isUploadingHeic: false }
                : p
            )
          );

          blurDataURL = await fetchServerBlur(thumbnailUrl);
          console.log("[handleCreatePage] Server blur fetched");

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

    // Optimistic update (show blur preview if available)
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
      // Just remove from local state
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
            isSyncing={isSyncing}
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
              {pages
                .filter((page) => {
                  // Client-side filtering: only show private pages if user is owner
                  // Server fetches ALL pages, client decides what to display
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
