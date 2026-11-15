import { describe, expect, it } from "vitest";
import { palettes, readPreference } from "./preferences";

function luminance(hex: string) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
describe("readable theme palettes", () => {
  for (const [name, p] of Object.entries(palettes))
    it(`${name} text pairings meet AA contrast`, () => {
      for (const bg of [p.page, p.surface, p.inset, p.hover, p.selected]) {
        for (const fg of [p.text, p.muted, p.accent, p.sand]) {
          expect(contrast(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(
            4.5,
          );
        }
      }
      for (const bg of [
        p.primary,
        p.primaryHover,
        p.dangerButton,
        p.dangerHover,
      ])
        expect(contrast(p.onPrimary, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.warningText, p.warning)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.danger, p.dangerBg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.badgeText, p.badge)).toBeGreaterThanOrEqual(4.5);
    });
  it("falls back safely when storage is unavailable", () => {
    expect(
      readPreference(
        "theme",
        "light",
        (v): v is string => typeof v === "string",
      ),
    ).toBe("light");
  });
});
