import { useRef } from "react";
export default function Splitter({
  orientation,
  label,
  controls,
  value,
  min,
  max,
  onChange,
  reverse = false,
  step = 20,
}: {
  orientation: "vertical" | "horizontal";
  label: string;
  controls: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  reverse?: boolean;
  step?: number;
}) {
  const drag = useRef<{ start: number; value: number } | null>(null);
  const axis = (e: { clientX: number; clientY: number }) =>
    orientation === "vertical" ? e.clientX : e.clientY;
  const change = (n: number) =>
    onChange(Math.round(Math.max(min, Math.min(max, n))));
  return (
    <div
      role="separator"
      tabIndex={0}
      className={`splitter ${orientation}`}
      aria-label={label}
      aria-orientation={orientation}
      aria-controls={controls}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`${Math.round(value)} pixels`}
      title="Drag to resize · arrow keys adjust · Home/End for limits"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.focus();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { start: axis(e), value };
      }}
      onPointerMove={(e) => {
        if (drag.current)
          change(
            drag.current.value +
              (axis(e) - drag.current.start) * (reverse ? -1 : 1),
          );
      }}
      onPointerUp={(e) => {
        drag.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        const negative = orientation === "vertical" ? "ArrowLeft" : "ArrowUp",
          positive = orientation === "vertical" ? "ArrowRight" : "ArrowDown";
        if (e.key === "Home") {
          e.preventDefault();
          change(min);
        } else if (e.key === "End") {
          e.preventDefault();
          change(max);
        } else if (e.key === negative || e.key === positive) {
          e.preventDefault();
          change(
            value +
              (e.key === positive ? 1 : -1) *
                (reverse ? -1 : 1) *
                step *
                (e.shiftKey ? 2 : 1),
          );
        }
      }}
    >
      <span aria-hidden="true" />
    </div>
  );
}
