// app/[usernameTag]/page.js
import {
  getUserByUsername,
  getPages,
  fetchHex,
  fetchUserDashboard,
  batchFetchPagePreviews,
} from "@/lib/data";
import DashboardViewClient from "@/components/dashboard/DashboardViewClient";

// ----------------------------------------------------------------
// CONFIGURATION
// Toggle this to TRUE to load the grid of mini-blurs inside the cards
// Toggle this to FALSE to only show the main card thumbnail
// ----------------------------------------------------------------
const LOAD_PREVIEWS = true;

export default async function Page({ params }) {
  const resolvedParams = await params;
  const { usernameTag } = resolvedParams;

  let profileUser = null;
  let initialPages = [];
  let error = null;

  try {
    // Fetch user
    profileUser = await getUserByUsername(usernameTag);

    if (!profileUser) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-neumorphic">
          <div className="text-xl">User {usernameTag} not found.</div>
          <a href="/" className="mt-4 text-blue-600 hover:underline">
            Go Home
          </a>
        </div>
      );
    }

    // Fetch dashboard data in parallel
    // Always fetch ALL pages (including private) - client will filter based on isOwner
    const [pages] = await Promise.all([getPages(profileUser.uid, true)]);

    // Handle Previews Logic
    if (pages && pages.length > 0) {
      let previewMap = {};

      // 1. Only fetch the heavy preview data if our toggle is ON
      if (LOAD_PREVIEWS) {
        const pageIds = pages.map((p) => p.id);
        previewMap = await batchFetchPagePreviews(pageIds);
      }

      // 2. Map the data (either with real previews or empty arrays)
      initialPages = pages.map((page) => ({
        ...page,
        previewPostBlurs: LOAD_PREVIEWS ? previewMap[page.id] || [] : [], // If off, return empty array
      }));
    } else {
      initialPages = pages || [];
    }
  } catch (err) {
    console.error("SERVER FETCH FAILED (username page):", err);
    error = "Unable to load dashboard data at this moment.";
  }

  // If database fetch crashed — return soft error UI
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-neumorphic">
        <div className="text-xl mb-2">{error}</div>
        <div className="text-sm text-neumorphic/70">
          The user profile loaded, but dashboard data could not be retrieved.
        </div>
      </div>
    );
  }

  // Pass everything to the client component
  return (
    <DashboardViewClient
      profileUser={profileUser}
      initialPages={initialPages}
    />
  );
}
