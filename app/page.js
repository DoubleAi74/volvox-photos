// import { redirect } from "next/navigation";

// export default function Page() {
//   redirect("/welcome");
// }

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/welcome");
  }, [router]);

  return null;
}
