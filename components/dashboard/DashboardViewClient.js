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
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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

export default function DashboardViewClient({ profileUser, initialPages }) {
  const { user: currentUser, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const { updateTheme, themeState } = useTheme();
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

  const refreshWithScrollRestore = useCallback(() => {
    // 1. Capture current position
    scrollRestorePosRef.current = window.scrollY;

    // 2. Set restoration to manual
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // 3. Trigger the refresh
    router.refresh();
  }, [router]);

  const handleQueueEmpty = useCallback(async () => {
    console.log("Queue is empty, reindexing and refreshing...");

    if (currentUser?.uid) {
      // 1. Perform your maintenance tasks
      await reindexPages(currentUser.uid);
      await reconcilePageCount(currentUser.uid);

      // 2. Trigger the refresh inside a transition.
      // This tells Next.js to fetch the new 'initialPages' from the server.
      // Because we use refreshWithScrollRestore, the scroll-lock logic
      // will prevent the jump that the useQueue author was afraid of.
      startTransition(() => {
        refreshWithScrollRestore();
      });
    }
  }, [currentUser?.uid, refreshWithScrollRestore]); // Add

  const { addToQueue, isSyncing } = useQueue(handleQueueEmpty);

  const pagesRef = useRef(initialPages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const deletedIdsRef = useRef(new Set());

  const [loading, setLoading] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [debugOverlay, setDebugOverlay] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [editOn, setEditOn] = useState(searchParams.has("edit"));

  const isOwner =
    currentUser && profileUser && currentUser.uid === profileUser.uid;

  const useLiveContext = themeState.uid === profileUser?.uid;

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

  // Handle Dash Hex Changes
  useEffect(() => {
    if (profileUser?.uid) {
      updateTheme(profileUser.uid, dashHex, backHex);
    }
    if (dashHex === profileUser?.dashboard?.dashHex) return;

    const handler = setTimeout(async () => {
      if (profileUser?.uid) {
        await updateUserColours(profileUser.uid, "dashboard.dashHex", dashHex);
        startTransition(() => {
          refreshWithScrollRestore();
        });
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [dashHex, backHex, profileUser, refreshWithScrollRestore, updateTheme]);

  // Handle Back Hex Changes
  useEffect(() => {
    if (profileUser?.uid) {
      updateTheme(profileUser.uid, dashHex, backHex);
    }
    if (backHex === profileUser?.dashboard?.backHex) return;

    const handler = setTimeout(async () => {
      if (profileUser?.uid) {
        await updateUserColours(profileUser.uid, "dashboard.backHex", backHex);
        startTransition(() => {
          refreshWithScrollRestore();
        });
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [backHex, dashHex, profileUser, refreshWithScrollRestore, updateTheme]);

  const secondHeaderRef = useRef(null);
  const hasScrolledRef = useRef(false);
  const lastUserIdRef = useRef(null);
  const scrollRestorePosRef = useRef(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    // Reset scroll flag when navigating to a different user's dashboard
    const currentUserId = profileUser?.uid;
    if (lastUserIdRef.current !== currentUserId) {
      hasScrolledRef.current = false;
      lastUserIdRef.current = currentUserId;
    }

    // GUARD: If we've already scrolled for this dashboard, EXIT (prevents re-scroll on router.refresh())
    if (hasScrolledRef.current) {
      setIsSynced(true);
      return;
    }

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Force top for the very first landing
    window.scrollTo(0, 0);

    const scrollToTarget = () => {
      if (hasScrolledRef.current) return;
      if (secondHeaderRef.current) {
        // Use scrollTo with explicit offset calculation for better mobile support
        const rect = secondHeaderRef.current.getBoundingClientRect();
        const scrollMargin = window.innerWidth < 640 ? 45 : 80; // matches scroll-mt-[45px] sm:scroll-mt-[80px]
        const targetY = window.scrollY + rect.top - scrollMargin;
        window.scrollTo({ top: targetY, behavior: "instant" });
      }
      hasScrolledRef.current = true;
      setIsSynced(true);
    };

    const waitForFontsAndPaint = async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      // Triple RAF for mobile browsers to ensure layout is stable
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(scrollToTarget);
        });
      });
    };

    waitForFontsAndPaint();
  }, [profileUser?.uid]);

  useEffect(() => {
    setEditOn(searchParams.has("edit"));
  }, [searchParams]);

  useEffect(() => {
    if (!initialPages) return;

    const serverIds = new Set(initialPages.map((p) => p.id));

    // Clean up the deleted IDs ref
    deletedIdsRef.current.forEach((id) => {
      if (!serverIds.has(id)) {
        deletedIdsRef.current.delete(id);
      }
    });

    // 1. Update the state with new data
    setPages((currentLocalPages) => {
      if (currentLocalPages.length > 0 && currentLocalPages[0]?.isSkeleton) {
        return initialPages.filter((p) => !deletedIdsRef.current.has(p.id));
      }

      const validServerPages = initialPages.filter(
        (p) => !deletedIdsRef.current.has(p.id)
      );

      const optimisticPages = currentLocalPages.filter((p) => p.isOptimistic);

      const serverPagesByClientId = new Map();
      validServerPages.forEach((p) => {
        if (p.clientId) serverPagesByClientId.set(p.clientId, p);
      });

      const merged = validServerPages.map((serverPage) => {
        return serverPage;
      });

      optimisticPages.forEach((optPage) => {
        const hasServerVersion =
          optPage.clientId && serverPagesByClientId.has(optPage.clientId);
        const existsById = merged.some((p) => p.id === optPage.id);

        if (!hasServerVersion && !existsById) {
          merged.push(optPage);
        }
      });

      return merged.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    });

    // 2. RESTORE SCROLL POSITION
    // This logic only runs if refreshWithScrollRestore was called
    if (scrollRestorePosRef.current !== null) {
      const savedY = scrollRestorePosRef.current;
      scrollRestorePosRef.current = null; // Reset so it only happens once

      // Use double requestAnimationFrame to wait for the DOM
      // to render the newly 'setPages' data before scrolling.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: savedY,
            behavior: "instant",
          });
        });
      });
    }
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

    const tempSlug = `temp-${pageData.title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")}-${Date.now()}`;

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

        const createdPage = await createPage({
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

        // Replace optimistic page with real server data
        setPages((prev) =>
          prev.map((p) =>
            p.id === tempId
              ? {
                  ...createdPage,
                  isOptimistic: false,
                  isUploadingHeic: false,
                }
              : p
          )
        );
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
    const oldIndex = editingPage.order_index;
    const newIndex = pageData.order_index;

    // 1. Immediate Optimistic Update (Titles, Descriptions, Re-ordering)
    setPages((currentPages) => {
      const updatedList = currentPages.map((p) => {
        if (p.id === targetId) {
          return {
            ...editingPage,
            ...pageData,
            isOptimistic: true,
            isUploadingHeic: pageData.needsServerBlur && !!pageData.pendingFile,
          };
        }

        // Handle re-order shifting logic
        if (oldIndex !== newIndex) {
          if (oldIndex > newIndex) {
            if (p.order_index >= newIndex && p.order_index < oldIndex) {
              return { ...p, order_index: p.order_index + 1 };
            }
          } else {
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

    // 2. Add to Sequential Queue
    addToQueue({
      actionFn: async () => {
        let thumbnailUrl = pageData.thumbnail;
        let blurDataURL = pageData.blurDataURL;

        // Handle File Upload if a new image was selected
        if (pageData.pendingFile) {
          const securePath = `users/${currentUser.uid}/page-thumbnails`;
          thumbnailUrl = await uploadFile(pageData.pendingFile, securePath);

          if (pageData.needsServerBlur) {
            blurDataURL = await fetchServerBlur(thumbnailUrl);
          }

          // Update LOCAL UI with the real URL immediately after upload finishes
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

        // Save to Database
        await updatePage(
          targetId,
          {
            ...cleanPageData,
            thumbnail: thumbnailUrl,
            blurDataURL: blurDataURL || "",
          },
          previousPages
        );

        // Final local state cleanup for this specific item
        setPages((prev) =>
          prev.map((p) =>
            p.id === targetId
              ? { ...p, isOptimistic: false, isUploadingHeic: false }
              : p
          )
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

    // if (
    //   !confirm(
    //     "Are you sure you want to delete this page? This cannot be undone."
    //   )
    // ) {
    //   return;
    // }

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
        alert("Something went wrong. The page could not be deleted.");
      },
    });
  };

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
        className="min-h-[150lvh]"
        style={{
          backgroundColor: hexToRgba(backHex, 1),
          opacity: isSynced && !debugOverlay ? 1 : 0,
          pointerEvents: isSynced && !debugOverlay ? "auto" : "none",
        }}
      >
        {/* 
          FIX: Use 'sticky' instead of 'fixed' + 'env(safe-area-inset-top)' 
          to handle the iPhone notch/dynamic island and browser bars correctly.
        */}
        <div
          className="sticky top-0 left-0 right-0 z-50 w-full"
          style={{
            backgroundColor: backHex,
            paddingTop: "env(safe-area-inset-top, 0px)",
          }}
        >
          <div className="pt-2">
            <DashHeader
              profileUser={profileUser}
              alpha={1}
              editTitleOn={editOn}
              dashHex={dashHex}
              isSyncing={isSyncing}
            />
          </div>
        </div>

        <div
          className="pt-[12px]"
          style={{
            backgroundColor: lighten(backHex, -30),
          }}
        >
          {/* 
            NOTE: The empty 58px clearance div is REMOVED. 
            The sticky header above now occupies its own space naturally.
          */}

          {/* Buttons On mobile at top - RESTORED BLOCK */}
          <div className="left-0 w-full pt-[10px] flex sm:!hidden justify-end px-4 z-[100]">
            <div className="flex justify-end gap-3">
              {isOwner && editOn && (
                <ActionButton
                  onClick={() => setShowCreateModal(true)}
                  title="Create page"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                    />
                  </svg>
                  <span className="hidden sm:inline">New post</span>
                </ActionButton>
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
                  className="w-[54px]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                    style={{ transform: editOn ? "scaleX(-1)" : "none" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                    />
                  </svg>
                  <span className="hidden md:inline">Edit</span>
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={() => router.push("/welcome")}
                  title="Make your page"
                  className="w-[54px] gap-[2px] px-[8px]"
                >
                  <Plus className="w-5 h-5" />
                  <UserIcon className="w-4 h-4" />
                </ActionButton>
              )}

              {authLoading ? null : isOwner ? (
                <ActionButton
                  onClick={handleLogout}
                  className="w-[54px]"
                  title="Log out"
                >
                  <LogOut className="w-5 h-5" />
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={() => router.push("/login")}
                  className="w-[54px]"
                  title="Log in"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" x2="3" y1="12" y2="12" />
                  </svg>
                </ActionButton>
              )}
            </div>
          </div>

          <div className="max-w-8xl mx-auto py-4">
            <div className="flex">
              <div className="w-full mx-4 sm:ml-7 sm:mr-9">
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

        <div
          ref={secondHeaderRef}
          className="sticky top-[74px] sm:top-[94px] left-0 right-0 z-10 pt-0 px-0 scroll-mt-[45px] sm:scroll-mt-[80px]"
        >
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

        <div className={`${editOn ? "h-[12px]" : "h-[40px]"}`}></div>

        <div className="p-[8px] md:p-6">
          {loading || pages.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
              {pages.length === 0 && !loading && !isOwner ? (
                <div className="text-center py-16 w-full col-span-full">
                  <h3 className="text-xl font-semibold text-neumorphic">
                    No public pages.
                  </h3>
                </div>
              ) : (
                <div></div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-[6px] md:gap-5">
              {pages
                .filter((page) => {
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

        <div className="p-6 min-h-[50vh]"></div>

        {authLoading ? (
          <div
            // CHANGE: hidden by default (mobile), block on sm+ (desktop)
            className="hidden sm:block fixed bottom-6 right-6 z-[100]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center gap-2 h-[40px] px-4 rounded-sm bg-black/30 text-zinc-300 backdrop-blur-[1px] border border-white/10 opacity-60 pointer-events-none select-none">
              <UserIcon className="w-5 h-5 animate-pulse" />
              <span className="text-sm">Loading…</span>
            </div>
          </div>
        ) : isOwner ? (
          <div
            // CHANGE: hidden by default (mobile), flex on sm+ (desktop)
            className="hidden sm:flex fixed bottom-6 right-6 z-[100] flex-wrap items-center gap-3"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Cleaned up: Removed the 'false &&' Dev Overlay block entirely */}

            {false && (
              <ActionButton
                onClick={() => setDebugOverlay(!debugOverlay)}
                active={debugOverlay}
                title="Toggle Loading Overlay fixed bottom-30 right-40"
              >
                <Eye className="w-5 h-5" />
                <span className="inline">Dev Overlay</span>
              </ActionButton>
            )}
            {editOn && (
              <ActionButton onClick={() => setShowCreateModal(true)}>
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">New Page</span>
              </ActionButton>
            )}

            <ActionButton onClick={toggleEditMode} active={editOn}>
              {/* Cleaned up: Used one SVG and CSS transform to flip it instead of two separate SVGs */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={`w-5 h-5 transition-transform ${
                  editOn ? "-scale-x-100" : ""
                }`}
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
          </div>
        ) : (
          <div
            // CHANGE: hidden by default (mobile), flex on sm+ (desktop)
            className="hidden sm:flex fixed bottom-6 right-6 z-[100] items-center gap-3"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <ActionButton onClick={() => router.push("/welcome")}>
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Create your collection</span>
            </ActionButton>

            <ActionButton onClick={() => router.push("/login")}>
              <UserIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Login</span>
            </ActionButton>
          </div>
        )}

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
    <div className="p-2 pb-[3px] rounded-[4px] bg-neutral-200/60 shadow-md h-full mb-[0px]">
      <div
        className="w-full aspect-[4/3] mb-1 rounded-sm overflow-hidden relative"
        style={{
          backgroundImage: blurDataURL ? `url("${blurDataURL}")` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: !blurDataURL ? "#e5e5e5" : undefined,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-100/10 to-transparent animate-shimmer" />
        {!blurDataURL && (
          <div className="absolute inset-0 bg-gray-200/50 animate-pulse" />
        )}
      </div>
      <div className="flex pl-1 pr-1 items-center justify-between gap-1 mt-0 h-8 w-full overflow-hidden">
        <div className="h-4 w-3/5 bg-gray-300/50 rounded animate-pulse" />
        <div className="h-3 w-1/4 bg-gray-300/50 rounded animate-pulse" />
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[9999] min-h-[100dvh] overflow-hidden"
      style={{
        backgroundColor: hexToRgba(backHex, 1),
      }}
    >
      <div
        className="sticky z-50 w-full h-[8px]"
        style={{
          backgroundColor: backHex || "#ffffff",
          top: "0px",
        }}
      />

      <div className="fixed top-0 left-0 right-0 z-20 pt-2 px-0">
        <DashHeader
          profileUser={profileUser}
          alpha={1}
          editTitleOn={false}
          dashHex={dashHex}
          isSyncing={false}
        />
      </div>

      <div
        className="pt-[12px]"
        style={{
          backgroundColor: lighten(backHex, -30),
        }}
      ></div>

      <div className="sticky top-[74px] sm:top-[94px] left-0 right-0 z-10 pt-0 px-0">
        <DashHeader
          title={""}
          alpha={1}
          profileUser={profileUser}
          editColOn={false}
          heightShort={true}
          dashHex={lighten(dashHex, 30)}
          backHex={backHex}
        />
      </div>

      <div className="h-[65px] sm:h-[100px]"></div>

      <div className="p-[8px] md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-[6px] md:gap-5">
          {Array.from({ length: Math.max(skeletonCount, 0) }).map((_, i) => (
            <PageSkeleton key={i} blurDataURL={previewBlurs[i] || ""} />
          ))}
        </div>
      </div>
    </div>
  );
}
