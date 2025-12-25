"use client";

export default function ActionButton({
  onClick,
  children,
  active = false,
  title,
  className = "",
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        flex items-center gap-2
        h-[44px] px-4
        rounded-sm
        text-sm
        backdrop-blur-[1px]
        border border-white/10
        transition-colors duration-150
        ${
          active
            ? "bg-black/70 text-white"
            : "bg-black/30 text-zinc-300 hover:bg-black/60 hover:text-white"
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}
