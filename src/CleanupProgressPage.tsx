import { WorkspacePage } from "./CleanupWorkspace";
import { terminalStatus, type ProgressRow } from "./cleanupProgress";
export default function CleanupProgressPage({
  rows,
  executing,
  cacheScope,
  onBack,
  onCancel,
  onResult,
  hasResult,
}: {
  rows: ProgressRow[];
  executing: boolean;
  cacheScope: boolean;
  onBack: () => void;
  onCancel: () => void;
  onResult: () => void;
  hasResult: boolean;
}) {
  const completed = rows.filter((row) => terminalStatus(row.status)).length;
  return (
    <WorkspacePage title="Cleanup progress" onBack={onBack}>
      {executing ? (
        <>
          <p>
            Executing reviewed actions. Cancellation stops scheduling further
            work; an in-flight deletion may finish.
          </p>
          <button onClick={onCancel}>Cancel remaining actions</button>
        </>
      ) : (
        <p>
          No cleanup is running.{" "}
          {hasResult ? (
            <button onClick={onResult}>Open cleanup result</button>
          ) : (
            "Refresh the inventory and review a new plan if the operation failed. Unconfirmed states below are not evidence of deletion."
          )}
        </p>
      )}
      <p role="status" aria-live="polite">
        {completed} of {rows.length} actions finished ·{" "}
        {
          rows.filter((r) => r.status === "deleted" || r.status === "simulated")
            .length
        }{" "}
        deleted/simulated · {rows.filter((r) => r.status === "failed").length}{" "}
        failed · {rows.filter((r) => r.status === "skipped").length} skipped ·{" "}
        {rows.filter((r) => r.status === "cancelled").length} cancelled
      </p>
      {cacheScope && executing ? (
        <progress
          aria-label="Engine cache operation: duration unknown"
          max={1}
        />
      ) : (
        <progress
          aria-label="Finished cleanup actions, not successful deletions"
          value={completed}
          max={Math.max(1, rows.length)}
        />
      )}
      <p>
        Progress counts finished actions, not recovered bytes or successful
        deletions. Duration and byte progress are unknown.
      </p>
      {cacheScope && (
        <p className="warning">
          One Engine-wide eligible cache operation, not individual record
          deletion. Docker retains in-use cache; external buildx builders are
          excluded.
        </p>
      )}
      <ol className="cleanup-action-progress">
        {rows.map((row) => (
          <li key={row.key} data-status={row.status}>
            <strong>{row.name}</strong>
            <span className="badge">
              {executing && ["checking", "deleting"].includes(row.status) && (
                <span className="spinner" aria-hidden="true" />
              )}
              {row.status}
            </span>
            <p>{row.message}</p>
          </li>
        ))}
      </ol>
    </WorkspacePage>
  );
}
