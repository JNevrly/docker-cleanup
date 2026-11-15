export type LabelMode = "plain" | "image" | "path";
type Measure = (text: string) => number;

function elide(text: string, width: number, measure: Measure): string {
  if (measure(text) <= width) return text;
  if (measure("…") > width) return "";
  const chars = Array.from(text);
  let lo = 0,
    hi = chars.length;
  const candidate = (n: number) => chars.slice(0, n).join("") + "…";
  while (lo < hi) {
    const n = Math.ceil((lo + hi) / 2);
    if (measure(candidate(n)) <= width) lo = n;
    else hi = n - 1;
  }
  return candidate(lo);
}

// RepoTags are joined for display by inventory. A comma cannot occur in a
// Docker reference: choose a real reference before interpreting /, : or @.
export function imageRepositoryName(full: string): string {
  const reference =
    full
      .split(",")
      .map((s) => s.trim())
      .find(Boolean) ?? full;
  if (reference.startsWith("<dangling>")) return reference;
  const repository = reference.split("@")[0];
  const basename = repository.slice(repository.lastIndexOf("/") + 1);
  return basename.split(":")[0] || reference;
}

export function fitLabel(
  full: string,
  width: number,
  measure: Measure,
  mode: LabelMode = "plain",
  lineCount = 1,
): string[] {
  if (width <= 0) return [];
  const budget = width * (lineCount === 1 ? 1 : 1.8);
  let preferred = full;
  if (mode === "image" && measure(full) > budget) {
    preferred = imageRepositoryName(full);
  } else if (measure(full) > budget && mode === "path" && full.includes("/")) {
    const parts = full.split("/").filter(Boolean);
    preferred = "…/" + parts.at(-1);
    for (let n = 2; n < parts.length; n++) {
      const candidate = "…/" + parts.slice(-n).join("/");
      if (measure(candidate) > budget) break;
      preferred = candidate;
    }
  }
  let fitted = elide(preferred, budget, measure);
  if (!fitted) return [];
  if (lineCount === 1 || measure(fitted) <= width)
    return [elide(fitted, width, measure)];
  const chars = Array.from(fitted);
  let split = 0;
  while (
    split < chars.length &&
    measure(chars.slice(0, split + 1).join("")) <= width
  )
    split++;
  const prefix = chars.slice(0, split).join("");
  const boundary = Math.max(prefix.lastIndexOf(" "), prefix.lastIndexOf("/"));
  if (boundary > split / 2) split = boundary + 1;
  const first = chars.slice(0, split).join("").trimEnd();
  fitted = chars.slice(split).join("").trimStart();
  return [first, elide(fitted, width, measure)].filter(Boolean);
}
