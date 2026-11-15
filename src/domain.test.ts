import { describe, expect, it } from "vitest";
import {
  bytes,
  estimateText,
  measured,
  selectable,
  selectionEstimate,
  storageBytes,
} from "./domain";
import { makeDemo } from "./demo";

describe("storage accounting and safety", () => {
  const snapshot = makeDemo();
  it("keeps unknown sizes distinct from zero", () => {
    expect(bytes(null)).toBe("Unknown");
    expect(bytes(0)).toBe("0 B");
    expect(
      storageBytes(snapshot.assets.find((a) => a.id === "unknown")!),
    ).toBeNull();
    expect(
      storageBytes({
        ...snapshot.assets[0],
        kind: "cache",
        bytes: 1024,
        shared: null,
      }),
    ).toBeNull();
  });
  it("shows unique image bytes with a separate shared bucket", () => {
    const image = snapshot.assets.find((a) => a.id === "ros")!;
    expect(storageBytes(image)).toBeCloseTo(3.3 * 1024 ** 3);
    expect(measured([image])).toBeLessThan(image.bytes!);
    expect(snapshot.assets.filter((a) => a.kind === "shared")).toHaveLength(1);
  });
  it("blocks protection, running containers, individual cache, shared buckets", () => {
    for (const id of ["vscode", "running", "image-layers"]) {
      expect(selectable(snapshot.assets.find((a) => a.id === id)!)).toBe(false);
    }
  });
  it("does not count referenced volume as reclaimable", () => {
    const estimate = selectionEstimate(snapshot, new Set(["volume:qdrant"]));
    expect(estimate.lower).toBe(0);
    expect(estimate.upper).toBeGreaterThan(0);
  });
  it("keeps a joint-image estimate uncertain instead of summing unique sizes as exact", () => {
    const estimate = selectionEstimate(
      snapshot,
      new Set(["image:dangling", "image:unknown"]),
    );
    expect(estimate.upper).toBeNull();
    expect(estimateText(estimate)).toContain("incomplete");
  });
});
