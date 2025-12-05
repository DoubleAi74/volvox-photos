// components/dashboard/DashboardInfoEditor.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  fetchUserDashboard,
  listenUserDashboard,
  saveUserDashboard,
} from "@/lib/data"; // adjust path to match your project

/**
 * Props:
 *  - uid: string | null  -> the target user's uid whose dashboard info we should show
 *  - canEdit: boolean    -> whether to show editor UI (defaults to false)
 */
export default function DashboardInfoEditor({
  uid,
  canEdit = false,
  editOn = true,
  initialData = "",
}) {
  // 1. Initialize with Server Data immediately
  // The page loads with content already present. No "Loading..." state needed.
  const [text, setText] = useState(initialData);
  const [serverText, setServerText] = useState(initialData);

  // Start loading as false if we have data
  const [loading, setLoading] = useState(!initialData && !!uid);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const saveTimer = useRef(null);
  //   const [editOn, setEditOn] = useState(false);

  useEffect(() => {
    let unsub;

    async function init() {
      if (!uid) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // 2) Simply subscribe for live updates (Realtime Listener)
        unsub = listenUserDashboard(uid, (data) => {
          const remote = data?.infoText ?? "";
          setServerText(remote);

          // Only update local text if the user hasn't started typing yet
          // (Compares against the previous server version)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // autosave when editable
  useEffect(() => {
    if (!uid || !canEdit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, uid, canEdit]);

  async function handleSave() {
    if (!uid || !canEdit) return;
    if (text === serverText) return;
    setSaving(true);
    setError(null);
    try {
      // we pass editor uid as null here — server rules will enforce auth; if you want to pass editor id,
      // call saveUserDashboard(uid, text, currentUser.uid) from the caller or grab auth here.
      await saveUserDashboard(uid, text, null);
      setServerText(text);
    } catch (err) {
      console.error("Failed to save dashboard info:", err);
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-3 mt-[-15px]">
      {/* Optimization: Only show "Loading" if we truly have NO data.
         Since we passed initialData, this skeleton rarely shows, eliminating the flicker.
      */}
      {loading && !text ? (
        <div className="text-sm text-muted animate-pulse">Loading info...</div>
      ) : canEdit ? (
        editOn ? (
          // ... Your existing Edit Mode UI ...
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full p-3 border rounded-md resize-none"
              placeholder="Write something for your dashboard..."
            />
            <div className="absolute bottom-5 right-3">
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                {saving
                  ? "Saving..."
                  : error ??
                    (text === serverText ? "Saved" : "Unsaved changes")}
              </label>
            </div>
          </div>
        ) : (
          // ... Your existing Preview Mode UI ...
          <div className="prose max-w-none relative">
            {serverText ? (
              <div
                className="bg-[#f7efe4] p-3 rounded-md shadow-sm text-[#474747]"
                dangerouslySetInnerHTML={{ __html: serverText }}
              />
            ) : (
              <div className="text-sm text-neutral-500">Welcome</div>
            )}
          </div>
        )
      ) : (
        // Read-only view for visitors
        <div className="prose max-w-none">
          {serverText ? (
            <div
              className="bg-[#f7efe4] p-3 rounded-md shadow-sm"
              dangerouslySetInnerHTML={{ __html: serverText }}
            />
          ) : (
            <div className="text-sm bg-[#f7efe4] text-neutral-500">Welcome</div>
          )}
        </div>
      )}
    </section>
  );
}
