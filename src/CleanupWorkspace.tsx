import { useEffect, useRef, type ReactNode } from "react";
import { bytes, date, estimateText, measured } from "./domain";
import type { CleanupResult } from "./types";

export function WorkspacePage({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className="workspace-page" role="region" aria-label={title}>
      <div className="page-heading">
        <button onClick={onBack}>← Back</button>
        <h1 ref={heading} tabIndex={-1}>
          {title}
        </h1>
      </div>
      {children}
    </section>
  );
}

export interface HistoryQuery {
  search: string;
  status: string;
  order: string;
  page: number;
}
export function HistoryPage({
  results,
  loading,
  executing,
  query,
  onQuery,
  onBack,
  onRefresh,
  onOpen,
}: {
  results: CleanupResult[] | null;
  loading: boolean;
  executing: boolean;
  query: HistoryQuery;
  onQuery: (query: HistoryQuery) => void;
  onBack: () => void;
  onRefresh: () => void;
  onOpen: (result: CleanupResult) => void;
}) {
  const filtered = (results ?? [])
    .filter(
      (r) =>
        (query.status === "all" ||
          r.outcomes.some((o) => o.status === query.status)) &&
        `${r.id} ${r.plan.daemonId} ${r.before.endpoint} ${r.plan.actions.map((a) => a.name).join(" ")} ${r.outcomes.map((o) => o.message).join(" ")}`
          .toLowerCase()
          .includes(query.search.toLowerCase()),
    )
    .sort((a, b) =>
      query.order === "oldest"
        ? a.at.localeCompare(b.at)
        : b.at.localeCompare(a.at),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 20)),
    page = Math.min(query.page, pages - 1);
  return (
    <WorkspacePage title="Cleanup history" onBack={onBack}>
      <p>
        Saved local results are records of irreversible operations, not rollback
        points.
      </p>
      {executing && (
        <p className="warning">
          A cleanup is still running. Its result will appear here when it
          completes; navigation does not cancel it.
        </p>
      )}
      <div className="history-tools">
        <label>
          Search
          <input
            aria-label="Search cleanup history"
            value={query.search}
            onChange={(e) =>
              onQuery({ ...query, search: e.target.value, page: 0 })
            }
          />
        </label>
        <label>
          Outcome
          <select
            aria-label="History outcome"
            value={query.status}
            onChange={(e) =>
              onQuery({ ...query, status: e.target.value, page: 0 })
            }
          >
            <option value="all">All outcomes</option>
            {["deleted", "failed", "skipped", "cancelled", "simulated"].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Order
          <select
            aria-label="History order"
            value={query.order}
            onChange={(e) =>
              onQuery({ ...query, order: e.target.value, page: 0 })
            }
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <button disabled={loading || executing} onClick={onRefresh}>
          Refresh history
        </button>
      </div>
      {loading && <p role="status">Loading history…</p>}
      {results === null ? (
        <p>No cleanup batches loaded yet.</p>
      ) : results.length === 0 ? (
        <p>
          No cleanup batches yet. Results are retained locally after cleanup
          operations.
        </p>
      ) : filtered.length === 0 ? (
        <p>No history entries match these filters.</p>
      ) : (
        <>
          <p>
            {filtered.length} batches · Page {page + 1} of {pages}
          </p>
          <ol className="history-list" start={page * 20 + 1}>
            {filtered.slice(page * 20, page * 20 + 20).map((r) => (
              <li key={r.id}>
                <a
                  href={`#cleanup-${encodeURIComponent(r.id)}`}
                  aria-label={`Open cleanup result ${r.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpen(r);
                  }}
                >
                  {date(r.at)}
                </a>
                <p>
                  Daemon {r.plan.daemonId} · {r.outcomes.length} actions ·{" "}
                  {
                    r.outcomes.filter(
                      (o) => o.status === "deleted" || o.status === "simulated",
                    ).length
                  }{" "}
                  completed deletions/simulations ·{" "}
                  {r.outcomes.filter((o) => o.status === "failed").length}{" "}
                  failed
                </p>
                <small>{r.before.endpoint}</small>
              </li>
            ))}
          </ol>
          <div className="history-pagination">
            <button
              disabled={page === 0}
              onClick={() => onQuery({ ...query, page: page - 1 })}
            >
              Previous history page
            </button>
            <button
              disabled={page + 1 >= pages}
              onClick={() => onQuery({ ...query, page: page + 1 })}
            >
              Next history page
            </button>
          </div>
        </>
      )}
    </WorkspacePage>
  );
}

export function ResultPage({
  result,
  matchingDaemon,
  onBack,
  onFollowUp,
}: {
  result: CleanupResult;
  matchingDaemon: boolean;
  onBack: () => void;
  onFollowUp: () => void;
}) {
  return (
    <WorkspacePage title="Cleanup result" onBack={onBack}>
      <article className="result">
        <h2>{date(result.at)}</h2>
        <p>
          Daemon {result.plan.daemonId} · {result.before.endpoint}
        </p>
        <p className="warning">
          Deletion is irreversible. Partial success is not rolled back, and this
          record cannot re-run a historical plan.
        </p>
        <div className="result-stats">
          <div>
            Original estimate
            <strong>{estimateText(result.plan.estimate)}</strong>
          </div>
          <div>
            Before<strong>{bytes(measured(result.before.assets))}</strong>
          </div>
          <div>
            After
            <strong>
              {result.after
                ? bytes(measured(result.after.assets))
                : "Unavailable"}
            </strong>
          </div>
          <div>
            Docker reported reclaimed
            <strong>{bytes(result.reportedReclaimed)}</strong>
          </div>
          <div>
            Host free-space delta<strong>{bytes(result.hostFreeDelta)}</strong>
          </div>
        </div>
        <h3>Action outcomes</h3>
        <ol className="result-outcomes">
          {result.outcomes.map((o, i) => (
            <li key={`${o.key}-${i}`}>
              <span className={`badge ${o.status === "failed" ? "bad" : ""}`}>
                {o.status}
              </span>{" "}
              <strong>
                {o.key === "engine-cache"
                  ? "Engine-wide eligible cache prune"
                  : (result.plan.actions.find((a) => a.key === o.key)?.name ??
                    o.key)}
              </strong>
              <p>{o.message}</p>
            </li>
          ))}
        </ol>
        {result.notes.map((n, i) => (
          <p key={i}>{n}</p>
        ))}
        {!!result.plan.newlyEligible.length && (
          <>
            <button disabled={!matchingDaemon} onClick={onFollowUp}>
              Review newly eligible images →
            </button>
            {!matchingDaemon && (
              <p className="warning">
                Connect to this result’s daemon before selecting follow-up
                assets. Historical results cannot authorize another cleanup.
              </p>
            )}
          </>
        )}
      </article>
    </WorkspacePage>
  );
}
