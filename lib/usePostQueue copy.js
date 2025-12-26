// usePostQueue.js
"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function usePostQueue(onQueueEmpty) {
  const router = useRouter();

  const queueRef = useRef([]);
  const isProcessingRef = useRef(false);

  const [isSyncing, setIsSyncing] = useState(false);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsSyncing(true);

    while (queueRef.current.length > 0) {
      const currentTask = queueRef.current[0];

      try {
        await currentTask.actionFn();
        queueRef.current.shift();
        router.refresh();
      } catch (error) {
        console.error("Queue operation failed:", error);

        if (currentTask.onRollback) {
          currentTask.onRollback();
        }

        queueRef.current.shift();
      }
    }

    isProcessingRef.current = false;
    setIsSyncing(false);

    // Call the callback when queue is empty
    if (onQueueEmpty) {
      try {
        await onQueueEmpty();
        router.refresh();
      } catch (error) {
        console.error("onQueueEmpty callback failed:", error);
      }
    }
  }, [router, onQueueEmpty]);

  const addToQueue = useCallback(
    (task) => {
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
