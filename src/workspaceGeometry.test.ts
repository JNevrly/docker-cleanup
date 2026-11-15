import { expect, it } from "vitest";
import { mapBudget } from "./workspaceGeometry";

it("reserves real table content below classic horizontal scrollbars", () => {
  expect(mapBudget(465, 265, 28, 0)).toEqual({ space: 68, tableMinimum: 100 });
  expect(mapBudget(465, 265, 28, 21)).toEqual({ space: 47, tableMinimum: 121 });
});

it("keeps minimum map/table boxes when controls need a scrollable fallback", () => {
  expect(mapBudget(300, 265, 28, 21)).toEqual({ space: 40, tableMinimum: 121 });
  expect(mapBudget(1600, 100, 28, 0).space).toBe(600);
});

it("rounds down fractional room rather than stealing table pixels", () => {
  const { space } = mapBudget(465, 264.8, 28.4, 21);
  expect(space).toBe(46);
  expect(465 - 264.8 - 28.4 - 21 - space).toBeGreaterThanOrEqual(100);
});
