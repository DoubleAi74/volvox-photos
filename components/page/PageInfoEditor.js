// components/dashboard/PageInfoEditor.jsx
import React, { useEffect, useState, useRef } from "react";
import { listenUserPage, saveUserPage } from "@/lib/data";

export default function PageInfoEditor({
  pid,
  canEdit = false,
  editOn = true,
  initialData = "",
  index,
}) {
  const [text, setText] = useState(initialData);
  const [serverText, setServerText] = useState(initialData);

  const [loading, setLoading] = useState(
    !initialData && initialData !== "" && !!pid
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const saveTimer = useRef(null);

  // ------------------------------------------------------------------
  // STYLES
  // ------------------------------------------------------------------
  const structuralStyles =
    "col-start-1 row-start-1 w-full p-3 text-base leading-relaxed font-sans rounded-sm  break-words whitespace-pre-wrap outline-none resize-none overflow-hidden";

  const transitionStyles =
    "transition-[background-color,border-color,box-shadow] duration-100 ease-in-out";

  useEffect(() => {
    let unsub;
    async function init() {
      if (!pid) {
        setLoading(false);
        return;
      }
      try {
        unsub = listenUserPage(pid, (data) => {
          let remote;
          if (index == 1) {
            remote = data?.infoText1 ?? "";
          } else if (index == 2) {
            remote = data?.infoText2 ?? "";
          }
          setServerText(remote);
          setText((prev) => (prev === serverText ? remote : prev));
          setLoading(false);
        });
      } catch (err) {
        console.error("Error loading dashboard info:", err);
      }
    }
    init();
    return () => {
      if (unsub) unsub();
    };
  }, [pid]);

  useEffect(() => {
    if (!pid || !canEdit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [text, pid, canEdit]);

  async function handleSave() {
    if (!pid || !canEdit) return;
    if (text === serverText) return;
    setSaving(true);
    setError(null);
    try {
      await saveUserPage(pid, text, index);
      setServerText(text);
    } catch (err) {
      console.error("Failed to save dashboard info:", err);
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const isEditing = canEdit && editOn;
  const displayContent = text || serverText || (
    <span className="invisible">&nbsp;</span>
  );

  const showSkeleton = loading && !text && !initialData;

  return (
    <section className="w-full block">
      <div className="relative grid grid-cols-1 w-full min-h-[24px]">
        {showSkeleton ? (
          <div
            className={`${structuralStyles} animate-pulse ${
              isEditing
                ? "bg-white/70 border-gray-300 text-transparent"
                : "bg-white/90 border-transparent text-gray-800 shadow-sm"
            }`}
          >
            &nbsp;
          </div>
        ) : (
          <>
            <div
              className={`${structuralStyles} ${transitionStyles} ${
                isEditing
                  ? "bg-white/70 border-gray-300 text-transparent"
                  : "bg-white/50 border-transparent text-gray-800 shadow-sm"
              }`}
              aria-hidden={isEditing}
            >
              {displayContent}
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter page info..."
              readOnly={!isEditing}
              className={`
                ${structuralStyles}
                absolute inset-0 z-10
                bg-transparent border-transparent text-gray-800
                focus:ring-2 focus:ring-blue-100/50
                ${
                  isEditing
                    ? "opacity-100 visible"
                    : "opacity-0 invisible pointer-events-none"
                }
              `}
            />

            <div
              className={`
                absolute bottom-2 right-2 z-19 pointer-events-none transition-opacity duration-200
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
