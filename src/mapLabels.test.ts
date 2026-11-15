import { expect, it } from "vitest";
import { fitLabel, imageRepositoryName } from "./mapLabels";
const measure = (s: string) => Array.from(s).length * 7;
it("prefers descriptive image and project suffixes without confusing registry ports with tags", () => {
  expect(
    fitLabel(
      "registry.example:5000/team/important-image:dev",
      175,
      measure,
      "image",
    ),
  ).toEqual(["important-image"]);
  expect(
    fitLabel("/home/user/projects/重要-project", 180, measure, "path")[0],
  ).toContain("重要-project");
  expect(
    fitLabel(
      "registry:5000/team/image@sha256:" + "a".repeat(64),
      175,
      measure,
      "image",
    )[0],
  ).toBe("image");
  expect(fitLabel("alias/with/slashes", 100, measure, "plain")[0]).toMatch(
    /^alias/,
  );
});
it("prioritizes the exact reported repository rather than reference syntax or a different tag", () => {
  const reported =
    "gitext.alps.cz:5000/mmwave-radar/idec/idec-ros2-log-replay-ws/idec_ros2_log_replay_ws_devcontainer:v0";
  expect(imageRepositoryName(reported)).toBe(
    "idec_ros2_log_replay_ws_devcontainer",
  );
  for (const full of [
    reported,
    reported + ", " + reported.replace(":v0", ":latest"),
  ]) {
    expect(fitLabel(full, 260, measure, "image")).toEqual([
      "idec_ros2_log_replay_ws_devcontainer",
    ]);
    const short = fitLabel(full, 126, measure, "image")[0];
    expect(short).toBe("idec_ros2_log_rep…");
    expect(short).not.toMatch(/latest|v0|\.\.\.|…\//);
    expect(fitLabel(full, 140, measure, "image", 2).join("")).toBe(
      "idec_ros2_log_replay_ws_devcontainer",
    );
  }
  expect(imageRepositoryName("localhost:5000/team/ubuntu")).toBe("ubuntu");
  expect(imageRepositoryName("team/image@sha256:abc")).toBe("image");
  expect(imageRepositoryName("<dangling> sha256:abcdef")).toBe(
    "<dangling> sha256:abcdef",
  );
  expect(fitLabel("short:v0", 200, measure, "image")).toEqual(["short:v0"]);
});
it("fits Unicode, aliases, ordinary names, untagged images and limited wrapping within bounds", () => {
  for (const name of [
    "普通の名前🐳".repeat(10),
    "friendly alias with several words",
    "registry:5000/project/image",
    "container-name".repeat(10),
  ]) {
    for (const width of [0, 3, 30, 100, 200]) {
      const lines = fitLabel(name, width, measure, "image", 2);
      expect(lines.length).toBeLessThanOrEqual(2);
      for (const line of lines) {
        expect(measure(line)).toBeLessThanOrEqual(width);
        expect(line).not.toContain("\uFFFD");
      }
    }
  }
});
