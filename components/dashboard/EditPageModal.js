"use client";

import React, { useState, useEffect } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { uploadFile } from "@/lib/data";
import ImageWithLoader from "@/components/ImageWithLoader";
import { useAuth } from "@/context/AuthContext";

export default function EditPageModal({ isOpen, page, onClose, onSubmit }) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    thumbnail: "",
    order_index: 0,
    isPrivate: false,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (page) {
      setFormData({
        title: page.title || "",
        description: page.description || "",
        thumbnail: page.thumbnail || "",
        order_index: page.order_index || 0,
      });
    }
  }, [page]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const dataToSend = {
      ...formData,
      order_index: Number(formData.order_index) || 0,
    };

    onSubmit(dataToSend);
  };

  // const handleFileUpload = async (e) => {
  //   const file = e.target.files[0];
  //   if (!file) return;

  //   setUploading(true);
  //   try {
  //     const file_url = await uploadFile(file, "page-thumbnails");
  //     setFormData((prev) => ({ ...prev, thumbnail: file_url }));
  //   } catch (error) {
  //     console.error("Upload failed:", error);
  //     alert("Upload failed. See console for details.");
  //   }
  //   setUploading(false);
  // };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const userId = user?.uid;
    if (!userId) {
      alert("You must be logged in to upload a file.");
      return;
    }

    setUploading(true);
    try {
      // THIS IS THE KEY CHANGE
      const securePath = `users/${userId}/page-thumbnails`;
      const file_url = await uploadFile(file, securePath);
      setFormData((prev) => ({ ...prev, thumbnail: file_url }));
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. See console for details.");
    }
    setUploading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[200] p-4">
      <div className="bg-neumorphic-bg rounded-2xl shadow-neumorphic p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-neumorphic">Edit Page</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg btn-neumorphic shadow-neumorphic hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed"
          >
            <X className="w-5 h-5 text-neumorphic-text" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neumorphic mb-2">
              Page Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text/70 focus:outline-none"
              placeholder="Enter page title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neumorphic mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text/70 focus:outline-none resize-none"
              placeholder="Enter page description"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neumorphic mb-2">
              Order Index
            </label>
            <input
              type="number"
              min="0"
              value={formData.order_index}
              onChange={(e) => {
                const value = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  // Allow an empty string for typing, otherwise parse to integer
                  order_index: value === "" ? "" : parseInt(value, 10),
                }));
              }}
              className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text/70 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isPrivateEditCheckbox"
              checked={formData.isPrivate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  isPrivate: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded bg-neumorphic-bg shadow-neumorphic-inset appearance-none checked:bg-blue-900 cursor-pointer"
            />
            <label
              htmlFor="isPrivateEditCheckbox"
              className="text-sm font-medium text-neumorphic cursor-pointer"
            >
              Make this page private
            </label>

            <input
              type="checkbox"
              id="isPublicEditCheckbox"
              checked={formData.isPublic}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  isPublic: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded bg-neumorphic-bg shadow-neumorphic-inset appearance-none checked:bg-blue-900 cursor-pointer"
            />
            <label
              htmlFor="isPublicEditCheckbox"
              className="text-sm font-medium text-neumorphic cursor-pointer"
            >
              Make this page public
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neumorphic mb-2">
              Thumbnail Image
            </label>
            <div className="flex items-center gap-4">
              {formData.thumbnail ? (
                <div className="w-16 h-16 rounded-lg overflow-hidden shadow-neumorphic-inset">
                  <ImageWithLoader
                    src={formData.thumbnail}
                    alt="Thumbnail Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-neumorphic-bg shadow-neumorphic-inset flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-neumorphic-text" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="page-thumbnail-edit-upload"
                />
                <label
                  htmlFor="page-thumbnail-edit-upload"
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg btn-neumorphic shadow-neumorphic text-sm text-neumorphic-text cursor-pointer hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Change Image"}
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl btn-neumorphic shadow-neumorphic text-neumorphic-text hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl btn-neumorphic shadow-neumorphic text-neumorphic-text font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!formData.title.trim() || uploading}
            >
              Update Page
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
