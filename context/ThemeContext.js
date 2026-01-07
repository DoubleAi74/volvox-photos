"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

const ThemeContext = createContext();

export function ThemeContextProvider({ children }) {
  // Just use standard state. No complex storage logic needed.
  const [themeState, setThemeState] = useState({
    uid: null,
    dashHex: null,
    backHex: null,
    optimisticPageData: null,
    optimisticDashboardData: null,
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

  const setOptimisticDashboardData = useCallback((dashboardData) => {
    setThemeState((prev) => ({
      ...prev,
      optimisticDashboardData: dashboardData,
    }));
  }, []);

  const clearOptimisticDashboardData = useCallback(() => {
    setThemeState((prev) => ({
      ...prev,
      optimisticDashboardData: null,
    }));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themeState,
        updateTheme,
        setOptimisticPageData,
        clearOptimisticPageData,
        setOptimisticDashboardData,
        clearOptimisticDashboardData,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
