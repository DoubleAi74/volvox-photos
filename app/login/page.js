"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { lowercaseDashed, findAvailableUsernameTag } from "@/lib/data";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // USERNAME LOGIC
  const [usernameBase, setUsernameBase] = useState("");
  const [suggestedTag, setSuggestedTag] = useState(""); // Stores the FINAL available tag
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  const [error, setError] = useState(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Destructure the NEW function
  const { user, loading, signup, login } = useAuth();
  const router = useRouter();

  // Redirect if logged in
  useEffect(() => {
    if (!loading && user?.usernameTag) {
      router.push(`/${user.usernameTag}`);
    }
  }, [user, loading, router]);

  /** ------------------------------------------------------
   *  Debounce & Auto-Assign Tag Logic
   *  ------------------------------------------------------
   */
  useEffect(() => {
    // 1. Reset state when typing
    setSuggestedTag("");
    setIsCheckingUser(false);

    const baseRaw = lowercaseDashed(usernameBase);

    // 2. Only check if length > 2
    if (isSigningUp && baseRaw.length >= 3) {
      setIsCheckingUser(true);

      const timer = setTimeout(async () => {
        try {
          // This function now returns the First Available Tag (e.g. "adam-2")
          const availableTag = await findAvailableUsernameTag(baseRaw);
          setSuggestedTag(availableTag);
        } catch (err) {
          console.error("Check failed", err);
        } finally {
          setIsCheckingUser(false);
        }
      }, 500); // 500ms delay

      return () => clearTimeout(timer);
    }
  }, [usernameBase, isSigningUp, findAvailableUsernameTag]);

  /** ------------------------------------------------------
   *  Submit Handler
   *  ------------------------------------------------------
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setProcessing(true);

    try {
      if (isSigningUp) {
        // Validation: Must have a valid tag confirmed by the server
        if (!suggestedTag) {
          throw new Error("Please wait for username availability check.");
        }

        // Pass the CONFIRMED suggestedTag to the signup function
        await signup(email, password, usernameBase, suggestedTag);

        // Redirect to the new tag
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

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-neumorphic-bg flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-neumorphic-bg shadow-neumorphic-inset animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neumorphic-bg flex items-center justify-center">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-neumorphic-bg shadow-neumorphic">
        <h1 className="text-3xl font-bold text-center text-neumorphic mb-8">
          {isSigningUp ? "Create Account" : "Welcome Back"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSigningUp && (
            <div>
              <label className="block text-sm font-medium text-neumorphic mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameBase}
                  onChange={(e) => setUsernameBase(e.target.value)}
                  placeholder="e.g. Adam Aldridge"
                  className={`w-full px-4 py-3 rounded-xl bg-neumorphic-bg 
                  shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text/70 
                  focus:outline-none transition-colors duration-300
                  ${suggestedTag ? "text-green-600" : ""}`}
                  required
                />

                {/* URL DISPLAY */}
                <div className="mt-2 text-xs font-medium h-5 pl-1">
                  {usernameBase.length > 0 && usernameBase.length < 3 && (
                    <span className="text-gray-400">Too short</span>
                  )}

                  {usernameBase.length >= 3 && (
                    <>
                      {isCheckingUser ? (
                        <span className="text-gray-400 animate-pulse">
                          Checking availability...
                        </span>
                      ) : suggestedTag ? (
                        <span className="text-neumorphic-text/60">
                          volvox.pics/
                          <span className="text-green-600 font-bold">
                            {suggestedTag}
                          </span>
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neumorphic mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg 
              shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text 
              focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neumorphic mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg 
              shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text 
              focus:outline-none"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={processing || (isSigningUp && !suggestedTag)}
              className={`w-full py-3 mt-4 rounded-xl btn-neumorphic shadow-neumorphic 
              text-neumorphic-text font-medium hover:shadow-neumorphic-soft 
              active:shadow-neumorphic-pressed transition 
              ${
                processing || (isSigningUp && !suggestedTag)
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {processing
                ? isSigningUp
                  ? "Creating account…"
                  : "Logging in…"
                : isSigningUp
                ? "Sign Up"
                : "Log In"}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => setIsSigningUp(!isSigningUp)}
            className="text-sm text-neumorphic-text hover:underline"
          >
            {isSigningUp
              ? "Already have an account? Log In"
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
