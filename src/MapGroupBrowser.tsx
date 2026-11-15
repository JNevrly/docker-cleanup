import { useEffect, useRef } from "react";
import { bytes } from "./domain";
export default function MapGroupBrowser({
  groups,
  onGroup,
  mode,
}: {
  groups: { name: string; label?: string; size: number }[];
  onGroup: (name: string) => void;
  mode: "project" | "category";
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const plural = mode === "project" ? "projects" : "categories";
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [mode]);
  const close = () => {
    if (ref.current) {
      ref.current.open = false;
      ref.current.querySelector("summary")?.focus();
    }
  };
  return (
    <details
      className="project-browser map-group-browser"
      data-mode={mode}
      ref={ref}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          e.currentTarget.open = false;
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
        }
      }}
    >
      <summary
        aria-label={`Browse all ${plural}`}
        title={`Browse all ${plural}, including tiny groups`}
      >
        <span aria-hidden="true">⌄</span>
      </summary>
      <div
        className="project-browser-list"
        role="group"
        aria-label={`All map ${plural}`}
      >
        {groups.map((group) => (
          <button
            key={group.name}
            aria-label={`Explore ${mode} ${group.label ?? group.name}`}
            title={`${group.label ?? group.name} · ${bytes(group.size)}`}
            onClick={() => {
              close();
              onGroup(group.name);
            }}
          >
            {group.label ?? group.name}
            <small>{bytes(group.size)}</small>
          </button>
        ))}
        {!groups.length && <p>No measured {plural} in this view.</p>}
      </div>
    </details>
  );
}
