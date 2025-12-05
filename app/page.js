"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // This effect will redirect a logged-in user to their dashboard
  useEffect(() => {
    if (!loading && user && user.usernameTag) {
      router.push(`/${user.usernameTag}`);
    }
  }, [user, loading, router]);

  // While checking auth status, show a loading state
  if (loading || (!loading && user)) {
    return (
      <div className="min-h-screen bg-neumorphic-bg flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-neumorphic-bg shadow-neumorphic-inset animate-pulse"></div>
      </div>
    );
  }

  // If not loading and no user, show the landing page
  return (
    <div className="min-h-screen bg-neumorphic-bg flex items-center justify-center text-center p-4">
      <div className="p-10 rounded-2xl bg-neumorphic-bg shadow-neumorphic">
        <h1 className="text-4xl font-bold text-neumorphic mb-4">
          Welcome to Your Base Public Dash
        </h1>
        <p className="text-neumorphic-text mb-8">
          Create and share your own pages with the world.
        </p>
        <Link
          href="/login"
          className="px-8 py-4 rounded-xl btn-neumorphic shadow-neumorphic text-neumorphic-text font-medium text-lg hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
