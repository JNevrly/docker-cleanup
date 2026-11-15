import { colors, bytes, storageBytes, titles } from "./domain";
import type { Asset } from "./types";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fitLabel } from "./mapLabels";
import { groupHeaderHeight, storageLayout } from "./treemapGeometry";

export default function Treemap({
  assets,
  groupBy,
  selected,
  onInspect,
  onGroup,
}: {
  assets: Asset[];
  groupBy: "kind" | "project";
  selected: Set<string>;
  onInspect: (asset: Asset) => void;
  onGroup: (group: string) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const uid = useId();
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) return;
    const r = tooltipRef.current.getBoundingClientRect();
    const x = Math.max(8, Math.min(tooltip.x, innerWidth - r.width - 8)),
      y = Math.max(8, Math.min(tooltip.y, innerHeight - r.height - 8));
    if (x !== tooltip.x || y !== tooltip.y) setTooltip({ ...tooltip, x, y });
  }, [tooltip]);
  const showTooltip = (element: SVGElement, text: string) => {
    const r = element.getBoundingClientRect();
    const next = {
      text,
      x: Math.max(8, Math.min(r.left, innerWidth - 368)),
      y: Math.max(8, Math.min(r.bottom + 6, innerHeight - 100)),
    };
    setTooltip((previous) =>
      previous?.text === next.text &&
      previous.x === next.x &&
      previous.y === next.y
        ? previous
        : next,
    );
  };
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const textWidths = useRef(new Map<string, number>());
  const family = ref.current
    ? getComputedStyle(ref.current).fontFamily
    : "system-ui";
  const measure = (text: string, fontSize: number, weight = 650) => {
    const font = `${weight} ${fontSize}px ${family}`;
    const key = font + "|" + text;
    const cached = textWidths.current.get(key);
    if (cached !== undefined) return cached;
    canvas.current ??= document.createElement("canvas");
    const context = canvas.current.getContext("2d")!;
    if (context.font !== font) context.font = font;
    const measured = context.measureText(text).width;
    if (textWidths.current.size > 6000) textWidths.current.clear();
    textWidths.current.set(key, measured);
    return measured;
  };
  const [size, setSize] = useState([1000, 200]);
  useLayoutEffect(() => setTooltip(null), [assets, groupBy, size]);
  useLayoutEffect(() => {
    const svg = ref.current!;
    const observer = new ResizeObserver(() => {
      const rect = svg.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0)
        setSize((previous) =>
          previous[0] === rect.width && previous[1] === rect.height
            ? previous
            : [rect.width, rect.height],
        );
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const layout = storageLayout(assets, groupBy, size[0], size[1]);
  return (
    <>
      <svg
        ref={ref}
        viewBox={`0 0 ${size[0]} ${size[1]}`}
        className="treemap"
        aria-label="Storage treemap; an accessible asset table follows"
        role="group"
      >
        {layout.children?.map((group) => {
          return (
            <g key={group.data.name}>
              <rect
                x={group.x0}
                y={group.y0}
                width={Math.max(0, group.x1 - group.x0)}
                height={Math.max(0, group.y1 - group.y0)}
                fill="var(--map-group)"
                rx={5}
              />
            </g>
          );
        })}
        {layout
          .leaves()
          // Collapsed tiles have no pointer target; keep their assets available
          // in the table instead of exposing invisible SVG buttons.
          .filter((n) => n.data.asset && n.x1 > n.x0 && n.y1 > n.y0)
          .map((node, index) => {
            const a = node.data.asset!;
            const width = Math.max(0, node.x1 - node.x0),
              height = Math.max(0, node.y1 - node.y0);
            const canLabel = width > 72 && height > 42;
            const label = canLabel
              ? fitLabel(
                  a.alias || a.name,
                  width - 20,
                  (s) => measure(s, 14),
                  a.alias ? "plain" : a.kind === "image" ? "image" : "plain",
                  height > 95 ? 2 : 1,
                )
              : [];
            const lines = label.length;
            const sizeLabel = canLabel
              ? fitLabel(bytes(storageBytes(a)), width - 20, (s) =>
                  measure(s, 16),
                )[0]
              : undefined;
            return (
              <g
                key={a.key}
                role="button"
                tabIndex={0}
                aria-label={`Inspect ${a.alias || a.name}, ${bytes(storageBytes(a))}`}
                onMouseEnter={(e) =>
                  showTooltip(
                    e.currentTarget,
                    `${a.alias || a.name} · ${bytes(storageBytes(a))} · ${a.project}`,
                  )
                }
                onMouseMove={(e) =>
                  showTooltip(
                    e.currentTarget,
                    `${a.alias || a.name} · ${bytes(storageBytes(a))} · ${a.project}`,
                  )
                }
                onMouseLeave={() => setTooltip(null)}
                onFocus={(e) =>
                  showTooltip(
                    e.currentTarget,
                    `${a.alias || a.name} · ${bytes(storageBytes(a))} · ${a.project}`,
                  )
                }
                onBlur={() => setTooltip(null)}
                onClick={() => onInspect(a)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onInspect(a);
                  }
                }}
              >
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={width}
                  height={height}
                  rx={3}
                  fill={a.kind === "shared" ? "#a6b4c4" : colors[a.kind]}
                  fillOpacity={1}
                  stroke={selected.has(a.key) ? "var(--focus)" : "transparent"}
                  strokeWidth={2}
                />
                <clipPath id={`${uid}-tile-${index}`}>
                  <rect
                    x={node.x0 + 7}
                    y={node.y0}
                    width={Math.max(0, width - 14)}
                    height={height}
                  />
                </clipPath>
                {width > 72 && height > 42 && (
                  <g
                    clipPath={`url(#${uid}-tile-${index})`}
                    fill="#101b24"
                    pointerEvents="none"
                  >
                    {label.map((line, i) => (
                      <text
                        key={i}
                        className="map-asset-label"
                        x={node.x0 + 10}
                        y={node.y0 + 21 + i * 17}
                        fontSize={14}
                        fontWeight={650}
                      >
                        {line}
                      </text>
                    ))}
                    <text
                      x={node.x0 + 10}
                      y={node.y0 + 23 + lines * 17}
                      fontSize={16}
                      fontWeight={650}
                    >
                      {sizeLabel}
                    </text>
                    {height > 65 + lines * 17 && (
                      <text
                        x={node.x0 + 10}
                        y={node.y0 + 43 + lines * 17}
                        fontSize={12}
                      >
                        {
                          fitLabel(
                            a.state + (a.protected ? " · protected" : ""),
                            width - 20,
                            (s) => measure(s, 12, 400),
                          )[0]
                        }
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        {/* Headers share D3's adaptive padding, keeping leaf hit areas separate. */}
        {layout.children?.map((group, index) => {
          const full =
            groupBy === "kind" ? titles[group.data.name] : group.data.name;
          const width = Math.max(0, group.x1 - group.x0),
            height = groupHeaderHeight(group.y1 - group.y0);
          const label =
            fitLabel(
              full,
              width - 18,
              (s) => measure(s, 12, 400),
              groupBy === "project" ? "path" : "plain",
            )[0] ?? "";
          const withSize = `${label} · ${bytes(group.value)}`;
          const activate = () => {
            setTooltip(null);
            onGroup(group.data.name);
          };
          return (
            <g
              key={group.data.name}
              className="map-group-target"
              role="button"
              tabIndex={0}
              aria-label={`Explore ${full}`}
              data-group={group.data.name}
              onClick={activate}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  activate();
                } else if (e.key === "Escape") setTooltip(null);
              }}
              onMouseEnter={(e) =>
                showTooltip(e.currentTarget, `${full} · ${bytes(group.value)}`)
              }
              onMouseMove={(e) =>
                showTooltip(e.currentTarget, `${full} · ${bytes(group.value)}`)
              }
              onMouseLeave={(e) => {
                if (document.activeElement !== e.currentTarget)
                  setTooltip(null);
              }}
              onFocus={(e) =>
                showTooltip(e.currentTarget, `${full} · ${bytes(group.value)}`)
              }
              onBlur={() => setTooltip(null)}
            >
              <rect
                className="map-group-hit"
                x={group.x0}
                y={group.y0}
                width={width}
                height={height}
                fill="var(--map-group)"
                pointerEvents="all"
              />
              <clipPath id={`${uid}-header-${index}`}>
                <rect
                  x={group.x0 + 4}
                  y={group.y0}
                  width={Math.max(0, width - 8)}
                  height={height}
                />
              </clipPath>
              {height >= 20 && width >= 25 && (
                <text
                  className="map-group-label"
                  clipPath={`url(#${uid}-header-${index})`}
                  x={group.x0 + 9}
                  y={group.y0 + 17}
                  fill="var(--muted)"
                  fontSize={12}
                  pointerEvents="none"
                >
                  {measure(withSize, 12, 400) <= width - 18 ? withSize : label}
                </text>
              )}
            </g>
          );
        })}
        {!layout.leaves().some((n) => n.data.asset) && (
          <text
            x={size[0] / 2}
            y={size[1] / 2}
            textAnchor="middle"
            fill="var(--muted)"
            fontSize={12}
          >
            No measured storage in this view.
          </text>
        )}
      </svg>
      {tooltip &&
        createPortal(
          <div
            ref={tooltipRef}
            className="map-tooltip"
            role="tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.text}
          </div>,
          document.body,
        )}
    </>
  );
}
