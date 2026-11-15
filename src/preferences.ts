import { useLayoutEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
const key = "docker-cleanup.preferences";

export function readPreference<T>(
  name: string,
  fallback: T,
  valid: (v: unknown) => v is T,
): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}")[name];
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function savePreference(name: string, value: unknown) {
  try {
    const current = JSON.parse(localStorage.getItem(key) || "{}");
    localStorage.setItem(key, JSON.stringify({ ...current, [name]: value }));
  } catch {
    /* Storage may be unavailable; the current session remains usable. */
  }
}

export function useStoredPreference<T>(
  name: string,
  fallback: T,
  valid: (v: unknown) => v is T,
) {
  const [value, setValue] = useState<T>(() =>
    readPreference(name, fallback, valid),
  );
  useLayoutEffect(() => {
    savePreference(name, value);
  }, [name, value]);
  return [value, setValue] as const;
}

// One palette source for the DOM and contrast regression tests.
export const palettes = {
  light: {
    page: "#f5f6f8",
    surface: "#ffffff",
    inset: "#f1f3f6",
    text: "#20242d",
    muted: "#515867",
    border: "#ccd1dc",
    hover: "#e8ecf3",
    selected: "#e4ecfb",
    accent: "#214aa1",
    primary: "#315ac0",
    primaryHover: "#25489f",
    onPrimary: "#ffffff",
    warning: "#fff4d6",
    warningText: "#624300",
    danger: "#9a251c",
    dangerBg: "#fff0ed",
    dangerButton: "#a52c21",
    dangerHover: "#842118",
    sand: "#3e4b64",
    focus: "#174ec2",
    badge: "#eef0f5",
    badgeText: "#444d60",
    backdrop: "#16273688",
    mapGroup: "#edf0f5",
  },
  dark: {
    page: "#16181d",
    surface: "#1e2128",
    inset: "#262a33",
    text: "#f0f2f7",
    muted: "#b7bdca",
    border: "#505968",
    hover: "#2c323d",
    selected: "#2b3548",
    accent: "#adc7ff",
    primary: "#315ac0",
    primaryHover: "#25489f",
    onPrimary: "#ffffff",
    warning: "#3e3420",
    warningText: "#ffe1a3",
    danger: "#ffb9ac",
    dangerBg: "#452d2c",
    dangerButton: "#a52c21",
    dangerHover: "#842118",
    sand: "#c5cddd",
    focus: "#9bcaff",
    badge: "#303640",
    badgeText: "#d4d9e3",
    backdrop: "#050b15bb",
    mapGroup: "#2a2e38",
  },
} as const;

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    readPreference(
      "theme",
      "light",
      (v): v is Theme =>
        typeof v === "string" && ["light", "dark", "system"].includes(v),
    ),
  );
  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      for (const [name, value] of Object.entries(palettes[resolved]))
        document.documentElement.style.setProperty(
          `--${name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`,
          value,
        );
    };
    savePreference("theme", theme);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  return [theme, setTheme] as const;
}
