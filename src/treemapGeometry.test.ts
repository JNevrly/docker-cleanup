import { expect, it } from "vitest";
import { makeDemo } from "./demo";
import { groupHeaderHeight, storageLayout } from "./treemapGeometry";
import type { Asset } from "./types";

const assets = [20, 12, 8, 4, 1 / 1024 ** 3].map((gib, i) => ({
  ...makeDemo().assets[0],
  key: `fixture-${i}`,
  kind: ["container", "image", "volume", "shared", "cache"][i] as Asset["kind"],
  bytes: gib * 1024 ** 3,
  shared: 0,
}));

it("retains normal headers but shares compact group space with leaves", () => {
  expect(groupHeaderHeight(200)).toBe(27);
  expect(groupHeaderHeight(32)).toBeCloseTo(12.8);
  expect(groupHeaderHeight(0)).toBe(0);
});

it("keeps compact category leaf bodies clear of headers and pixel rounding", () => {
  for (const width of [380, 414, 451, 600, 1000]) {
    for (const height of [40, 50, 60, 80, 120, 200]) {
      const layout = storageLayout(assets, "kind", width, height);
      const volume = layout
        .leaves()
        .find((n) => n.data.asset?.kind === "volume")!;
      expect(volume.y1 - volume.y0).toBeGreaterThan(8);
      for (const leaf of layout
        .leaves()
        .filter((n) => n.x1 > n.x0 && n.y1 > n.y0)) {
        const group = leaf.parent!;
        const bottom = group.y0 + groupHeaderHeight(group.y1 - group.y0);
        expect(leaf.y0).toBeGreaterThanOrEqual(bottom - 1e-9);
        expect(leaf.x0).toBeGreaterThanOrEqual(group.x0);
        expect(leaf.x1).toBeLessThanOrEqual(group.x1);
        expect(leaf.y1).toBeLessThanOrEqual(group.y1);
      }
    }
  }
});

it("applies the same disjoint layout to project groups", () => {
  const layout = storageLayout(
    assets.map((a, i) => ({ ...a, project: `project-${i}` })),
    "project",
    451,
    40,
  );
  for (const leaf of layout.leaves().filter((n) => n.y1 > n.y0)) {
    const group = leaf.parent!;
    expect(leaf.y0).toBeGreaterThanOrEqual(
      group.y0 + groupHeaderHeight(group.y1 - group.y0) - 1e-9,
    );
  }
});
