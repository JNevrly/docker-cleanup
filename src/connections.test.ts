import { expect, it } from "vitest";
import { connectionIdentity } from "./connections";
import { makeDemo } from "./demo";
it("binds follow-up/cache identity to endpoint and resolved target, retaining old local history matching", () => {
  const a = makeDemo();
  const b = structuredClone(a);
  b.capabilities.connection = JSON.stringify([a.endpoint, a.endpoint]);
  expect(connectionIdentity(a)).toBe(connectionIdentity(b));
  b.endpoint = "context://elsewhere";
  expect(connectionIdentity(a)).not.toBe(connectionIdentity(b));
  const c = structuredClone(b);
  c.capabilities.connection = JSON.stringify([b.endpoint, "ssh://new-host"]);
  expect(connectionIdentity(b)).not.toBe(connectionIdentity(c));
});
