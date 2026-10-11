import { useEffect, useState } from "react";

// The storage key and the index order are shared with the inline script in index.html.
const STORAGE_KEY = "motyw-i";
const THEMES = ["system", "light", "dark"] as const;
const LABELS: Record<Theme, string> = { system: "system", light: "jasny", dark: "ciemny" };

export type Theme = (typeof THEMES)[number];

function readIndex(): number {
  try {
    const index = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(index) && index >= 0 && index < THEMES.length ? index : 0;
  } catch {
    return 0;
  }
}

/** Three-state theme (system / light / dark), remembered between visits. */
export function useTheme() {
  const [index, setIndex] = useState(readIndex);
  const theme: Theme = THEMES[index] ?? "system";

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, String(index));
    } catch {
      /* storage unavailable: the choice lasts until reload */
    }
  }, [index, theme]);

  return {
    theme,
    label: LABELS[theme],
    cycle: () => setIndex((current) => (current + 1) % THEMES.length),
  };
}
