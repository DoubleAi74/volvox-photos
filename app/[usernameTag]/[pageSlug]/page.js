// app/[usernameTag]/[pageSlug]/page.js

import {
  getUserByUsername,
  getPageBySlug,
  getPostsForPage,
  fetchUserPage,
} from "@/lib/data";
import PageViewClient from "@/components/page/PageViewClient";

// Helper for Firestore Timestamp
const convertTimestamp = (data) => {
  if (data && typeof data.toDate === "function") {
    return data.toDate().toISOString();
  }
  return data;
};

export default async function Page({ params }) {
  const resolvedParams = await params;
  const { usernameTag, pageSlug } = resolvedParams;

  let profileUser = null;
  let pageData = null;
  let initialPosts = [];
  let initialInfoTexts = [];
  let error = null;

  try {
    // Fetch user
    profileUser = await getUserByUsername(usernameTag);

    if (!profileUser) {
      return (
        <div className="p-16 text-center text-xl text-neumorphic">
          User <b>{usernameTag}</b> not found.
        </div>
      );
    }

    // Fetch page metadata
    pageData = await getPageBySlug(profileUser.uid, pageSlug);

    if (!pageData) {
      return (
        <div className="p-16 text-center text-xl text-neumorphic">
          Page <b>/{pageSlug}</b> not found.
        </div>
      );
    }

    // Convert timestamps
    if (pageData.updatedAt) {
      pageData.updatedAt = convertTimestamp(pageData.updatedAt);
    }

    // Fetch posts + page texts
    const [posts, infoTexts] = await Promise.all([
      getPostsForPage(pageData.id),
      fetchUserPage(pageData.id),
    ]);

    initialPosts = posts.map((post) => {
      if (post.createdAt) {
        post.createdAt = convertTimestamp(post.createdAt);
      }
      return post;
    });

    initialInfoTexts = infoTexts;
  } catch (err) {
    console.error("SERVER FETCH FAILED:", err);
    error = "Unable to connect to server. Please try again shortly.";
  }

  // If database fetch crashed — show fallback UI
  if (error) {
    return (
      <div className="p-16 text-center text-xl text-neumorphic">⚠️ {error}</div>
    );
  }

  // All good — pass props to client component
  return (
    <PageViewClient
      profileUser={profileUser}
      initialPage={pageData}
      initialPosts={initialPosts}
      initialInfoTexts={initialInfoTexts}
      params={resolvedParams}
    />
  );
}
