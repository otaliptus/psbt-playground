import { createContext, useContext, useState, useCallback } from "react";

const DARK = {
  bg:"#06090f",surface:"#0d1219",card:"#111923",cardHi:"#151f2d",
  border:"#1e2d42",borderHi:"#f59e0b",
  text:"#dfe8f4",soft:"#96a7bf",dim:"#576980",
  amber:"#f59e0b",green:"#22c55e",red:"#ef4444",blue:"#3b82f6",
  purple:"#a78bfa",cyan:"#06b6d4",orange:"#fb923c",teal:"#14b8a6",
  // code/hex backgrounds
  codeBg:"#050910",
  isDark: true,
};

const LIGHT = {
  bg:"#f8f9fb",surface:"#ffffff",card:"#ffffff",cardHi:"#f5f6f8",
  border:"#dde2ea",borderHi:"#d97706",
  text:"#1a1e26",soft:"#5a6577",dim:"#8994a7",
  amber:"#d97706",green:"#16a34a",red:"#dc2626",blue:"#2563eb",
  purple:"#7c3aed",cyan:"#0891b2",orange:"#ea580c",teal:"#0d9488",
  codeBg:"#f0f2f5",
  isDark: false,
};

const ThemeCtx = createContext();

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);
  const toggle = useCallback(() => setDark(d => !d), []);
  const C = dark ? DARK : LIGHT;
  return (
    <ThemeCtx.Provider value={{ C, dark, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
