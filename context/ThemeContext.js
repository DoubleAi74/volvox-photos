// context/ThemeContext.js
"use client";

import React, { createContext, useContext, useState } from "react";

const ThemeContext = createContext();

export function ThemeContextProvider({ children }) {
  // We initialize with null values.
  // We store 'uid' to make sure we don't accidentally show User A's colors on User B's profile
  const [themeState, setThemeState] = useState({
    uid: null,
    dashHex: null,
    backHex: null,
  });

  const updateTheme = (uid, dashHex, backHex) => {
    setThemeState({ uid, dashHex, backHex });
  };

  return (
    <ThemeContext.Provider value={{ themeState, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
