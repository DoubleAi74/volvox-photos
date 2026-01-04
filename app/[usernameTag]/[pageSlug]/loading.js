// app/[usernameTag]/[pageSlug]/loading.js
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Page header skeleton */}
      <div className="h-[47px] bg-gray-300 animate-pulse" />

      {/* Posts grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="w-full aspect-square bg-gray-200 rounded-xl animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
