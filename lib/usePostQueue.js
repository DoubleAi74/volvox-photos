// hooks/usePostQueue.js
"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function usePostQueue() {
  const router = useRouter();

  // We use Refs for the queue so we can modify it without triggering re-renders
  // inside the async loop.
  const queueRef = useRef([]);
  const isProcessingRef = useRef(false);

  // We expose a state just in case you want to show a global "Saving..." spinner
  const [isSyncing, setIsSyncing] = useState(false);

  // This function processes the line one by one
  const processQueue = useCallback(async () => {
    // If already running, let it run.
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsSyncing(true);

    // Keep loop running as long as there are items in the queue
    while (queueRef.current.length > 0) {
      // Peek at the first item
      const currentTask = queueRef.current[0];

      try {
        // Run the actual database function (deletePost, createPost, etc.)
        await currentTask.actionFn();

        // If successful, remove it from the queue
        queueRef.current.shift();
      } catch (error) {
        console.error("Queue operation failed:", error);

        // CRITICAL: If an operation fails, we trigger the rollback callback
        if (currentTask.onRollback) {
          currentTask.onRollback();
        }

        // Option: Clear the rest of the queue to prevent cascading errors?
        // For now, we just remove the failed one and try the next.
        queueRef.current.shift();
      }
    }

    // Once the queue is empty...
    isProcessingRef.current = false;
    setIsSyncing(false);

    // ...ONLY THEN do we ask Next.js to refresh the data from the server.
    router.refresh();
  }, [router]);

  // The external function to add items to the line
  const addToQueue = useCallback(
    (task) => {
      // task = { actionFn: async () => {}, onRollback: () => {} }
      queueRef.current.push(task);
      processQueue();
    },
    [processQueue]
  );

  return {
    addToQueue,
    isSyncing,
  };
}
