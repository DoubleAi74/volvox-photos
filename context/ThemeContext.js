// context/ThemeContext.js
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

const ThemeContext = createContext();

export function ThemeContextProvider({ children }) {
  // We initialize with null values.
  // We store 'uid' to make sure we don't accidentally show User A's colors on User B's profile
  const [themeState, setThemeState] = useState({
    uid: null,
    dashHex: null,
    backHex: null,
    optimisticPageData: null, // Stores page preview data for instant navigation
  });

  const updateTheme = useCallback((uid, dashHex, backHex) => {
    setThemeState((prev) => ({ ...prev, uid, dashHex, backHex }));
  }, []);

  const setOptimisticPageData = useCallback((pageData) => {
    setThemeState((prev) => ({
      ...prev,
      optimisticPageData: pageData,
    }));
  }, []);

  const clearOptimisticPageData = useCallback(() => {
    setThemeState((prev) => ({
      ...prev,
      optimisticPageData: null,
    }));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themeState,
        updateTheme,
        setOptimisticPageData,
        clearOptimisticPageData,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
