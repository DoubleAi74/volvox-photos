// app/[usernameTag]/[pageSlug]/page.js

import {
  getUserByUsername,
  getPageBySlug,
  getPostsForPage,
  fetchUserPage,
  fetchDashboardPreviews,
} from "@/lib/data";
import PageViewClient from "@/components/page/PageViewClient";

// ----------------------------------------------------------------
// CONFIGURATION
// Toggle this to TRUE to show blurry previews in the "Back" button skeletons
// Toggle this to FALSE to show blank (grey) skeletons in the "Back" button
// ----------------------------------------------------------------
const LOAD_DASH_PREVIEWS = true;

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
  let dashboardPreviews = [];
  let error = null;

  try {
    // 1. Fetch user
    profileUser = await getUserByUsername(usernameTag);

    if (!profileUser) {
      return (
        <div className="p-16 text-center text-xl text-neumorphic">
          User <b>{usernameTag}</b> not found.
        </div>
      );
    }

    // 2. Fetch page metadata
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

    // 3. Parallel Fetch
    // We ALWAYS fetch the dashboard list to get the Count
    const [posts, infoTexts, fetchedPreviews] = await Promise.all([
      getPostsForPage(pageData.id),
      fetchUserPage(pageData.id),
      fetchDashboardPreviews(profileUser.uid),
    ]);

    initialPosts = posts.map((post) => {
      if (post.createdAt) {
        post.createdAt = convertTimestamp(post.createdAt);
      }
      return post;
    });

    initialInfoTexts = infoTexts;

    // 4. Handle Preview Logic
    // We map over the results to enforce the toggle preference
    if (fetchedPreviews && fetchedPreviews.length > 0) {
      dashboardPreviews = fetchedPreviews.map((p) => ({
        ...p,
        // If toggle is ON, keep the data. If OFF, force empty strings.
        blurDataURL: LOAD_DASH_PREVIEWS ? p.blurDataURL || "" : "",
        thumbnail: LOAD_DASH_PREVIEWS ? p.thumbnail || "" : "",
      }));
    } else {
      dashboardPreviews = [];
    }
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
      // This array now always has the correct length, but blurs depend on toggle
      allPages={dashboardPreviews}
      params={resolvedParams}
    />
  );
}
