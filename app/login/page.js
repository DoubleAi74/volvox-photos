"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { lowercaseDashed, findAvailableUsernameTag } from "@/lib/data";
import NextLink from "next/link";
import Head from "next/head";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // USERNAME LOGIC
  const [usernameBase, setUsernameBase] = useState("");
  const [suggestedTag, setSuggestedTag] = useState("");
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  const [error, setError] = useState(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { user, loading, signup, login } = useAuth();
  const router = useRouter();

  // Redirect if logged in
  useEffect(() => {
    if (!loading && user?.usernameTag) {
      router.push(`/${user.usernameTag}`);
    }
  }, [user, loading, router]);

  // Debounce & Auto-Assign Tag Logic
  useEffect(() => {
    setSuggestedTag("");
    setIsCheckingUser(false);

    const baseRaw = lowercaseDashed(usernameBase);

    if (isSigningUp && baseRaw.length >= 3) {
      setIsCheckingUser(true);

      const timer = setTimeout(async () => {
        try {
          const availableTag = await findAvailableUsernameTag(baseRaw);
          setSuggestedTag(availableTag);
        } catch (err) {
          console.error("Check failed", err);
        } finally {
          setIsCheckingUser(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [usernameBase, isSigningUp]);

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setProcessing(true);

    try {
      if (isSigningUp) {
        if (!suggestedTag) {
          throw new Error("Please wait for username availability check.");
        }
        await signup(email, password, usernameBase, suggestedTag);
        router.push(`/${suggestedTag}`);
        return;
      }

      const loggedInUser = await login(email, password);
      if (loggedInUser?.usernameTag) {
        router.push(`/${loggedInUser.usernameTag}`);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
      setProcessing(false);
    }
  };

  // Loading Screen
  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-500 border-t-white" />
      </div>
    );
  }

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
          {/* Instant dark base */}
          <div className="absolute inset-0 bg-black" />

          <picture>
            <source srcSet="/background-1440.webp" media="(max-width: 768px)" />
            <img
              src="/background-2560.webp"
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              decoding="async"
              className="
                h-full w-full object-cover
                opacity-0
                motion-safe:animate-[fadeInBlur_1.5s_cubic-bezier(0.16,1,0.3,1)_forwards]
              "
            />
          </picture>

          {/* Theme overlay */}
          <div className="absolute inset-0 bg-black/20" />
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
            <div className="relative overflow-hidden rounded-md bg-black/60 px-14 py-10 shadow-2xl backdrop-blur-[1px] border border-white/5">
              {/* Header */}
              <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                  Volvox Pictures
                </h1>
                <p className="mt-5 mb-6 text-zinc-300">
                  {isSigningUp
                    ? "Create your profile to start collecting"
                    : "Welcome back to your collection"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* USERNAME (SIGN UP ONLY) */}
                {isSigningUp && (
                  <div>
                    <input
                      type="text"
                      value={usernameBase}
                      onChange={(e) => setUsernameBase(e.target.value)}
                      placeholder="Full Name (e.g. Adam Aldridge)"
                      className={`
                        block w-full rounded-sm px-4 py-3
                        bg-zinc-900/50 text-white placeholder:text-zinc-600
                        ring-1 ring-white/10 outline-none
                        focus:ring-white/40
                        ${
                          suggestedTag
                            ? "ring-green-500/30 focus:ring-green-500/50"
                            : ""
                        }
                      `}
                      required
                    />

                    <div className="mt-2 h-5 text-xs tracking-wide">
                      {usernameBase.length > 0 && usernameBase.length < 3 && (
                        <span className="text-zinc-500">Too short</span>
                      )}

                      {usernameBase.length >= 3 && (
                        <>
                          {isCheckingUser ? (
                            <span className="text-zinc-400 animate-pulse">
                              Checking availability…
                            </span>
                          ) : suggestedTag ? (
                            <span className="text-zinc-500">
                              volvox.pics/
                              <span className="ml-1 font-semibold text-green-400">
                                {suggestedTag}
                              </span>
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* EMAIL */}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="
                    block w-full rounded-sm px-4 py-3
                    bg-zinc-900/50 text-white placeholder:text-zinc-600
                    ring-1 ring-white/10 outline-none
                    focus:ring-white/40
                  "
                  required
                />

                {/* PASSWORD */}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="
                    block w-full rounded-sm px-4 py-3
                    bg-zinc-900/50 text-white placeholder:text-zinc-600
                    ring-1 ring-white/10 outline-none
                    focus:ring-white/40
                  "
                  required
                />

                {/* ERROR */}
                {error && (
                  <div className="text-center text-xs uppercase tracking-wide text-red-400">
                    {error}
                  </div>
                )}

                {/* SUBMIT */}
                <button
                  type="submit"
                  disabled={processing || (isSigningUp && !suggestedTag)}
                  className={`
                    w-full rounded-sm py-3 text-sm font-semibold
                    transition-all
                    ${
                      processing || (isSigningUp && !suggestedTag)
                        ? "cursor-not-allowed bg-zinc-300/60 text-neutral-700"
                        : "bg-zinc-300 text-neutral-700 hover:bg-zinc-400"
                    }
                  `}
                >
                  {processing
                    ? isSigningUp
                      ? "Creating account…"
                      : "Logging in…"
                    : isSigningUp
                    ? "Sign Up"
                    : "Log In"}
                </button>
              </form>

              {/* FOOTER */}
              <div className="mt-8 text-center">
                <NextLink
                  href="/welcome"
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Don&apos;t have an account? Join the waitlist.
                </NextLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
