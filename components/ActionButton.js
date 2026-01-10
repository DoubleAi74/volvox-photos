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
        h-[40px] px-4 
        rounded-sm
        text-sm
        border border-white/10
        transition-colors duration-100
        ${
          active
            ? "bg-black/70 text-white"
            : "bg-black/40 text-zinc-300 hover:bg-black/60 hover:text-white backdrop-blur-[2px]"
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}
