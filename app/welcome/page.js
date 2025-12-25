"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import Head from "next/head";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect logged-in users
  useEffect(() => {
    if (!loading && user && user.usernameTag) {
      router.push(`/${user.usernameTag}`);
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");

    try {
      await setDoc(doc(db, "waitlist", cleanEmail), {
        email: cleanEmail,
        createdAt: serverTimestamp(),
      });

      setStatus("success");
      setEmail("");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("Something went wrong. Please try again later.");
    }
  };

  return (
    <>
      {/* ----------------------------------
         PAGE-SCOPED BACKGROUND PRELOAD
      ---------------------------------- */}
      <Head>
        <link
          rel="preload"
          as="image"
          href="/background-2560.webp"
          media="(min-width: 769px)"
        />
        <link
          rel="preload"
          as="image"
          href="/background-1440.webp"
          media="(max-width: 768px)"
        />
      </Head>

      <div className="relative min-h-screen overflow-hidden font-sans text-white">
        {/* ----------------------------------
           BACKGROUND (FADE + DIMINISHING BLUR)
        ---------------------------------- */}
        <div className="absolute inset-0 z-0">
          {/* Instant dark base — prevents white flash */}
          <div className="absolute inset-0 bg-black" />

          {/* Responsive background image */}
          <picture>
            <source srcSet="/background-1440.webp" media="(max-width: 768px)" />
            <img
              src="/background-2560.webp"
              alt=""
              aria-hidden="true"
              fetchpriority="high"
              decoding="async"
              className="
                h-full w-full object-cover
                opacity-0
                motion-safe:animate-[fadeInBlur_1.5s_cubic-bezier(0.16,1,0.3,1)_forwards]
              "
            />
          </picture>

          {/* Translucent theme overlay */}
          <div className="absolute inset-0 bg-black/20" />
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
            <div className="relative overflow-hidden rounded-md bg-black/60 px-8 py-10 shadow-2xl backdrop-blur-[1px] border border-white/5 px-14">
              <div className="text-center">
                <h1 className="flex items-center justify-center gap-1">
                  <span className="text-3xl md:text-4xl font-semibold text-white">
                    volvox.pics
                  </span>
                  <span className="text-2xl md:text-3xl text-gray-400">
                    /your-profile
                  </span>
                </h1>

                <p className="mt-5 mb-3 text-zinc-300">
                  Collect and share your photo albums
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
                    block w-full rounded-sm
                    bg-zinc-900/50 px-4 py-3
                    text-white placeholder:text-zinc-600
                    ring-1 ring-white/10
                    focus:ring-white/40
                    outline-none
                  "
                />

                <button
                  type="submit"
                  disabled={status !== "idle"}
                  className={`
                    w-full rounded-sm py-3 text-sm font-semibold
                    transition-all
                    ${
                      status === "success"
                        ? "bg-zinc-800 text-green-500 cursor-default"
                        : "bg-zinc-300 text-neutral-800 hover:bg-zinc-400"
                    }
                  `}
                >
                  {status === "loading"
                    ? "Joining…"
                    : status === "success"
                    ? "You're on the list"
                    : "Join Waitlist"}
                </button>

                {message && (
                  <div className="text-center text-xs uppercase tracking-wide text-red-500">
                    {message}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* LOGIN BUTTON */}
        <div className="fixed top-6 right-6 z-20">
          <a
            href="/login"
            className="
              flex items-center gap-2 rounded-sm
              bg-black/30 px-4 py-2
              text-sm text-zinc-300
              backdrop-blur-[1px]
              border border-white/10
              hover:bg-black/60 hover:text-white
            "
          >
            Login
          </a>
        </div>
      </div>
    </>
  );
}
