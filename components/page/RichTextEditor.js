"use client";

import React, { useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // This now works alongside globals.css

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content here...",
}) {
  const modules = useMemo(
    () => ({
      toolbar: [
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
      ],
    }),
    []
  );

  const formats = ["bold", "italic", "underline", "list", "bullet", "link"];

  return (
    <div className="rounded-xl overflow-hidden shadow-neumorphic-inset bg-neumorphic-bg">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
