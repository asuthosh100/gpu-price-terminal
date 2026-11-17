import { describe, expect, it } from "vitest";
import { currentTheme, otherTheme } from "./theme";

const rootWith = (theme?: string): HTMLElement =>
  ({ dataset: theme === undefined ? {} : { theme } }) as unknown as HTMLElement;

describe("theme", () => {
  it("follows the system setting when nothing is saved", () => {
    expect(currentTheme(rootWith(), true)).toBe("dark");
    expect(currentTheme(rootWith(), false)).toBe("light");
  });

  it("uses the saved choice over the system setting", () => {
    expect(currentTheme(rootWith("light"), true)).toBe("light");
    expect(currentTheme(rootWith("dark"), false)).toBe("dark");
  });

  it("ignores an unknown saved value", () => {
    expect(currentTheme(rootWith("sepia"), true)).toBe("dark");
  });

  it("flips between light and dark", () => {
    expect(otherTheme("light")).toBe("dark");
    expect(otherTheme("dark")).toBe("light");
  });
});
