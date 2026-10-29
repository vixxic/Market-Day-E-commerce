"use client";

import { createContext, useContext, useState } from "react";

const GlobalContext = createContext(null);

export function GlobalProvider({ children }) {
  // States
  const [pages, setPages] = useState("beranda");
  const [filterBeranda, setFilterBeranda] = useState("All");
  const [kueriBeranda, setKueriBeranda] = useState("");

  const value = {
    pages,
    setPages,
    filterBeranda,
    setFilterBeranda,
    kueriBeranda,
    setKueriBeranda,
  };

  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  );
}

// Custom Hook
export function useGlobalContext() {
  return useContext(GlobalContext);
}
