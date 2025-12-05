"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPageBySlug, getPostBySlug, getUserByUsername } from "@/lib/data";
import Image from "next/image";

export default function PostSlugView({ params }) {
  const router = useRouter();
  const { usernameTag, pageSlug, postSlug } = params;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // We must fetch data in a chain: user -> page -> post
      const user = await getUserByUsername(usernameTag);
      if (user) {
        const page = await getPageBySlug(user.uid, pageSlug);
        if (page) {
          const postData = await getPostBySlug(page.id, postSlug);
          setPost(postData);
        }
      }
      setLoading(false);
    };

    loadData();
  }, [usernameTag, pageSlug, postSlug]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-36 h-36 rounded-full bg-[#f7f3ed] flex items-center justify-center shadow-neumorphic-inset animate-pulse">
          {/* <Image
            src="/logo-lotus.png" // <- file in public/
            alt="Logo"
            width={100}
            height={100}
          /> */}
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-16 text-center text-xl text-neumorphic">
        Post not found.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          {/* This button now correctly uses router.back() */}
          <button
            onClick={() => router.back()}
            className="p-3 rounded-xl btn-neumorphic shadow-neumorphic hover:shadow-neumorphic-soft active:shadow-neumorphic-pressed"
          >
            <ArrowLeft className="w-5 h-5 text-neumorphic-text" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-neumorphic">{post.title}</h1>
            {post.description && (
              <p className="text-neumorphic-text mt-2">{post.description}</p>
            )}
          </div>
        </div>

        <div className="bg-neumorphic-bg rounded-2xl shadow-neumorphic-inset p-8">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
            style={{
              color: "#6d6d6d",
              lineHeight: "1.7",
            }}
          />
        </div>
      </div>
    </div>
  );
}
