"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { lowercaseDashed, findAvailableUsernameTag } from "@/lib/data";
import NextLink from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // USERNAME LOGIC
  const [usernameBase, setUsernameBase] = useState("");
  const [suggestedTag, setSuggestedTag] = useState("");
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  const [error, setError] = useState(null);
  const [isSigningUp, setIsSigningUp] = useState(false); // Default to Login
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
  }, [usernameBase, isSigningUp, findAvailableUsernameTag]);

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

  // Loading Screen (Dark Theme)
  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-500 border-t-white"></div>
      </div>
    );
  }

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
      <div className="relative z-10 w-full max-w-lg px-4 sm:px-0">
        <div className="relative overflow-hidden rounded-lg bg-black/60 px-8 py-10 shadow-2xl backdrop-blur-md border border-white/5 sm:px-16">
          {/* Header */}
          <div className="text-center">
            <h1 className="flex items-center justify-center gap-1">
              <span className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
                Volvox Pictures
              </span>
            </h1>
            <p className="text-zinc-300 mt-5 mb-6">
              {isSigningUp
                ? "Create your profile to start collecting"
                : "Welcome back to your collection"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-0 space-y-5">
            {/* USERNAME FIELD (Only for Sign Up) */}
            {isSigningUp && (
              <div>
                <label className="sr-only">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={usernameBase}
                    onChange={(e) => setUsernameBase(e.target.value)}
                    placeholder="Full Name (e.g. Adam Aldridge)"
                    className={`
                      block w-full rounded-sm
                      border-0 py-3 px-4
                      text-white placeholder:text-zinc-600
                      bg-zinc-900/50
                      ring-1 ring-inset ring-white/10
                      focus:ring-1 focus:ring-inset focus:ring-[#9b9898f7]
                      outline-none transition-shadow duration-200
                      ${
                        suggestedTag
                          ? "ring-green-500/30 focus:ring-green-500/50"
                          : ""
                      }
                    `}
                    required
                  />

                  {/* Availability Feedback */}
                  <div className="mt-2 h-5 text-xs font-medium tracking-wide">
                    {usernameBase.length > 0 && usernameBase.length < 3 && (
                      <span className="text-zinc-500">Too short</span>
                    )}

                    {usernameBase.length >= 3 && (
                      <>
                        {isCheckingUser ? (
                          <span className="text-zinc-400 animate-pulse">
                            Checking availability...
                          </span>
                        ) : suggestedTag ? (
                          <span className="text-zinc-500">
                            volvox.pics/
                            <span className="text-green-400 font-semibold ml-0.5">
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

            {/* EMAIL FIELD */}
            <div>
              <label className="sr-only">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="
                  block w-full rounded-sm
                  border-0 py-3 px-4
                  text-white placeholder:text-zinc-600
                  bg-zinc-900/50
                  ring-1 ring-inset ring-white/10
                  focus:ring-1 focus:ring-inset focus:ring-[#9b9898f7]
                  outline-none transition-shadow duration-200
                "
                required
              />
            </div>

            {/* PASSWORD FIELD */}
            <div>
              <label className="sr-only">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="
                  block w-full rounded-sm
                  border-0 py-3 px-4
                  text-white placeholder:text-zinc-600
                  bg-zinc-900/50
                  ring-1 ring-inset ring-white/10
                  focus:ring-1 focus:ring-inset focus:ring-[#9b9898f7]
                  outline-none transition-shadow duration-200
                "
                required
              />
            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <div className="text-center text-xs text-red-400 tracking-wide uppercase">
                {error}
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div>
              <button
                type="submit"
                disabled={processing || (isSigningUp && !suggestedTag)}
                className={`group relative flex w-full justify-center rounded-sm px-4 py-3 text-sm font-semibold shadow-lg transition-all duration-300 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white
                  ${
                    processing || (isSigningUp && !suggestedTag)
                      ? "opacity-50 cursor-not-allowed bg-zinc-300 text-neutral-700"
                      : "bg-zinc-300 text-neutral-700 hover:text-black hover:bg-zinc-400"
                  }
                `}
              >
                {processing
                  ? isSigningUp
                    ? "Creating account..."
                    : "Logging in..."
                  : isSigningUp
                  ? "Sign Up"
                  : "Log In"}
              </button>
            </div>
          </form>

          {/* FOOTER LINKS */}
          <div className="mt-8 flex flex-col items-center space-y-3 text-sm">
            {/* Toggle Login/Signup */}
            {/* <button
              onClick={() => {
                setIsSigningUp(!isSigningUp);
                setError(null);
                setUsernameBase("");
              }}
              className="text-zinc-400 hover:text-white transition-colors duration-200 underline underline-offset-4"
            >
              {isSigningUp
                ? "Already have an account? Log in."
                : "New here? Create an account."}
            </button> */}

            {/* Waitlist Link */}
            <NextLink
              href="/"
              className="text-zinc-500 text-xs hover:text-zinc-300 transition-colors duration-200"
            >
              Don&apos;t have an account code? Join the waitlist.
            </NextLink>
          </div>
        </div>
      </div>
    </div>
  );
}

// "use client";

// import { useState, useEffect } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useRouter } from "next/navigation";
// import { lowercaseDashed, findAvailableUsernameTag } from "@/lib/data";
// // import { Link } from "lucide-react";
// import NextLink from "next/link";

// export default function LoginPage() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   // USERNAME LOGIC
//   const [usernameBase, setUsernameBase] = useState("");
//   const [suggestedTag, setSuggestedTag] = useState(""); // Stores the FINAL available tag
//   const [isCheckingUser, setIsCheckingUser] = useState(false);

//   const [error, setError] = useState(null);
//   const [isSigningUp, setIsSigningUp] = useState(false);
//   const [processing, setProcessing] = useState(false);

//   // Destructure the NEW function
//   const { user, loading, signup, login } = useAuth();
//   const router = useRouter();

//   // Redirect if logged in
//   useEffect(() => {
//     if (!loading && user?.usernameTag) {
//       router.push(`/${user.usernameTag}`);
//     }
//   }, [user, loading, router]);

//   /** ------------------------------------------------------
//    *  Debounce & Auto-Assign Tag Logic
//    *  ------------------------------------------------------
//    */
//   useEffect(() => {
//     // 1. Reset state when typing
//     setSuggestedTag("");
//     setIsCheckingUser(false);

//     const baseRaw = lowercaseDashed(usernameBase);

//     // 2. Only check if length > 2
//     if (isSigningUp && baseRaw.length >= 3) {
//       setIsCheckingUser(true);

//       const timer = setTimeout(async () => {
//         try {
//           // This function now returns the First Available Tag (e.g. "adam-2")
//           const availableTag = await findAvailableUsernameTag(baseRaw);
//           setSuggestedTag(availableTag);
//         } catch (err) {
//           console.error("Check failed", err);
//         } finally {
//           setIsCheckingUser(false);
//         }
//       }, 500); // 500ms delay

//       return () => clearTimeout(timer);
//     }
//   }, [usernameBase, isSigningUp, findAvailableUsernameTag]);

//   /** ------------------------------------------------------
//    *  Submit Handler
//    *  ------------------------------------------------------
//    */
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError(null);
//     setProcessing(true);

//     try {
//       if (isSigningUp) {
//         // Validation: Must have a valid tag confirmed by the server
//         if (!suggestedTag) {
//           throw new Error("Please wait for username availability check.");
//         }

//         // Pass the CONFIRMED suggestedTag to the signup function
//         await signup(email, password, usernameBase, suggestedTag);

//         // Redirect to the new tag
//         router.push(`/${suggestedTag}`);
//         return;
//       }

//       const loggedInUser = await login(email, password);
//       if (loggedInUser?.usernameTag) {
//         router.push(`/${loggedInUser.usernameTag}`);
//       }
//     } catch (err) {
//       console.error(err);
//       setError(err.message);
//       setProcessing(false);
//     }
//   };

//   if (loading && !user) {
//     return (
//       <div className="min-h-screen bg-neumorphic-bg flex items-center justify-center">
//         <div className="w-16 h-16 rounded-full bg-neumorphic-bg shadow-neumorphic-inset animate-pulse"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-neumorphic-bg flex items-center justify-center">
//       <div className="w-full max-w-sm p-8 rounded-2xl bg-neumorphic-bg shadow-neumorphic">
//         <h1 className="text-3xl font-bold text-center text-neumorphic mb-8">
//           {isSigningUp ? "Create Account" : "Welcome Back"}
//         </h1>

//         <form onSubmit={handleSubmit} className="space-y-6">
//           {isSigningUp && (
//             <div>
//               <label className="block text-sm font-medium text-neumorphic mb-2">
//                 Username
//               </label>
//               <div className="relative">
//                 <input
//                   type="text"
//                   value={usernameBase}
//                   onChange={(e) => setUsernameBase(e.target.value)}
//                   placeholder="e.g. Adam Aldridge"
//                   className={`w-full px-4 py-3 rounded-xl bg-neumorphic-bg
//                   shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text/70
//                   focus:outline-none transition-colors duration-300
//                   ${suggestedTag ? "text-green-600" : ""}`}
//                   required
//                 />

//                 {/* URL DISPLAY */}
//                 <div className="mt-2 text-xs font-medium h-5 pl-1">
//                   {usernameBase.length > 0 && usernameBase.length < 3 && (
//                     <span className="text-gray-400">Too short</span>
//                   )}

//                   {usernameBase.length >= 3 && (
//                     <>
//                       {isCheckingUser ? (
//                         <span className="text-gray-400 animate-pulse">
//                           Checking availability...
//                         </span>
//                       ) : suggestedTag ? (
//                         <span className="text-neumorphic-text/60">
//                           volvox.pics/
//                           <span className="text-green-600 font-bold">
//                             {suggestedTag}
//                           </span>
//                         </span>
//                       ) : null}
//                     </>
//                   )}
//                 </div>
//               </div>
//             </div>
//           )}

//           <div>
//             <label className="block text-sm font-medium text-neumorphic mb-2">
//               Email Address
//             </label>
//             <input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg
//               shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text
//               focus:outline-none"
//               required
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-neumorphic mb-2">
//               Password
//             </label>
//             <input
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               className="w-full px-4 py-3 rounded-xl bg-neumorphic-bg
//               shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text
//               focus:outline-none"
//               required
//             />
//           </div>

//           {error && <p className="text-red-500 text-sm text-center">{error}</p>}

//           <div>
//             <button
//               type="submit"
//               disabled={processing || (isSigningUp && !suggestedTag)}
//               className={`w-full py-3 mt-4 rounded-xl btn-neumorphic shadow-neumorphic
//               text-neumorphic-text font-medium hover:shadow-neumorphic-soft
//               active:shadow-neumorphic-pressed transition
//               ${
//                 processing || (isSigningUp && !suggestedTag)
//                   ? "opacity-50 cursor-not-allowed"
//                   : ""
//               }`}
//             >
//               {processing
//                 ? isSigningUp
//                   ? "Creating account…"
//                   : "Logging in…"
//                 : isSigningUp
//                 ? "Sign Up"
//                 : "Log In"}
//             </button>
//           </div>
//         </form>

//         <div className="mt-6 text-center text-sm text-gray-500">
//           <NextLink
//             href="/waitlist"
//             className="hover:text-gray-700 underline underline-offset-4"
//           >
//             Don&apos;t have an account? Join the waitlist.
//           </NextLink>
//         </div>
//       </div>
//     </div>
//   );
// }

//  {/* <button
//       onClick={() => setIsSigningUp(!isSigningUp)}
//       className="text-sm text-neumorphic-text hover:underline"
//     >
//       {isSigningUp
//         ? "Already have an account? Log In"
//         : "Sign up here"}
//     </button> */}
