// app/welcome/loading.js
"use client";

export default function Loading() {
  return (
    <div className="relative min-h-screen overflow-hidden font-sans text-white bg-black">
      {/* ----------------------------------
         BACKGROUND SYSTEM
         (Kept identical to page.js to prevent flickering)
      ---------------------------------- */}
      <div className="absolute inset-0 z-0">
        {/* Note: We use the same Mobile/Desktop placeholders logic if you want 
            perfect 1:1, but for loading, usually just the high-res or blur is fine. 
            We will match the high-res structure here. 
        */}
        <picture>
          <source srcSet="/background-800.webp" media="(max-width: 768px)" />
          <img
            src="/background-1920.webp"
            alt=""
            aria-hidden="true"
            // We keep the object-cover but remove the fade-in animation
            // so the background is visible immediately while loading
            className="h-full w-full object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      </div>

      {/* ----------------------------------
         CONTENT
      ---------------------------------- */}
      <div
        className="
          relative z-10 flex min-h-screen flex-col items-center
          justify-start pt-[19svh]
          md:justify-center md:pt-0
          px-4
        "
      >
        <div className="w-full max-w-lg">
          {/* 
            THE GREY BOX 
            We remove 'h-[284px]' and 'flex items-center justify-center'
            We keep the exact padding/styling from page.js
          */}
          <div className="relative overflow-hidden rounded-md bg-black/60 px-8 py-[39px] shadow-2xl backdrop-blur-[1px] border border-white/5 sm:px-14">
            {/* 
               1. SPINNER LAYER (Absolute Center)
               This sits on top of the ghost content
            */}
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-500 border-t-white" />
            </div>

            {/* 
               2. GHOST CONTENT LAYER (Invisible)
               This mimics page.js exactly to force the container to the correct size.
               We use 'invisible' so it takes up space but isn't seen.
            */}
            <div className="invisible opacity-0 select-none" aria-hidden="true">
              <div className="text-center">
                <h1 className="flex flex-wrap items-center justify-center gap-1">
                  <span className="text-3xl md:text-4xl font-semibold text-white">
                    volvox.pics
                  </span>
                  <span className="text-2xl md:text-3xl text-gray-400 whitespace-nowrap">
                    /your-profile
                  </span>
                </h1>
                <p className="mt-5 mb-3 text-zinc-300">
                  Collect and share your photo albums
                </p>
              </div>

              {/* Mimic the form inputs spacing */}
              <div className="space-y-5">
                {/* Mimic Input Height (py-3 + line-height) */}
                <div className="block w-full rounded-sm border border-transparent px-4 py-3">
                  &nbsp;
                </div>
                {/* Mimic Button Height */}
                <div className="w-full rounded-sm py-3 text-sm font-semibold">
                  &nbsp;
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LOGIN BUTTON */}
      <div className="fixed top-6 right-6 z-20">
        <div className="flex items-center gap-2 rounded-sm bg-black/30 px-4 py-2 text-sm text-transparent backdrop-blur-[1px] border border-white/10">
          Login
        </div>
      </div>
    </div>
  );
}
