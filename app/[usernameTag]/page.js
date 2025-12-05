// app/[usernameTag]/page.js
// This is a Server Component. It fetches data and passes it to the client.

import {
  getUserByUsername,
  getPages,
  fetchHex,
  fetchUserDashboard,
} from "@/lib/data";
import DashboardClient from "@/components/dashboard/DashboardClient";

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
    const [pages, hex, dashboard] = await Promise.all([
      getPages(profileUser.uid, false),
      fetchHex(profileUser.uid),
      fetchUserDashboard(profileUser.uid),
    ]);

    initialPages = pages || [];
    initialHex = hex || "#000000";
    initialDashboardData = dashboard || { infoText: "" };
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

  const initialInfoText = initialDashboardData?.infoText || "";

  // Pass everything to the client component
  return (
    <DashboardClient
      profileUser={profileUser}
      initialPages={initialPages}
      initialHex={initialHex}
      initialInfoText={initialInfoText}
    />
  );
}
