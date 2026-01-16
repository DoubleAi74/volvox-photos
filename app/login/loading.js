// app/login/loading.js
"use client";

export default function Loading() {
  return (
    <div className="relative min-h-screen overflow-hidden font-sans text-white bg-black">
      {/* ----------------------------------
         BACKGROUND SYSTEM
         (Identical to page.js to prevent background flash)
      ---------------------------------- */}
      <div className="absolute inset-0 z-0">
        <picture>
          <source srcSet="/background-800.webp" media="(max-width: 768px)" />
          <img
            src="/background-1920.webp"
            alt=""
            aria-hidden="true"
            // Removed fade-in animation so background is immediately visible
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
          relative z-10 flex min-h-[100svh] flex-col items-center
          justify-start pt-[14svh]
          md:min-h-screen md:justify-center md:pt-0
          px-4
        "
      >
        <div className="w-full max-w-lg">
          {/* 
            THE GREY BOX 
            Removed fixed height. 
            Kept exact padding (px-14 py-10) and styles from page.js
          */}
          <div className="relative overflow-hidden rounded-md bg-black/60 px-14 py-[38px] shadow-2xl backdrop-blur-[1px] border border-white/5">
            {/* 
               1. SPINNER LAYER (Absolute Center)
               Sits on top of the ghost content
            */}
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-500 border-t-white" />
            </div>

            {/* 
               2. GHOST CONTENT LAYER (Invisible)
               Replicates the structure of the "Log In" view (Header + 2 Inputs + Button + Footer)
               to force the container to the perfect size.
            */}
            <div className="invisible opacity-0 select-none" aria-hidden="true">
              {/* Header */}
              <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                  Volvox Pictures
                </h1>
                <p className="mt-5 mb-6 text-zinc-300">
                  Welcome back to your collection
                </p>
              </div>

              {/* Form Placeholders (2 Inputs + Button) */}
              <div className="space-y-5">
                {/* Email Input Placeholder */}
                <div className="block w-full rounded-sm px-4 py-3 border border-transparent">
                  &nbsp;
                </div>

                {/* Password Input Placeholder */}
                <div className="block w-full rounded-sm px-4 py-3 border border-transparent">
                  &nbsp;
                </div>

                {/* Submit Button Placeholder */}
                <div className="w-full rounded-sm py-3 text-sm font-semibold">
                  &nbsp;
                </div>
              </div>

              {/* Footer Placeholder */}
              <div className="mt-8 text-center">
                <span className="text-xs text-zinc-500">
                  Don&apos;t have an account? Join the waitlist.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
