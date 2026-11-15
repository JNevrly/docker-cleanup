import { useLayoutEffect, useState } from "react";
export function useElementSize<T extends HTMLElement>() {
  const [node, ref] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!node) return;
    const update = () => {
      const r = node.getBoundingClientRect();
      setSize((s) =>
        s.width === r.width && s.height === r.height
          ? s
          : { width: r.width, height: r.height },
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();
    return () => observer.disconnect();
  }, [node]);
  return { ref, ...size };
}

// Measure only fixed controls; map height itself must not feed back into its budget.
export function useMapSpace(identity: string) {
  const [node, ref] = useState<HTMLElement | null>(null);
  const [space, setSpace] = useState(200);
  useLayoutEffect(() => {
    if (!node) return;
    const fixed = [...node.children].filter(
      (el) => el.id !== "storage-map" && !el.classList.contains("table-scroll"),
    );
    const legend = node.querySelector(".legend");
    const update = () => {
      const used = fixed.reduce((sum, el) => {
        const s = getComputedStyle(el);
        return (
          sum +
          el.getBoundingClientRect().height +
          parseFloat(s.marginTop || "0") +
          parseFloat(s.marginBottom || "0")
        );
      }, 0);
      setSpace(
        Math.max(
          40,
          Math.min(
            600,
            Math.floor(
              node.clientHeight -
                used -
                (legend?.getBoundingClientRect().height ?? 0) -
                104,
            ),
          ),
        ),
      );
    };
    const observer = new ResizeObserver(update);
    [node, ...fixed, ...(legend ? [legend] : [])].forEach((el) =>
      observer.observe(el),
    );
    update();
    return () => observer.disconnect();
  }, [node, identity]);
  return { ref, space };
}
