"use client";
import { useEffect, useState, forwardRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import {
  lowercaseDashed,
  findAvailableUsernameTag,
  updateUsername,
} from "@/lib/data";

import { X } from "lucide-react";

export function lighten(hex, amount = 30) {
  hex = hex.replace("#", "");
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.min(255, r + amount);
  g = Math.min(255, g + amount);
  b = Math.min(255, b + amount);
  const toHex = (v) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function DashHeaderInner(
  {
    profileUser,
    alpha,
    editColOn = false,
    editTitleOn = false,
    openColor,
    heightShort = false,
    className,
    dashHex,
    setDashHex,
    backHex,
    setBackHex,
    isSyncing = false,
  },
  ref
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // 1. OPTIMISTIC STATE: Initialize from URL, but allow local overrides
  const [titleEditOn, setTitleEditOn] = useState(
    searchParams.get("edit") === "title"
  );

  const [savedTitle, setSavedTitle] = useState(
    profileUser?.usernameTitle ?? ""
  );
  const [savedTag, setSavedTag] = useState(profileUser?.usernameTag ?? "");

  const [tempTitleText, setTempTitleText] = useState(
    profileUser && !heightShort ? `${profileUser.usernameTitle}` : ""
  );

  const [suggestedTag, setSuggestedTag] = useState("");
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // // B. DEBOUNCED COLOR SAVE
  // useEffect(() => {
  //   if (headerColor === initialHex) return;

  //   const timer = setTimeout(async () => {
  //     if (profileUser) {
  //       try {
  //         await changeHexGlobal(profileUser.uid, headerColor);
  //         router.refresh();
  //       } catch (error) {
  //         console.error("Failed to auto-save color:", error);
  //       }
  //     }
  //   }, 500);

  //   return () => clearTimeout(timer);
  // }, [headerColor, initialHex, profileUser, router]);

  useEffect(() => {
    if (profileUser) {
      setSavedTitle(profileUser.usernameTitle);
      setSavedTag(profileUser.usernameTag);
      setTempTitleText(!heightShort ? profileUser.usernameTitle : "");
    }
  }, [profileUser]);

  // 2. SYNC EFFECT: Ensure browser Back/Forward buttons still update the UI
  useEffect(() => {
    setTitleEditOn(searchParams.get("edit") === "title");
  }, [searchParams]);

  // 3. OPTIMISTIC TOGGLE HANDLER
  const toggleTitleEdit = () => {
    // A. Instant UI Update
    const nextState = !titleEditOn;
    setTitleEditOn(nextState);

    // B. Background URL Update
    const params = new URLSearchParams(searchParams.toString());

    if (nextState) {
      params.set("edit", "title");
    } else {
      // Revert to "true" (General Edit Mode) when closing title edit
      params.set("edit", "true");
    }

    // This happens asynchronously now, preventing the UI lag
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const baseRaw = lowercaseDashed(tempTitleText);

    // if (profileUser && tempTitleText === profileUser.usernameTitle) {
    //   setSuggestedTag(profileUser.usernameTag);
    //   setIsCheckingUser(false);
    //   return;
    // }

    if (tempTitleText === savedTitle) {
      setSuggestedTag(savedTag);
      setIsCheckingUser(false);
      return;
    }

    setSuggestedTag("");
    setIsCheckingUser(false);

    if (baseRaw.length >= 3) {
      setIsCheckingUser(true);

      const timer = setTimeout(async () => {
        try {
          const previousTag = profileUser?.usernameTag || "";
          const availableTag = await findAvailableUsernameTag(
            baseRaw,
            previousTag
          );
          setSuggestedTag(availableTag);
        } catch (err) {
          console.error("Check failed", err);
        } finally {
          setIsCheckingUser(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [tempTitleText, profileUser]);

  const handleSaveUsername = async () => {
    if (isCheckingUser) return alert("Still checking availability...");
    if (!suggestedTag) return alert("Invalid or unavailable username.");

    setIsSaving(true);

    try {
      await updateUsername(profileUser.uid, suggestedTag, tempTitleText);

      // Update local confirmed state
      setSavedTitle(tempTitleText);
      setSavedTag(suggestedTag);

      router.replace(`/${suggestedTag}?edit=title`, { scroll: false });
    } catch (error) {
      console.error("Error saving username:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const combinedClassName = `backdrop-blur-md  ${className || ""}`;

  return (
    <>
      <div
        ref={ref}
        role="banner"
        className={combinedClassName}
        style={{
          backgroundColor: hexToRgba(dashHex, alpha),
        }}
      >
        <div className="mx-auto max-w-8xl px-0">
          <div
            className={`flex items-center justify-between gap-4 ${
              heightShort ? "min-h-[20px]" : "min-h-[70px] sm:min-h-[90px]"
            }`}
          >
            <div className="flex gap-1 min-w-0 flex-1 items-center relative">
              <h1
                className={`text-2xl sm:text-4xl font-extrabold tracking-tight drop-shadow pr-4 pl-6  sm:pl-8 break-words leading-tight ${
                  heightShort ? "" : "pt-5 pb-1"
                }`}
                style={{ color: lighten(dashHex, 230) }}
              >
                {tempTitleText}
              </h1>

              {editTitleOn && (
                <div className="relative inline-flex items-center shrink-0">
                  <button
                    // Updated to use the Optimistic Handler
                    onClick={toggleTitleEdit}
                    className={`peer h-9 w-9 mt-[16px] ml-2 mr-4 appearance-none rounded-sm border border-white/40 bg-black/20 backdrop-blur-sm transition-colors duration-150 cursor-pointer ${
                      titleEditOn
                        ? "bg-black/60 border-black/70"
                        : "hover:bg-black/30"
                    }`}
                  >
                    {!titleEditOn ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        className={`pointer-events-none absolute inset-0 m-auto h-5 w-5 stroke-current ${
                          titleEditOn ? "text-gray-50" : "text-gray-200"
                        }`}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                        />
                      </svg>
                    ) : (
                      <X className="pointer-events-none absolute inset-0 m-auto h-5 w-5 text-gray-200 " />
                    )}
                  </button>
                </div>
              )}
            </div>

            {(editColOn || openColor) && (
              <div className=" flex shrink-0  py-2 px-7 gap-2">
                <input
                  type="color"
                  className=" h-8 w-9   cursor-pointer  rounded-sm  border border-white/50 bg-white/10  px-[2px] shadow"
                  value={backHex}
                  onChange={(e) => setBackHex && setBackHex(e.target.value)}
                />
                <input
                  type="color"
                  className="h-8 w-9  cursor-pointer  rounded-sm border border-white/50 bg-white/10 px-[2px] shadow"
                  value={dashHex}
                  onChange={(e) => setDashHex && setDashHex(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {isSyncing && !heightShort && (
        <span
          className="absolute bottom-4 right-5 text-xs ml-2 opacity-70 font-normal"
          style={{ color: lighten(dashHex, 200) }}
        >
          Saving changes...
        </span>
      )}

      {/* Render based on optimistic state (titleEditOn) */}
      {titleEditOn && editTitleOn && (
        <div className="px-3 w-full ">
          <div className="w-full sm:w-[500px] p-2 pr-4 bg-black/40 backdrop-blur-md rounded-b-md text-white min-h-[80px]">
            <input
              type="text"
              className="focus:outline-none text-black w-full  sm:w-4/5 p-1"
              value={tempTitleText}
              onChange={(e) => setTempTitleText(e.target.value)}
            />
            <div className="flex justify-between items-baseline ">
              <div className="mt-1 text-sm font-bold w-4/5 text-xs">
                {isCheckingUser ? (
                  <span className="animate-pulse">volvox.pics/...</span>
                ) : suggestedTag ? (
                  <span className="bg-gray-900">
                    volvox.pics/{suggestedTag}
                  </span>
                ) : (
                  <span>Type to check availability</span>
                )}
              </div>
              <button
                className="bg-gray-400 px-2 absolute bottom-2 right-3 rounded-sm"
                onClick={handleSaveUsername}
                disabled={isSaving || isCheckingUser || !suggestedTag}
              >
                {isSaving
                  ? "..."
                  : savedTitle === tempTitleText
                  ? "Saved"
                  : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default forwardRef(DashHeaderInner);
