import { useLayoutEffect, useState } from "react";
import { mapBudget, MIN_TABLE_CONTENT_HEIGHT } from "./workspaceGeometry";
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
  const [layout, setLayout] = useState({
    space: 200,
    tableMinimum: MIN_TABLE_CONTENT_HEIGHT,
    tableHeaderHeight: 48,
  });
  useLayoutEffect(() => {
    if (!node) return;
    const fixed = [...node.children].filter(
      (el) => el.id !== "storage-map" && !el.classList.contains("table-scroll"),
    );
    const map = node.querySelector<HTMLElement>("#storage-map");
    const region = map?.querySelector<HTMLElement>(".map-region");
    const legend = map?.querySelector(".legend");
    const table = node.querySelector<HTMLElement>(".table-scroll");
    const head = table?.querySelector("thead");
    const update = () => {
      const used = fixed.reduce((sum, el) => {
        const s = getComputedStyle(el);
        return (
          sum +
          el.getBoundingClientRect().height +
          (parseFloat(s.marginTop) || 0) +
          (parseFloat(s.marginBottom) || 0)
        );
      }, 0);
      const chrome = table ? table.offsetHeight - table.clientHeight : 0;
      const extras = Math.max(
        0,
        (map?.getBoundingClientRect().height ?? 0) -
          (region?.getBoundingClientRect().height ?? 0),
      );
      const next = {
        ...mapBudget(node.clientHeight, used, extras, chrome),
        tableHeaderHeight: Math.ceil(head?.getBoundingClientRect().height ?? 0),
      };
      setLayout((previous) =>
        previous.space === next.space &&
        previous.tableMinimum === next.tableMinimum &&
        previous.tableHeaderHeight === next.tableHeaderHeight
          ? previous
          : next,
      );
    };
    const observer = new ResizeObserver(update);
    // Observe table content-box changes too: scrollbar appearance changes its
    // client viewport without necessarily changing the outer flex allocation.
    [
      node,
      ...fixed,
      ...[legend, table, head].filter((el): el is Element => !!el),
    ].forEach((el) => observer.observe(el));
    update();
    return () => observer.disconnect();
  }, [node, identity]);
  return { ref, ...layout };
}
