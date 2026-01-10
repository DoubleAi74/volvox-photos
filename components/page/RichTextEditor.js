"use client";

import React, { useMemo, useId } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content here...",
  variant = "light", // "light" or "dark"
  minHeight = "80px",
  maxHeight = "300px",
}) {
  const editorId = useId().replace(/:/g, "");

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

  const formats = ["bold", "italic", "underline", "list", "link"];

  const isDark = variant === "dark";

  if (isDark) {
    return (
      <div id={editorId} className="rounded-[3px] overflow-hidden">
        <style>{`
          #${editorId} .ql-snow {
            border: 1px solid rgb(255 255 255 / 0.1);
            background: rgb(255 255 255 / 0.05);
            border-radius: 3px;
          }
          #${editorId} .ql-toolbar {
            border: none !important;
            border-bottom: 1px solid rgb(255 255 255 / 0.1) !important;
            background: rgb(255 255 255 / 0.03);
            border-radius: 3px 3px 0 0;
            padding: 6px 8px;
          }
          #${editorId} .ql-container {
            border: none !important;
            font-size: 14px;
          }
          #${editorId} .ql-editor {
            color: rgb(255 255 255 / 0.9);
            padding: 12px 16px;
            min-height: ${minHeight};
            max-height: ${maxHeight};
            overflow-y: auto;
          }
          #${editorId} .ql-editor.ql-blank::before {
            color: rgb(255 255 255 / 0.3);
            font-style: normal;
          }
          #${editorId} .ql-toolbar .ql-stroke {
            stroke: rgb(255 255 255 / 0.5);
          }
          #${editorId} .ql-toolbar .ql-fill {
            fill: rgb(255 255 255 / 0.5);
          }
          #${editorId} .ql-toolbar button:hover .ql-stroke,
          #${editorId} .ql-toolbar button.ql-active .ql-stroke {
            stroke: rgb(255 255 255 / 0.9);
          }
          #${editorId} .ql-toolbar button:hover .ql-fill,
          #${editorId} .ql-toolbar button.ql-active .ql-fill {
            fill: rgb(255 255 255 / 0.9);
          }
          #${editorId} .ql-snow.ql-toolbar button:hover {
            background: rgb(255 255 255 / 0.1);
            border-radius: 2px;
          }
          #${editorId} .ql-snow a {
            color: #60a5fa;
          }
          #${editorId}:focus-within .ql-snow {
            border-color: rgb(255 255 255 / 0.2);
            background: rgb(255 255 255 / 0.06);
          }
          #${editorId} .ql-editor::-webkit-scrollbar {
            width: 6px;
          }
          #${editorId} .ql-editor::-webkit-scrollbar-track {
            background: transparent;
          }
          #${editorId} .ql-editor::-webkit-scrollbar-thumb {
            background: rgb(255 255 255 / 0.15);
            border-radius: 3px;
          }
        `}</style>
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
