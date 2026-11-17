// Light/dark choice. With nothing saved the site follows the system setting; picking a theme
// with the header toggle saves it on this device. The inline script in layouts/Base.astro
// applies a saved choice before first paint, so there is no flash of the wrong theme.

export type Theme = "light" | "dark";

export const THEME_KEY = "loadstore-theme";
/** Fired on document after the theme changes, so canvas drawings can repaint. */
export const THEME_EVENT = "loadstore:themechange";

const isTheme = (v: unknown): v is Theme => v === "light" || v === "dark";

/** The theme currently on screen: the saved choice, else the system setting. */
export function currentTheme(root: HTMLElement, prefersDark: boolean): Theme {
  const set = root.dataset["theme"];
  if (isTheme(set)) return set;
  return prefersDark ? "dark" : "light";
}

export const otherTheme = (t: Theme): Theme => (t === "dark" ? "light" : "dark");

/** Apply and remember a theme. Storage can be unavailable (private mode); the switch still applies. */
export function applyTheme(root: HTMLElement, theme: Theme): void {
  root.dataset["theme"] = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Not saved for next visit; this page still switches.
  }
  document.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}
