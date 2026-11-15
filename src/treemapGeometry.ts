import { hierarchy, treemap } from "d3-hierarchy";
import { storageBytes } from "./domain";
import type { Asset } from "./types";

interface Node {
  name: string;
  asset?: Asset;
  children?: Node[];
}

// Keep most of a shallow group available for leaves. A fixed 27px header
// leaves only 1px of body in a 40px map, where pixel rounding hits the header.
// Use the same reservation for D3 padding and the painted header hit target.
export function groupHeaderHeight(height: number) {
  return Math.min(27, Math.max(0, height) * 0.4);
}

export function storageLayout(
  assets: Asset[],
  groupBy: "kind" | "project",
  width: number,
  height: number,
) {
  const groups = new Map<string, Asset[]>();
  for (const a of assets) {
    if ((storageBytes(a) ?? 0) <= 0) continue;
    const group = groupBy === "kind" ? a.kind : a.project;
    groups.set(group, [...(groups.get(group) ?? []), a]);
  }
  const root = hierarchy<Node>({
    name: "Storage",
    children: [...groups].map(([name, items]) => ({
      name,
      children: items.map((asset) => ({
        name: asset.alias || asset.name,
        asset,
      })),
    })),
  })
    .sum((n) => (n.asset ? (storageBytes(n.asset) ?? 0) : 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return treemap<Node>()
    .size([width, height])
    .paddingOuter(4)
    .paddingInner(4)
    .paddingTop((n) => (n.depth === 1 ? groupHeaderHeight(n.y1 - n.y0) : 4))(
    root,
  );
}
