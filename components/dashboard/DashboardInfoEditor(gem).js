// components/dashboard/DashboardInfoEditor.jsx
import React, { useEffect, useState, useRef } from "react";
import { listenUserDashboard, saveUserDashboard } from "@/lib/data";

export default function DashboardInfoEditor({
  uid,
  canEdit = false,
  editOn = true,
  initialData = "",
}) {
  const [text, setText] = useState(initialData);
  const [serverText, setServerText] = useState(initialData);

  const [loading, setLoading] = useState(!initialData && !!uid);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const saveTimer = useRef(null);

  // ------------------------------------------------------------------
  // STYLES (Ported from PageInfoEditor)
  // ------------------------------------------------------------------
  const structuralStyles =
    "col-start-1 row-start-1 w-full p-3 text-base leading-relaxed font-sans rounded-md break-words whitespace-pre-wrap outline-none resize-none overflow-hidden";

  const transitionStyles =
    "transition-[background-color,border-color,box-shadow] duration-100 ease-in-out";

  useEffect(() => {
    let unsub;
    async function init() {
      if (!uid) {
        setLoading(false);
        return;
      }
      try {
        unsub = listenUserDashboard(uid, (data) => {
          const remote = data?.infoText ?? "";
          setServerText(remote);
          setText((prev) => (prev === serverText ? remote : prev));
          setLoading(false);
        });
      } catch (err) {
        console.error("Error connecting to dashboard listener:", err);
      }
    }
    init();
    return () => {
      if (unsub) unsub();
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || !canEdit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [text, uid, canEdit]);

  async function handleSave() {
    if (!uid || !canEdit) return;
    if (text === serverText) return;
    setSaving(true);
    setError(null);
    try {
      await saveUserDashboard(uid, text, null);
      setServerText(text);
    } catch (err) {
      console.error("Failed to save dashboard info:", err);
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const isEditing = canEdit && editOn;

  // Handle empty state so height doesn't collapse
  const displayContent = text || serverText || (
    <span className="invisible">&nbsp;</span>
  );

  const showSkeleton = loading && !text && !initialData;

  return (
    <section className="w-full block mb-3 mt-[-15px] z-9">
      <div className="relative grid grid-cols-1 w-full min-h-[24px]">
        {showSkeleton ? (
          <div
            className={`${structuralStyles} animate-pulse ${
              isEditing
                ? "bg-white/70 border-gray-300 text-transparent"
                : "bg-neutral-200/30 border-transparent text-gray-800 shadow-sm"
            }`}
          >
            &nbsp;
          </div>
        ) : (
          <>
            {/* The Display Layer (Bottom) - Controls Height */}
            <div
              className={`${structuralStyles} ${transitionStyles} ${
                isEditing
                  ? "bg-white/70 border-gray-300 text-transparent" // Text invisible in edit mode to avoid double vision
                  : "bg-[#f7efe4] border-transparent text-[#474747] shadow-sm" // Dashboard specific styling
              }`}
              aria-hidden={isEditing}
            >
              {displayContent}
            </div>

            {/* The Input Layer (Top) - Absolute positioned if we wanted, 
                but using Grid Cell stacking places it exactly on top */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write something for your dashboard..."
              readOnly={!isEditing}
              className={`
                ${structuralStyles}
                absolute inset-0 z-9
                bg-transparent border-transparent text-[#474747]
                focus:ring-2 focus:ring-blue-100/50
                ${
                  isEditing
                    ? "opacity-100 visible"
                    : "opacity-0 invisible pointer-events-none"
                }
              `}
            />

            {/* Floating Status Label */}
            <div
              className={`
                absolute bottom-2 right-2 z-9 pointer-events-none transition-opacity duration-200
                ${isEditing ? "opacity-100" : "opacity-0"}
              `}
            >
              <label className="text-xs text-neutral-500 font-medium bg-white/90 px-1.5 py-0.5 rounded shadow-sm border border-neutral-100">
                {saving
                  ? "Saving..."
                  : error ?? (text === serverText ? "Saved" : "Unsaved")}
              </label>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
