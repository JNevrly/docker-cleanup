import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { listen } from "@tauri-apps/api/event";
import { cancel, desktop, request } from "./api";
import {
  age,
  categoryHelp,
  bytes,
  colors,
  date,
  estimateText,
  kinds,
  measured,
  selectable,
  selectionEstimate,
  selectionReason,
  storageBytes,
  titles,
} from "./domain";
import type { Asset, CleanupResult, Plan, Request, Snapshot } from "./types";
import Treemap from "./Treemap";
import { useTheme, useStoredPreference, type Theme } from "./preferences";
import InspectionDetails, {
  type InspectorTab,
  type InspectionKind,
  type InspectionResponse,
} from "./InspectionDetails";
import CleanupProgressPage from "./CleanupProgressPage";
import {
  applyProgress,
  queuedActions,
  reconcileProgress,
  type ProgressRow,
} from "./cleanupProgress";
import type { CleanupProgress } from "./types";
import Splitter from "./Splitter";
import MapGroupBrowser from "./MapGroupBrowser";
import { useElementSize, useMapSpace } from "./useElementSize";
import {
  HistoryPage,
  ResultPage,
  WorkspacePage,
  type HistoryQuery,
} from "./CleanupWorkspace";

type View = "explorer" | "review" | "progress" | "result" | "history";

export default function App() {
  const [theme, setTheme] = useTheme();
  const [mapCollapsed, setMapCollapsed] = useStoredPreference(
    "mapCollapsed",
    false,
    (v): v is boolean => typeof v === "boolean",
  );
  const [mapHeight, setMapHeight] = useStoredPreference(
    "mapHeight",
    200,
    (v): v is number => typeof v === "number" && v >= 40 && v <= 600,
  );
  const [inspectorOpen, setInspectorOpen] = useStoredPreference(
    "inspectorOpen",
    true,
    (v): v is boolean => typeof v === "boolean",
  );
  const [inspectorWidth, setInspectorWidth] = useStoredPreference(
    "inspectorWidth",
    340,
    (v): v is number => typeof v === "number" && v >= 280 && v <= 560,
  );
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [endpoint, setEndpoint] = useState("unix:///var/run/docker.sock");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [selectionNotice, setSelectionNotice] = useState("");
  const [selected, setSelected] = useState(new Set<string>());
  const [focused, setFocused] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<"kind" | "project">("kind");
  const [drill, setDrill] = useState("");
  const [category, setCategory] = useState("all");
  const [state, setState] = useState("all");
  const [search, setSearch] = useState("");
  const [unused, setUnused] = useState(false);
  const [hideProtected, setHideProtected] = useState(false);
  const [onlySelected, setOnlySelected] = useState(false);
  const [ageDays, setAgeDays] = useState("");
  const [sort, setSort] = useState("size");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [prune, setPrune] = useState(false);
  const [scope, setScope] = useState("dangling");
  const [pruneDays, setPruneDays] = useState("");
  const [results, setResults] = useState<CleanupResult[] | null>(null);
  const [historyQuery, setHistoryQuery] = useState<HistoryQuery>({
    search: "",
    status: "all",
    order: "newest",
    page: 0,
  });
  const [view, setView] = useState<View>("explorer");
  const [activeResult, setActiveResult] = useState<CleanupResult | null>(null);
  const [executionPlan, setExecutionPlan] = useState<Plan | null>(null);
  const [executing, setExecuting] = useState(false);
  const [actionProgress, setActionProgress] = useState<ProgressRow[]>([]);
  const grid = useElementSize<HTMLDivElement>();
  const maxInspectorWidth = Math.max(280, Math.min(560, grid.width - 448));
  const actualInspectorWidth = Math.min(inspectorWidth, maxInspectorWidth);
  const activeExecution = useRef<string | null>(null);
  const scroll = useRef<Partial<Record<View, number>>>({});
  const currentView = useRef<View>("explorer");
  const [inspectionHistory, setInspectionHistory] = useState<string[]>([]);
  const [inspectionTabs, setInspectionTabs] = useState<
    Record<string, InspectorTab>
  >({});
  const [inspectionData, setInspectionData] = useState<
    Record<string, InspectionResponse>
  >({});
  const active = useRef(false);
  function navigate(next: View) {
    scroll.current[currentView.current] =
      document.querySelector(".workspace-page")?.scrollTop ?? window.scrollY;
    currentView.current = next;
    setView(next);
    requestAnimationFrame(() => {
      const page = document.querySelector(".workspace-page");
      if (page) page.scrollTop = scroll.current[next] ?? 0;
      else window.scrollTo(0, 0);
    });
  }
  function openReview(next: Plan) {
    setPlan(next);
    navigate("review");
  }
  function explorerHome() {
    setCategory("all");
    setDrill("");
    setGroupBy("kind");
    setSearch("");
    setState("all");
    setAgeDays("");
    setOnlySelected(false);
    setUnused(false);
    setHideProtected(false);
    setSort("size");
    navigate("explorer");
  }
  function openHistory() {
    navigate("history");
    if (!active.current)
      void run<CleanupResult[]>({ type: "history" }, setResults);
  }
  function executePlan(confirmVolumes: boolean, confirmCacheScope: boolean) {
    if (!plan || active.current) return;
    const submitted = plan;
    activeExecution.current = submitted.id;
    setActionProgress(queuedActions(submitted));
    setExecutionPlan(submitted);
    setActiveResult(null);
    setPlan(null); // A submitted plan must never reappear as an executable review.
    setExecuting(true);
    navigate("progress");
    void run<CleanupResult>(
      {
        type: "execute",
        planId: submitted.id,
        confirmed: true,
        confirmVolumes,
        confirmCacheScope,
      },
      (result) => {
        setActionProgress((rows) => reconcileProgress(rows, result));
        setActiveResult(result);
        setResults((previous) => [
          result,
          ...(previous ?? []).filter((r) => r.id !== result.id),
        ]);
        setSelected(new Set());
        if (result.after) acceptSnapshot(result.after, true);
        if (currentView.current === "progress") navigate("result");
      },
    ).finally(() => {
      setExecuting(false);
      activeExecution.current = null;
    });
  }
  useEffect(() => {
    setPlan(null);
  }, [selected]);

  async function run<T>(
    req: Request,
    done: (data: T) => void,
    failed?: (error: string) => void,
  ) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError("");
    setProgress("Working…");
    try {
      done(await request<T>(req));
    } catch (e) {
      setError(String(e));
      failed?.(String(e));
    } finally {
      active.current = false;
      setBusy(false);
      setProgress("");
    }
  }
  function acceptSnapshot(next: Snapshot, expectedRemoval = false) {
    setSnapshot(next);
    if (snapshot && next.daemonId !== snapshot.daemonId) {
      setPlan(null);
      setSelected(new Set());
      setFocused(null);
      setInspectionHistory([]);
      setInspectionTabs({});
      setInspectionData({});
      setSelectionNotice(
        "Docker daemon changed. Selection and inspector were cleared to prevent cross-endpoint cleanup.",
      );
      return;
    }
    const keys = new Set(next.assets.filter(selectable).map((a) => a.key));
    const stale = [...selected].filter((key) => !keys.has(key));
    if (expectedRemoval) setSelectionNotice("");
    else if (stale.length)
      setSelectionNotice(
        `${stale.length} selected asset(s) disappeared, became protected, or are no longer eligible. They were removed from selection; review the refreshed inventory.`,
      );
    setSelected(
      (previous) => new Set([...previous].filter((key) => keys.has(key))),
    );
  }
  function scan() {
    void run<Snapshot>({ type: "scan", endpoint }, acceptSnapshot);
  }
  useEffect(() => {
    if (!desktop)
      void request<Snapshot>({ type: "snapshot" }).then(setSnapshot);
    let dispose: (() => void) | undefined;
    if (desktop)
      void listen<CleanupProgress | { message: string }>(
        "operation-progress",
        (e) => {
          if ("planId" in e.payload) {
            const event = e.payload;
            if (event.planId !== activeExecution.current) return;
            setActionProgress((rows) =>
              applyProgress(rows, event, activeExecution.current ?? ""),
            );
          }
          setProgress(e.payload.message);
        },
      ).then((fn) => {
        dispose = fn;
      });
    return () => {
      dispose?.();
    };
  }, []);
  useEffect(() => {
    if (!desktop || !snapshot || plan || view !== "explorer" || prune) return;
    const timer = setInterval(() => {
      if (!active.current)
        void run<Snapshot>(
          { type: "scan", endpoint: snapshot.endpoint },
          acceptSnapshot,
        );
    }, 60000);
    return () => clearInterval(timer);
  }, [snapshot, plan, view, prune]);

  const assets = snapshot?.assets ?? [];
  const filtered = useMemo(
    () =>
      assets
        .filter((a) => {
          const at =
            a.kind === "container"
              ? (a.finished ?? a.started ?? a.created)
              : (a.lastUsed ?? a.created);
          return (
            (!onlySelected || selected.has(a.key)) &&
            (category === "all" || a.kind === category) &&
            (state === "all" ||
              (state === "stopped"
                ? ["exited", "created", "dead"].includes(a.state)
                : a.state === state)) &&
            (!drill || (groupBy === "kind" ? a.kind : a.project) === drill) &&
            (!unused ||
              ((a.kind === "image" || a.kind === "volume") &&
                !a.refs.length)) &&
            (!hideProtected || !a.protected) &&
            (!ageDays ||
              (at != null &&
                Date.now() - new Date(at).valueOf() >=
                  Number(ageDays) * 86400000)) &&
            `${a.name} ${a.alias} ${a.project} ${a.id}`
              .toLowerCase()
              .includes(search.toLowerCase())
          );
        })
        .sort((a, b) =>
          sort === "name"
            ? (a.alias || a.name).localeCompare(b.alias || b.name)
            : sort === "age"
              ? (a.finished ?? a.lastUsed ?? "9999").localeCompare(
                  b.finished ?? b.lastUsed ?? "9999",
                )
              : (storageBytes(b) ?? -1) - (storageBytes(a) ?? -1),
        ),
    [
      assets,
      category,
      state,
      drill,
      groupBy,
      unused,
      hideProtected,
      onlySelected,
      selected,
      ageDays,
      search,
      sort,
    ],
  );
  const inspected = assets.find((a) => a.key === focused);
  function inspectAsset(key: string) {
    setFocused(key);
    setInspectorOpen(true);
  }
  function inspectRelated(key: string) {
    if (focused && focused !== key)
      setInspectionHistory((previous) => [...previous, focused]);
    inspectAsset(key);
  }
  function inspectBack() {
    const last = inspectionHistory.at(-1);
    if (last) {
      setInspectionHistory((previous) => previous.slice(0, -1));
      inspectAsset(last);
    }
  }
  const estimate = snapshot ? selectionEstimate(snapshot, selected) : null;
  const unknown = assets.filter((a) => storageBytes(a) == null).length;
  const mapKinds = kinds.filter((k) =>
    filtered.some((a) => a.kind === k && (storageBytes(a) ?? 0) > 0),
  );
  const projectGroups = useMemo(() => {
    const groups = new Map<string, number>();
    for (const asset of filtered) {
      const size = storageBytes(asset) ?? 0;
      if (size > 0)
        groups.set(asset.project, (groups.get(asset.project) ?? 0) + size);
    }
    return [...groups]
      .map(([name, size]) => ({ name, size }))
      .sort((a, b) => b.size - a.size);
  }, [filtered]);
  const categoryGroups = mapKinds.map((kind) => ({
    name: kind,
    label: titles[kind],
    size: filtered
      .filter((a) => a.kind === kind)
      .reduce((sum, a) => sum + (storageBytes(a) ?? 0), 0),
  }));
  const mapSpace = useMapSpace(
    `${category}:${drill}:${mapKinds.join(",")}:${mapCollapsed}`,
  );
  const actualMapHeight = Math.min(mapHeight, mapSpace.space);
  useEffect(() => {
    const table = document.querySelector(".table-scroll");
    if (table) table.scrollTop = 0;
  }, [category, drill]);
  const cacheRecords = assets.filter((a) => a.kind === "cache");
  const cacheCapability = snapshot?.capabilities.cache;
  const cacheBlock = !snapshot
    ? "Connect and scan the Engine first."
    : cacheRecords.some((a) => a.protected)
      ? "Protected cache prevents Engine-wide prune."
      : cacheCapability === "unavailable"
        ? "Engine cache accounting is unavailable; this is not measured zero."
        : cacheCapability === "unsupported"
          ? "Engine cache reporting is unsupported; this is not measured zero."
          : !cacheRecords.length
            ? cacheCapability === "available"
              ? "No Engine cache records reported. This empty inventory is not a host-space measurement."
              : "Engine cache availability is unknown; refresh with a supported Engine."
            : "";
  function reviewCache() {
    if (cacheBlock || busy) return;
    void run<Plan>(
      { type: "prunePlan", scope: "cache", olderThanDays: null },
      openReview,
    );
  }
  const eligibleInView = filtered.filter(selectable);
  const selectedInView = filtered.filter((a) => selected.has(a.key)).length;
  const allInViewSelected =
    eligibleInView.length > 0 &&
    eligibleInView.every((a) => selected.has(a.key));
  function selectView(clear = false) {
    setSelected((previous) => {
      const next = new Set(previous);
      for (const a of eligibleInView) {
        if (clear) next.delete(a.key);
        else next.add(a.key);
      }
      return next;
    });
  }
  const explainedCategory =
    category !== "all"
      ? category
      : groupBy === "kind" && kinds.some((k) => k === drill)
        ? drill
        : null;
  function toggle(a: Asset) {
    if (!selectable(a)) return;
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(a.key)) next.delete(a.key);
      else next.add(a.key);
      return next;
    });
  }
  function save(
    a: Asset,
    alias: string,
    project: string | null,
    protectedValue: boolean,
  ) {
    void run<Snapshot>(
      {
        type: "saveAsset",
        key: a.key,
        alias,
        project,
        protected: protectedValue,
      },
      acceptSnapshot,
    );
  }
  function inspectData(type: InspectionKind, a: Asset) {
    setInspectionTabs((previous) => ({ ...previous, [a.key]: type }));
    const key = `${snapshot?.daemonId}:${a.key}:${type}`;
    void run<unknown>(
      { type, key: a.key },
      (data) =>
        setInspectionData((previous) => ({ ...previous, [key]: { data } })),
      (error) =>
        setInspectionData((previous) => ({ ...previous, [key]: { error } })),
    );
  }

  return (
    <div
      className={`app ${mapCollapsed ? "map-collapsed" : ""} ${inspected && inspectorOpen ? "inspector-visible" : ""}`}
      style={
        { "--inspector-width": `${actualInspectorWidth}px` } as CSSProperties
      }
    >
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">▦</span>
          <div>
            Docker<span>cleanup</span>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <button
          className={`nav-item ${view === "explorer" ? "active" : ""}`}
          aria-current={view === "explorer" ? "page" : undefined}
          onClick={explorerHome}
        >
          ◫ <span>Storage explorer</span>
        </button>
        <button
          className={`nav-item ${view === "history" || view === "result" ? "active" : ""}`}
          aria-current={view === "history" ? "page" : undefined}
          onClick={openHistory}
        >
          ◷ <span>Cleanup history</span>
        </button>
        {plan && (
          <button
            className={`nav-item ${view === "review" ? "active" : ""}`}
            onClick={() => navigate("review")}
          >
            Cleanup review
          </button>
        )}
        {executionPlan && (
          <button
            className={`nav-item ${view === "progress" ? "active" : ""}`}
            onClick={() =>
              navigate(!executing && activeResult ? "result" : "progress")
            }
          >
            {executing ? "Cleanup running…" : "Last cleanup"}
          </button>
        )}
        <div className="nav-label">STORAGE CATEGORIES</div>
        {kinds.map((kind) => (
          <button
            key={kind}
            className={`nav-item ${category === kind ? "chosen" : ""}`}
            onClick={() => {
              navigate("explorer");
              setCategory(category === kind ? "all" : kind);
              setDrill("");
            }}
          >
            <span className="dot" style={{ background: colors[kind] }} />
            <span>
              {kind === "container"
                ? "Containers"
                : kind === "shared"
                  ? "Shared layers"
                  : kind === "cache"
                    ? "Build cache"
                    : kind[0].toUpperCase() + kind.slice(1) + "s"}
            </span>
            <small>{assets.filter((a) => a.kind === kind).length}</small>
          </button>
        ))}
        <div className="sidebar-bottom">
          <label className="theme-control">
            Theme
            <select
              aria-label="Theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
          <span className="dot green" /> Local Docker only
          <p>
            Inspect first.
            <br />
            Clean with confidence.
          </p>
          <small>v0.3.1 · Linux</small>
        </div>
      </aside>

      <main>
        {executing && (
          <div className="operation active-cleanup" role="status">
            <span className="spinner" /> Cleanup is running. {progress}
            <button onClick={() => navigate("progress")}>
              View cleanup progress
            </button>
            <button onClick={() => void cancel()}>Cancel remaining work</button>
          </div>
        )}
        {view !== "explorer" && error && (
          <div role="alert" className="alert">
            {error}
          </div>
        )}
        <div hidden={view !== "explorer"} className="explorer-destination">
          <header className="explorer-header">
            <div>
              <div className="eyebrow">DOCKER STORAGE / OVERVIEW</div>
              <h1>Make room for what’s next.</h1>
              <p>
                Find the heavy assets. Understand their purpose. Keep what
                matters.
              </p>
            </div>
            <div className="scan-status" role="status" aria-live="polite">
              {busy && !executing && (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span className="scan-message" title={progress}>
                    {progress}
                  </span>
                  <button
                    aria-label="Cancel current operation"
                    onClick={() => void cancel()}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
            <button disabled={busy || !snapshot} onClick={() => setPrune(true)}>
              ♧ Prune resources
            </button>
          </header>
          <section className="connection panel">
            <div className="connection-label">
              <span className={`dot ${snapshot ? "green" : ""}`} />
              <strong>{desktop ? "Local engine" : "Demo workspace"}</strong>
              <span className="badge">
                {desktop
                  ? snapshot
                    ? "CONNECTED"
                    : "NOT CONNECTED"
                  : "SYNTHETIC DATA"}
              </span>
            </div>
            {desktop ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  scan();
                }}
              >
                <input
                  aria-label="Docker socket endpoint"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  spellCheck={false}
                  placeholder="unix:///var/run/docker.sock"
                />
                <button disabled={busy} className="primary" type="submit">
                  {snapshot ? "↻ Refresh" : "Connect & scan"}
                </button>
              </form>
            ) : (
              <span className="muted">
                No Docker connection. All actions are simulations.
              </span>
            )}
            {snapshot && (
              <small title={date(snapshot.capturedAt)}>
                Scanned {date(snapshot.capturedAt)}
                <br />
                Daemon {snapshot.daemonId} ·{" "}
                {snapshot.capabilities.api ?? "demo API"}
              </small>
            )}
          </section>
          {error && (
            <div role="alert" className="alert">
              <strong>Could not complete operation.</strong> {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}
          {selectionNotice && (
            <div role="status" className="operation">
              {selectionNotice}
              <button
                aria-label="Dismiss selection notice"
                onClick={() => setSelectionNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {!snapshot ? (
            <section className="welcome panel">
              <span className="welcome-icon">◫</span>
              <h2>Your Docker storage, explained.</h2>
              <p>
                Connect a local Unix socket to discover writable layers, images,
                volumes, and Engine build cache.
              </p>
              <p>
                No changes are made during scanning. Every cleanup requires
                review and confirmation.
              </p>
            </section>
          ) : (
            <>
              <section className="stats">
                <div className="stat">
                  <span>MEASURED DOCKER DATA</span>
                  <strong>{bytes(measured(assets))}</strong>
                  <small>Attributed storage · not host disk usage</small>
                </div>
                <div className="stat">
                  <span>STOPPED WRITABLE LAYERS</span>
                  <strong className="mint">
                    {bytes(
                      measured(
                        assets.filter(
                          (a) =>
                            a.kind === "container" &&
                            ["exited", "created", "dead"].includes(a.state),
                        ),
                      ),
                    )}
                  </strong>
                  <small>
                    {
                      assets.filter(
                        (a) => a.kind === "container" && a.state === "exited",
                      ).length
                    }{" "}
                    stopped containers to investigate
                  </small>
                </div>
                <div className="stat">
                  <span>PERSISTENT VOLUMES</span>
                  <strong className="sand">
                    {bytes(measured(assets.filter((a) => a.kind === "volume")))}
                  </strong>
                  <small>Unreferenced does not mean disposable</small>
                </div>
                <div className="stat">
                  <span>ACCOUNTING COVERAGE</span>
                  <strong>{unknown ? `${unknown} unknown` : "Measured"}</strong>
                  <small>Shared image storage counted once</small>
                </div>
              </section>
              <div
                ref={grid.ref}
                className={`explorer-grid ${inspected && inspectorOpen ? "with-inspector" : ""}`}
              >
                <section className="panel explorer" ref={mapSpace.ref}>
                  <div className="section-head">
                    <nav className="breadcrumbs" aria-label="Storage location">
                      <button
                        onClick={explorerHome}
                        aria-current={
                          category === "all" && !drill ? "page" : undefined
                        }
                      >
                        All storage
                      </button>
                      {category !== "all" && (
                        <span aria-current={!drill ? "page" : undefined}>
                          {" "}
                          / {titles[category]}
                        </span>
                      )}
                      {drill && (
                        <span aria-current="page">
                          {" "}
                          / {groupBy === "kind" ? titles[drill] : drill}
                        </span>
                      )}
                    </nav>
                    <div className="segmented">
                      <button
                        aria-pressed={groupBy === "kind"}
                        onClick={() => {
                          setGroupBy("kind");
                          setDrill("");
                        }}
                      >
                        By category
                      </button>
                      <button
                        aria-pressed={groupBy === "project"}
                        onClick={() => {
                          setGroupBy("project");
                          setDrill("");
                        }}
                      >
                        By project
                      </button>
                      <MapGroupBrowser
                        groups={
                          groupBy === "project" ? projectGroups : categoryGroups
                        }
                        mode={groupBy === "project" ? "project" : "category"}
                        onGroup={setDrill}
                      />
                    </div>
                    <div className="layout-controls">
                      <button
                        aria-expanded={!mapCollapsed}
                        aria-controls="storage-map"
                        title="Hide the treemap and summary to prioritize asset rows"
                        onClick={() => setMapCollapsed(!mapCollapsed)}
                      >
                        {mapCollapsed ? "Show landscape" : "Focus asset table"}
                      </button>
                      {focused && !inspectorOpen && (
                        <button onClick={() => setInspectorOpen(true)}>
                          Show inspector
                        </button>
                      )}
                    </div>
                  </div>
                  {explainedCategory && (
                    <details className="category-help" key={explainedCategory}>
                      <summary>About {titles[explainedCategory]}</summary>
                      <p role="note" aria-label="Storage category explanation">
                        {categoryHelp[explainedCategory]}
                      </p>
                    </details>
                  )}
                  <div id="storage-map" hidden={mapCollapsed}>
                    <div
                      className="map-region"
                      style={{ height: actualMapHeight }}
                    >
                      <Treemap
                        assets={filtered}
                        groupBy={groupBy}
                        selected={selected}
                        onInspect={(a) => inspectAsset(a.key)}
                        onGroup={setDrill}
                      />
                    </div>
                    {mapKinds.length > 1 && (
                      <div className="legend" aria-label="Map categories">
                        {mapKinds.map((k) => (
                          <span key={k}>
                            <span
                              className="dot"
                              style={{ background: colors[k] }}
                            />
                            {k === "image"
                              ? "Images"
                              : k === "shared"
                                ? "Shared layers"
                                : titles[k]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {!mapCollapsed && (
                    <Splitter
                      orientation="horizontal"
                      label="Treemap height"
                      controls="storage-map"
                      min={40}
                      max={mapSpace.space}
                      value={actualMapHeight}
                      step={10}
                      onChange={setMapHeight}
                    />
                  )}
                  <div className="table-header">
                    <h2>
                      Explore assets <span>{filtered.length}</span>
                    </h2>
                    <input
                      aria-label="Search assets"
                      placeholder="Search assets or projects…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="filters">
                    <select
                      aria-label="Container state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    >
                      <option value="all">All states</option>
                      <option value="stopped">Stopped containers</option>
                      <option value="running">Running</option>
                    </select>
                    <select
                      aria-label="Sort assets"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="size">Largest first</option>
                      <option value="age">Oldest activity first</option>
                      <option value="name">Name A–Z</option>
                    </select>
                    <input
                      aria-label="Minimum age in days"
                      type="number"
                      min="0"
                      placeholder="Age ≥ days"
                      value={ageDays}
                      onChange={(e) => setAgeDays(e.target.value)}
                    />
                    <label title="Only unreferenced images and volumes">
                      <input
                        aria-label="Unreferenced images/volumes"
                        type="checkbox"
                        checked={unused}
                        onChange={(e) => setUnused(e.target.checked)}
                      />
                      Unreferenced
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={hideProtected}
                        onChange={(e) => setHideProtected(e.target.checked)}
                      />
                      Hide protected
                    </label>
                  </div>
                  <div className="list-actions">
                    <button
                      disabled={busy || !eligibleInView.length}
                      aria-describedby="selection-scope"
                      aria-label="Select eligible in view"
                      onClick={() => selectView()}
                    >
                      Select in view
                    </button>
                    <button
                      disabled={busy || !selectedInView}
                      aria-label="Deselect eligible in view"
                      onClick={() => selectView(true)}
                    >
                      Deselect in view
                    </button>
                    <button
                      disabled={busy || !selected.size}
                      title="Clear all selection, including assets outside this view"
                      aria-label="Clear selection"
                      onClick={() => setSelected(new Set())}
                    >
                      Clear all
                    </button>
                    <button
                      aria-pressed={onlySelected}
                      aria-label={
                        onlySelected ? "Show all assets" : "Show selection"
                      }
                      onClick={() => {
                        setOnlySelected(!onlySelected);
                        setCategory("all");
                        setState("all");
                        setDrill("");
                        setSearch("");
                        setUnused(false);
                        setHideProtected(false);
                        setAgeDays("");
                      }}
                    >
                      {onlySelected ? "All assets" : "Selection"}
                    </button>
                    <small id="selection-scope">
                      {eligibleInView.length} eligible in view ·{" "}
                      {selectedInView} selected in view ·{" "}
                      {
                        [...selected].filter(
                          (k) => !filtered.some((a) => a.key === k),
                        ).length
                      }{" "}
                      selected outside this view
                      {!eligibleInView.length &&
                        " · No individually eligible assets here; protected, active and accounting-only assets are excluded. Cache uses Clear Engine build cache, not row selection."}
                    </small>
                  </div>
                  <div className="table-scroll">
                    {explainedCategory === "cache" && (
                      <section
                        className="cache-workflow"
                        aria-label="Engine cache cleanup"
                      >
                        <button
                          className="primary"
                          disabled={busy || !!cacheBlock}
                          onClick={reviewCache}
                        >
                          Clear Engine build cache
                        </button>
                        <p>
                          {cacheBlock ||
                            `${cacheRecords.length} Engine records · reported logical data ${bytes(cacheRecords.some((a) => a.bytes == null) ? null : cacheRecords.reduce((n, a) => n + (a.bytes ?? 0), 0))}. Reclaimed space is uncertain.`}
                        </p>
                        <p>
                          Engine-wide eligible prune; in-use records retained.
                          External buildx and age filters unsupported. Later
                          builds may be slower.
                        </p>
                      </section>
                    )}
                    <table>
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              aria-label="Select all eligible assets in this view"
                              aria-describedby="selection-scope"
                              disabled={busy || !eligibleInView.length}
                              checked={allInViewSelected}
                              ref={(el) => {
                                if (el)
                                  el.indeterminate =
                                    !allInViewSelected &&
                                    eligibleInView.some((a) =>
                                      selected.has(a.key),
                                    );
                              }}
                              onChange={() => selectView(allInViewSelected)}
                            />
                          </th>
                          <th>ASSET / PROJECT</th>
                          <th>ATTRIBUTED SIZE</th>
                          <th>STATE / REFERENCES</th>
                          <th>LAST ACTIVITY EVIDENCE</th>
                          <th>
                            <span className="sr-only">Protection</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((a) => (
                          <tr
                            key={a.key}
                            className={focused === a.key ? "focused" : ""}
                          >
                            <td>
                              {a.kind !== "cache" ? (
                                <input
                                  aria-label={`Select ${a.alias || a.name}`}
                                  aria-describedby={`eligibility-${a.key}`}
                                  type="checkbox"
                                  disabled={!selectable(a) || busy}
                                  checked={selected.has(a.key)}
                                  onChange={() => toggle(a)}
                                />
                              ) : (
                                <span title="Use Clear Engine build cache">
                                  —
                                  <span className="sr-only">
                                    No individual cache deletion
                                  </span>
                                </span>
                              )}
                            </td>
                            <td>
                              <button
                                className="asset-name"
                                title={a.alias || a.name}
                                onClick={() => inspectAsset(a.key)}
                              >
                                <span
                                  className="dot"
                                  style={{ background: colors[a.kind] }}
                                />
                                {a.alias || a.name}
                              </button>
                              <small
                                className="project-name"
                                hidden={!selectable(a)}
                              >
                                {a.project}
                              </small>
                              <span
                                id={`eligibility-${a.key}`}
                                tabIndex={selectable(a) ? undefined : 0}
                                className={
                                  selectable(a)
                                    ? "sr-only"
                                    : "eligibility-reason"
                                }
                              >
                                {selectionReason(a)}
                              </span>
                            </td>
                            <td className="numeric">
                              {bytes(storageBytes(a))}
                              {a.kind === "image" && (
                                <small>Logical: {bytes(a.bytes)}</small>
                              )}
                            </td>
                            <td>
                              <span
                                className={`state ${a.state === "running" ? "running" : ""}`}
                              >
                                {a.state}
                              </span>
                              <small>{a.refs.length} references</small>
                            </td>
                            <td
                              title={
                                a.kind === "container"
                                  ? `Last finished: ${date(a.finished)}; ${a.lastUsedSource}`
                                  : a.lastUsedSource
                              }
                            >
                              {age(
                                a.kind === "container"
                                  ? a.finished
                                  : a.lastUsed,
                              )}
                              <small>
                                {a.kind === "container"
                                  ? "last finished · Docker"
                                  : a.lastUsed
                                    ? a.lastUsedSource
                                    : "last use unknown"}
                              </small>
                            </td>
                            <td>
                              <button
                                disabled={busy || a.kind === "shared"}
                                aria-label={`${a.protected ? "Unprotect" : "Protect"} ${a.name}`}
                                title="Keep this asset out of cleanup"
                                onClick={() =>
                                  save(a, a.alias, null, !a.protected)
                                }
                              >
                                {a.protected ? "◆" : "◇"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!filtered.length && (
                      <div className="empty">
                        No assets match this view. Try clearing filters or
                        refreshing inventory.
                      </div>
                    )}
                  </div>
                  <details className="scan-notes">
                    <summary>
                      Accounting, capability & observation notes (
                      {snapshot.warnings.length})
                    </summary>
                    {snapshot.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                    {Object.entries(snapshot.capabilities).map(([k, v]) => (
                      <p key={k}>
                        <strong>{k}:</strong> {v}
                      </p>
                    ))}
                    <p>
                      Age filters use available finish/start/creation evidence,
                      not a universal last-used date. Unknown age is excluded
                      when an age filter is active.
                    </p>
                  </details>
                </section>
                {inspected && inspectorOpen && (
                  <Splitter
                    orientation="vertical"
                    label="Inspector width"
                    controls="asset-inspector"
                    value={actualInspectorWidth}
                    min={280}
                    max={maxInspectorWidth}
                    reverse
                    onChange={setInspectorWidth}
                  />
                )}
                {inspected && (
                  <Inspector
                    key={inspected.key}
                    asset={inspected}
                    hidden={!inspectorOpen}
                    assets={assets}
                    busy={busy}
                    selected={selected.has(inspected.key)}
                    onClose={() => setInspectorOpen(false)}
                    onSelect={() => toggle(inspected)}
                    onNavigate={inspectRelated}
                    canGoBack={inspectionHistory.length > 0}
                    onBack={inspectBack}
                    tab={inspectionTabs[inspected.key] ?? "overview"}
                    onTab={(tab) =>
                      setInspectionTabs((previous) => ({
                        ...previous,
                        [inspected.key]: tab,
                      }))
                    }
                    response={
                      inspectionData[
                        `${snapshot?.daemonId}:${inspected.key}:${inspectionTabs[inspected.key]}`
                      ]
                    }
                    onSave={(alias, project, protectedValue) =>
                      save(inspected, alias, project, protectedValue)
                    }
                    onData={(type) => inspectData(type, inspected)}
                  />
                )}
              </div>
            </>
          )}
          <footer className="selection-bar">
            <div>
              <span className="selection-count">{selected.size}</span>
              <div>
                <strong>assets selected</strong>
                <small>
                  {selected.size
                    ? "Nothing deleted · bind mounts & unselected volumes retained"
                    : "Choose assets to build a reviewed cleanup batch"}
                </small>
              </div>
            </div>
            <div className="selection-total">
              <small>ESTIMATED RECLAIMABLE DATA</small>
              <strong>
                {estimate && selected.size ? estimateText(estimate) : "—"}
              </strong>
            </div>
            <button
              className="primary"
              disabled={busy || !selected.size}
              onClick={() =>
                void run<Plan>(
                  { type: "plan", keys: [...selected] },
                  openReview,
                )
              }
            >
              Review cleanup →
            </button>
          </footer>
        </div>
        {view === "review" && plan && (
          <Review
            plan={plan}
            busy={busy}
            demo={!desktop}
            key={plan.id}
            onClose={() => navigate("explorer")}
            onExecute={executePlan}
          />
        )}
        {view === "review" && !plan && (
          <WorkspacePage
            title="Review cleanup plan"
            onBack={() => navigate("explorer")}
          >
            <p>
              This plan is no longer available. Review a new selection before
              deleting anything.
            </p>
          </WorkspacePage>
        )}
        {view === "progress" && (
          <CleanupProgressPage
            rows={actionProgress}
            executing={executing}
            cacheScope={executionPlan?.cacheScope ?? false}
            onBack={() => navigate("explorer")}
            onCancel={() => void cancel()}
            onResult={() => navigate("result")}
            hasResult={!!activeResult}
          />
        )}
        {view === "history" && (
          <HistoryPage
            results={results}
            loading={busy && !executing}
            executing={executing}
            query={historyQuery}
            onQuery={setHistoryQuery}
            onBack={() => navigate("explorer")}
            onRefresh={openHistory}
            onOpen={(r) => {
              setActiveResult(r);
              navigate("result");
            }}
          />
        )}
        {view === "result" && activeResult && (
          <ResultPage
            result={activeResult}
            matchingDaemon={snapshot?.daemonId === activeResult.plan.daemonId}
            onBack={() => navigate("history")}
            onFollowUp={() => {
              if (snapshot?.daemonId !== activeResult.plan.daemonId) return;
              const followUp = activeResult.plan.newlyEligible.filter((k) =>
                assets.some(
                  (a) => a.key === k && a.refs.length === 0 && !a.protected,
                ),
              );
              setSelected(new Set(followUp));
              setSelectionNotice(
                `${followUp.length} currently eligible follow-up images selected. Missing, protected or referenced assets are excluded; review a fresh plan before deletion.`,
              );
              setCategory("image");
              setSearch("");
              setState("all");
              setDrill("");
              setUnused(false);
              setHideProtected(false);
              setOnlySelected(false);
              setAgeDays("");
              navigate("explorer");
            }}
          />
        )}
      </main>
      {prune && (
        <Modal title="Prune resources" onClose={() => setPrune(false)}>
          <p>
            Review a scoped batch before removing anything. Protected assets
            stay excluded. No combined “clean everything” operation.
          </p>
          <label className="field">
            Scope
            <select
              aria-label="Prune scope"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
                if (e.target.value === "cache") setPruneDays("");
              }}
            >
              <option value="dangling">Dangling, unreferenced images</option>
              <option value="images">
                All unreferenced images (including tagged)
              </option>
              <option value="containers">Stopped containers</option>
              <option value="volumes">
                Unreferenced named & anonymous volumes
              </option>
              <option value="cache">Engine-wide builder cache</option>
            </select>
          </label>
          <label className="field">
            Minimum age in days (optional)
            <input
              type="number"
              min="0"
              value={pruneDays}
              disabled={scope === "cache"}
              onChange={(e) => setPruneDays(e.target.value)}
            />
          </label>
          <p className="warning">
            Age means container finish/creation or image/volume creation, not
            universal last use. Unknown dates are excluded. Cache age filtering
            and external buildx builders are unsupported.
          </p>
          {scope === "volumes" && (
            <p className="warning danger">
              Volumes can hold databases and irreplaceable work. An unreferenced
              volume is not necessarily disposable.
            </p>
          )}
          {scope === "cache" && (
            <p className="warning">
              This is an Engine-wide prune, not per-record deletion. Protected
              cache disables it. In-use cache is retained by Docker.
              {cacheBlock}
            </p>
          )}
          <button
            className="primary"
            disabled={
              busy || (scope === "cache" && (!!pruneDays || !!cacheBlock))
            }
            onClick={() =>
              void run<Plan>(
                {
                  type: "prunePlan",
                  scope,
                  olderThanDays: pruneDays ? Number(pruneDays) : null,
                },
                (p) => {
                  setPrune(false);
                  openReview(p);
                },
              )
            }
          >
            Preview prune plan
          </button>
        </Modal>
      )}
    </div>
  );
}

function Inspector({
  asset: a,
  assets,
  busy,
  selected,
  onClose,
  onSelect,
  onNavigate,
  onSave,
  onData,
  hidden,
  tab,
  onTab,
  response,
  canGoBack,
  onBack,
}: {
  asset: Asset;
  assets: Asset[];
  busy: boolean;
  selected: boolean;
  onClose: () => void;
  onSelect: () => void;
  onNavigate: (key: string) => void;
  onSave: (
    alias: string,
    project: string | null,
    protectedValue: boolean,
  ) => void;
  onData: (type: "diff" | "processes" | "inspect") => void;
  hidden: boolean;
  tab: InspectorTab;
  onTab: (tab: InspectorTab) => void;
  response?: InspectionResponse;
  canGoBack: boolean;
  onBack: () => void;
}) {
  const [alias, setAlias] = useState(a.alias);
  const [project, setProject] = useState(a.project);
  return (
    <aside className="panel inspector" id="asset-inspector" hidden={hidden}>
      <div className="section-head">
        <span className="eyebrow">ASSET INSPECTOR</span>
        <button aria-label="Collapse inspector" onClick={onClose}>
          Collapse
        </button>
      </div>
      <span className="badge">{a.kind.toUpperCase()}</span>
      <h2>{a.alias || a.name}</h2>
      <code className="asset-id">{a.id}</code>
      {canGoBack && <button onClick={onBack}>← Back to previous asset</button>}
      <div className="inspector-tabs" role="group" aria-label="Inspector views">
        {(
          [
            "overview",
            ...(a.kind === "container" ? ["diff", "processes"] : []),
            "inspect",
          ] as InspectorTab[]
        ).map((value) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => onTab(value)}
          >
            {
              {
                overview: "Overview",
                diff: "Files",
                processes: "Processes",
                inspect: "Metadata",
              }[value]
            }
          </button>
        ))}
      </div>
      <div hidden={tab !== "overview"}>
        <p className="muted">
          State: {a.state} · {a.refs.length} known references
        </p>
        {!!a.ports.length && (
          <p className="muted">Published host ports: {a.ports.join(", ")}</p>
        )}
        <div className="inspector-size">
          {bytes(a.bytes)}
          <small>
            {a.kind === "container"
              ? "writable layer · lost on container removal"
              : "Docker-reported logical size"}
          </small>
        </div>
        <div className="inspector-section">
          <h3>Identity & project</h3>
          <p>{a.project}</p>
          {a.evidence.length ? (
            a.evidence.map((e, i) => (
              <p className="evidence" key={i}>
                ↳ {e}
              </p>
            ))
          ) : (
            <p className="muted">
              No reliable project association. Identity is unknown.
            </p>
          )}
          <label className="field">
            Friendly name
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={256}
            />
          </label>
          <label className="field">
            Project / shared / unattributed
            <input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              maxLength={1024}
            />
          </label>
          <button
            disabled={busy}
            onClick={() =>
              onSave(alias, project === a.project ? null : project, a.protected)
            }
          >
            Save identity
          </button>
        </div>
        <div className="inspector-section">
          <h3>Activity evidence</h3>
          <dl>
            <dt>Created</dt>
            <dd>{date(a.created)}</dd>
            <dt>Last started</dt>
            <dd>{date(a.started)}</dd>
            <dt>Last finished</dt>
            <dd>{date(a.finished)}</dd>
            <dt>Last-use evidence</dt>
            <dd>
              {date(a.lastUsed)}
              <small>{a.lastUsedSource}</small>
            </dd>
          </dl>
        </div>
        {!!a.mounts.length && (
          <div className="inspector-section">
            <h3>Storage boundaries</h3>
            {a.mounts.map((m, i) => (
              <div className="mount" key={i}>
                <strong>
                  {m.kind === "bind"
                    ? "External bind mount · retained"
                    : "Volume · retained by default"}
                </strong>
                <code>
                  {m.name || m.source} → {m.destination}
                </code>
              </div>
            ))}
          </div>
        )}
        <div className="inspector-section">
          <h3>Related assets</h3>
          {a.refs.length ? (
            a.refs.map((key) => (
              <a
                className="related"
                key={key}
                href={`#asset-${encodeURIComponent(key)}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(key);
                }}
              >
                {assets.find((a) => a.key === key)?.name ?? key} ↗
                <small>
                  {assets.find((a) => a.key === key)?.kind ?? "unknown type"} ·{" "}
                  {assets.find((a) => a.key === key)?.state ??
                    "not in current snapshot"}
                </small>
              </a>
            ))
          ) : (
            <p className="muted">
              No known references. This is not proof of disposability.
            </p>
          )}
        </div>
        {a.kind === "container" && (
          <div className="inspector-section">
            <h3>Investigate before deleting</h3>
            <button disabled={busy} onClick={() => onData("diff")}>
              Inspect filesystem changes
            </button>
            <button disabled={busy} onClick={() => onData("processes")}>
              Collect process evidence
            </button>
            <p className="muted">
              No commands are executed inside the container. Changed paths are
              not size measurements.
            </p>
          </div>
        )}
        <button disabled={busy} onClick={() => onData("inspect")}>
          View metadata (environment omitted)
        </button>
      </div>
      {tab !== "overview" && (
        <InspectionDetails
          kind={tab}
          response={response}
          asset={a}
          busy={busy}
          onLoad={() => onData(tab)}
        />
      )}
      <button
        className="primary full"
        disabled={busy || !selectable(a)}
        onClick={onSelect}
      >
        {a.protected
          ? "Protected from cleanup"
          : a.kind === "cache"
            ? "Use scoped cache prune"
            : a.kind === "shared"
              ? "Not independently deletable"
              : a.kind === "container" && a.state === "running"
                ? "Running · removal blocked"
                : selected
                  ? "Remove from selection"
                  : "Add to cleanup selection"}
      </button>
    </aside>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const elements = ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex='0']",
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="section-head">
          <h2>{title}</h2>
          <button aria-label="Close dialog" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Review({
  plan,
  busy,
  demo,
  onClose,
  onExecute,
}: {
  plan: Plan;
  busy: boolean;
  demo: boolean;
  onClose: () => void;
  onExecute: (volumes: boolean, cache: boolean) => void;
}) {
  const [confirmed, setConfirmed] = useState(false),
    [volumes, setVolumes] = useState(false),
    [cache, setCache] = useState(false);
  return (
    <WorkspacePage title="Review cleanup plan" onBack={onClose}>
      <p className="review-provenance">
        Daemon {plan.daemonId} · Snapshot {plan.snapshotId} · Reviewed{" "}
        {date(plan.createdAt)}
      </p>
      <div className="review-total">
        <span>Estimated reclaimable data</span>
        <strong>{estimateText(plan.estimate)}</strong>
      </div>
      {plan.warnings.map((w, i) => (
        <p className="warning" key={i}>
          {w}
        </p>
      ))}
      {plan.cacheScope && (
        <div className="warning">
          <strong>One Engine-wide eligible cache cleanup operation</strong>
          <p>
            This is not individual record deletion. All eligible Engine cache is
            in scope; Docker retains in-use cache. External buildx builders are
            excluded. Shared data and concurrent activity make reclaimed space
            uncertain. Later builds may be slower.
          </p>
          <p>
            The records below are reviewed scope evidence, not individually
            scheduled deletions.
          </p>
        </div>
      )}
      <ol className="action-list">
        {plan.actions.map((a) => (
          <li key={a.key}>
            <span className="badge">{a.kind}</span> {a.name}
            <small>
              {a.kind === "container"
                ? "Writable layer deleted. Bind mounts and unselected volumes retained."
                : a.kind === "volume"
                  ? "All data in this selected volume will be lost."
                  : "Removed only if Docker references allow it; no force."}
            </small>
            {a.evidence.slice(0, 2).map((e, i) => (
              <small key={i}>{e}</small>
            ))}
            {a.retainedMounts.map((m, i) => (
              <small key={`mount-${i}`}>
                Retained {m.kind}: {m.name || m.source} → {m.destination}
              </small>
            ))}
          </li>
        ))}
      </ol>
      {!!plan.newlyEligible.length && (
        <p>
          {plan.newlyEligible.length} additional image(s) may become eligible
          afterward. They are <strong>not selected automatically</strong>.
        </p>
      )}
      <details>
        <summary>Estimate limitations</summary>
        {plan.estimate.notes.map((n, i) => (
          <p key={i}>{n}</p>
        ))}
      </details>
      <label className="confirmation">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        {demo
          ? "I understand this changes synthetic demonstration data only."
          : "I reviewed this plan and understand deletion is irreversible."}
      </label>
      {plan.volumes && (
        <label className="confirmation danger">
          <input
            type="checkbox"
            checked={volumes}
            onChange={(e) => setVolumes(e.target.checked)}
          />
          I explicitly authorize loss of all data in the selected volumes,
          including possible databases.
        </label>
      )}
      {plan.cacheScope && (
        <label className="confirmation">
          <input
            type="checkbox"
            checked={cache}
            onChange={(e) => setCache(e.target.checked)}
          />
          I authorize Engine-wide eligible builder-cache prune, not
          individual-record deletion.
        </label>
      )}
      {busy && (
        <p role="status">
          Executing reviewed actions. Cancellation stops scheduling further
          work; an in-flight deletion may finish.
        </p>
      )}
      <div className="modal-actions">
        {busy && (
          <button onClick={() => void cancel()}>Cancel remaining work</button>
        )}
        <button disabled={busy} onClick={onClose}>
          Keep investigating
        </button>
        <button
          className="destructive"
          disabled={
            busy ||
            !confirmed ||
            (plan.volumes && !volumes) ||
            (plan.cacheScope && !cache)
          }
          onClick={() => onExecute(volumes, cache)}
        >
          {demo ? "Simulate cleanup" : "Delete reviewed assets"}
        </button>
      </div>
    </WorkspacePage>
  );
}
