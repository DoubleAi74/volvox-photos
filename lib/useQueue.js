// useQueue.js
"use client";

import { useRef, useState, useCallback } from "react";

export function useQueue(onQueueEmpty) {

  // Separate queues for parallelizable vs sequential operations
  const createQueueRef = useRef([]);
  const sequentialQueueRef = useRef([]);

  const isProcessingCreatesRef = useRef(false);
  const isProcessingSequentialRef = useRef(false);
  const activeCreatesRef = useRef(0);

  const [isSyncing, setIsSyncing] = useState(false);

  const updateSyncingState = useCallback(() => {
    const isBusy =
      activeCreatesRef.current > 0 ||
      sequentialQueueRef.current.length > 0 ||
      isProcessingSequentialRef.current;
    setIsSyncing(isBusy);
  }, []);

  const tryCallOnQueueEmpty = useCallback(async () => {
    // Only call when ALL operations are done
    if (
      activeCreatesRef.current === 0 &&
      createQueueRef.current.length === 0 &&
      sequentialQueueRef.current.length === 0 &&
      !isProcessingSequentialRef.current
    ) {
      if (onQueueEmpty) {
        try {
          await onQueueEmpty();
          // Skip router.refresh() - optimistic UI already shows the new data
          // and calling refresh causes unwanted scroll-to-top behavior
        } catch (error) {
          console.error("onQueueEmpty callback failed:", error);
        }
      }
    }
  }, [onQueueEmpty]);

  // Process creates in parallel
  const processCreateQueue = useCallback(async () => {
    if (isProcessingCreatesRef.current) return;
    isProcessingCreatesRef.current = true;

    while (createQueueRef.current.length > 0) {
      // Grab all pending creates and process them in parallel
      const tasksToProcess = [...createQueueRef.current];
      createQueueRef.current = [];
      activeCreatesRef.current += tasksToProcess.length;
      updateSyncingState();

      const results = await Promise.allSettled(
        tasksToProcess.map(async (task) => {
          try {
            await task.actionFn();
            return { success: true, task };
          } catch (error) {
            console.error("Create operation failed:", error);
            return { success: false, task, error };
          }
        })
      );

      // Handle rollbacks for failed creates
      for (const result of results) {
        if (result.status === "fulfilled" && !result.value.success) {
          const { task } = result.value;
          if (task.onRollback) {
            task.onRollback();
          }
        } else if (result.status === "rejected") {
          // Promise itself rejected (shouldn't happen with our structure)
          console.error("Unexpected rejection:", result.reason);
        }
      }

      activeCreatesRef.current -= tasksToProcess.length;
    }

    isProcessingCreatesRef.current = false;
    updateSyncingState();
    await tryCallOnQueueEmpty();
  }, [updateSyncingState, tryCallOnQueueEmpty]);

  // Process sequential operations (updates, deletes) one at a time
  const processSequentialQueue = useCallback(async () => {
    if (isProcessingSequentialRef.current) return;
    isProcessingSequentialRef.current = true;
    updateSyncingState();

    while (sequentialQueueRef.current.length > 0) {
      const currentTask = sequentialQueueRef.current[0];

      try {
        await currentTask.actionFn();
        sequentialQueueRef.current.shift();
        // Skip router.refresh() - optimistic UI already shows the changes
        // and calling refresh causes unwanted scroll-to-top behavior
      } catch (error) {
        console.error("Sequential operation failed:", error);
        if (currentTask.onRollback) {
          currentTask.onRollback();
        }
        sequentialQueueRef.current.shift();
      }
    }

    isProcessingSequentialRef.current = false;
    updateSyncingState();
    await tryCallOnQueueEmpty();
  }, [updateSyncingState, tryCallOnQueueEmpty]);

  const addToQueue = useCallback(
    (task) => {
      if (task.type === "create") {
        createQueueRef.current.push(task);
        processCreateQueue();
      } else {
        // 'update', 'delete', or unspecified → sequential
        sequentialQueueRef.current.push(task);
        processSequentialQueue();
      }
    },
    [processCreateQueue, processSequentialQueue]
  );

  return {
    addToQueue,
    isSyncing,
  };
}
