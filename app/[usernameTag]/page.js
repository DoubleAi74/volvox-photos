// app/[usernameTag]/page.js
// This is a Server Component. It fetches data and passes it to the client.

import {
  getUserByUsername,
  getPages,
  fetchHex,
  fetchUserDashboard,
} from "@/lib/data";
import DashboardViewClient from "@/components/dashboard/DashboardViewClient";

export default async function Page({ params }) {
  const resolvedParams = await params;
  const { usernameTag } = resolvedParams;

  let profileUser = null;
  let initialPages = [];
  let initialHex = "#000000";
  let initialDashboardData = null;
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
    const [pages] = await Promise.all([getPages(profileUser.uid, false)]);

    initialPages = pages || [];
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
