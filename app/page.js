"use client";

import { useRouter } from "next/navigation";

export default function toWelcome() {
  const router = useRouter();

  router.push("/welcome");
}
