"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const { user, loading } = useAuth();
  const router = useRouter();

  // This effect will redirect a logged-in user to their dashboard
  useEffect(() => {
    if (!loading && user && user.usernameTag) {
      router.push(`/${user.usernameTag}`);
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Sanitize input
    const cleanEmail = email.trim().toLowerCase();

    // 2. Validate
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
      console.error("Error adding document: ", error);
      if (error.code === "permission-denied") {
        setStatus("success");
        setMessage("You have been added to the waitlist!");
      } else {
        setStatus("error");
        setMessage("Something went wrong. Please try again later.");
      }
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden font-sans text-white">
      {/* 1. BACKGROUND IMAGE LAYER */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/Background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* 2. GLASS CARD CONTAINER */}
      {/* Kept w-full max-w-lg for mobile, but removed the layout changes inside */}
      <div className="relative z-10 w-full max-w-lg px-4 sm:px-0">
        <div className="relative overflow-hidden rounded-lg bg-black/60 px-8 py-10 shadow-2xl backdrop-blur-md border border-white/5 sm:px-16">
          {/* Content */}
          <div className="relative z-20">
            <div className="text-center">
              {/* REVERTED: gap-1 */}
              <h1 className="flex items-center justify-center gap-1">
                <span className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
                  volvox.pics
                </span>
                <span className="text-lg md:text-2xl font-medium text-gray-400">
                  /your-profile
                </span>
              </h1>
              {/* REVERTED: mt-5 mb-3 */}
              <p className="text-zinc-300 mt-5 mb-3">
                Collect and share your photo albums
              </p>
            </div>

            {/* REVERTED: mt-0 space-y-5 */}
            <form className="mt-0 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>

                <input
                  id="email-address"
                  type="email"
                  autoComplete="email"
                  placeholder="Email address"
                  // CRITICAL FIX: State binding kept
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
                    block w-full rounded-sm
                    border-0 py-3 px-4
                    text-white placeholder:text-zinc-600
                    bg-zinc-900/50

                    ring-1 ring-inset ring-white/10
                    focus:ring-1 focus:ring-inset focus:ring-[#9b9898f7]

                    ring-offset-0 focus:ring-offset-0
                    outline-none focus:outline-none focus-visible:outline-none

                    transition-shadow duration-200
                  "
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={status === "loading" || status === "success"}
                  className={`group relative flex w-full justify-center rounded-sm px-4 py-3 text-sm font-semibold shadow-lg transition-all duration-300 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white
                    ${
                      status === "success"
                        ? "bg-zinc-800 text-green-500 border border-green-900/60 cursor-default"
                        : "bg-zinc-300 text-neutral-700 hover:text-black hover:bg-zinc-400"
                    }
                    ${
                      status === "loading"
                        ? "opacity-70 cursor-not-allowed"
                        : ""
                    }
                  `}
                >
                  {status === "loading" && (
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-zinc-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  {status === "loading"
                    ? ""
                    : status === "success"
                    ? "You're on the list"
                    : "Join Waitlist"}
                </button>
              </div>

              {/* Minimal Feedback Message */}
              {message && (
                <div
                  className={`text-center text-xs tracking-wide uppercase ${
                    status === "error" ? "text-red-500" : "text-zinc-500"
                  }`}
                >
                  {message}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
      <div className="fixed top-6 right-6 z-20">
        <a
          href="/login"
          className="
      group flex items-center gap-2
      rounded-sm px-4 py-2
      bg-black/20 backdrop-blur-md
      border border-white/10
      text-sm text-zinc-300/70
      shadow-lg
      transition-all duration-100
      hover:bg-black/70 hover:text-white
    "
        >
          {/* User/Login SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-4 w-4 text-zinc-400 group-hover:text-white"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 19.5a7.5 7.5 0 0115 0"
            />
          </svg>

          <span className="tracking-wide">Login</span>
        </a>
      </div>
    </div>
  );
}
