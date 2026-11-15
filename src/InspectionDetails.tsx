import type { Asset } from "./types";
export type InspectionKind = "diff" | "processes" | "inspect";
export type InspectorTab = InspectionKind | "overview";
export interface InspectionResponse {
  data?: unknown;
  error?: string;
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}
function rows(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function text(value: unknown) {
  return value == null ? "Unknown" : String(value);
}

export default function InspectionDetails({
  kind,
  response,
  asset,
  busy,
  onLoad,
}: {
  kind: InspectionKind;
  response?: InspectionResponse;
  asset: Asset;
  busy: boolean;
  onLoad: () => void;
}) {
  const data = object(response?.data);
  return (
    <section
      className="inspection-details"
      aria-label={`${kind === "diff" ? "Filesystem changes" : kind === "processes" ? "Process evidence" : "Optional metadata"} for ${asset.name}`}
    >
      <button disabled={busy} onClick={onLoad}>
        {response ? "Refresh inspection" : "Load inspection"}
      </button>
      {!response && (
        <p>
          Not collected yet. Load this view on demand; opening a tab does not
          run commands or start a container.
        </p>
      )}
      {response?.error && (
        <p role="alert" className="warning">
          {response.error}
        </p>
      )}
      {response?.data !== undefined && kind === "diff" && (
        <>
          <p>{text(data.note)}</p>
          <p>
            Changed paths are not per-path size measurements. Writable-layer
            data is lost on removal; mounts have a separate lifecycle.
          </p>
          <div className="inspection-table">
            <table>
              <thead>
                <tr>
                  <th>Change</th>
                  <th>Path</th>
                  <th>Storage boundary</th>
                </tr>
              </thead>
              <tbody>
                {rows(data.changes).map((value, i) => {
                  const change = object(value),
                    path = text(change.Path);
                  const mount = [...asset.mounts]
                    .sort((a, b) => b.destination.length - a.destination.length)
                    .find(
                      (m) =>
                        path === m.destination ||
                        path.startsWith(m.destination.replace(/\/$/, "") + "/"),
                    );
                  return (
                    <tr key={i}>
                      <td>
                        {text(
                          change.status ??
                            (
                              {
                                0: "changed",
                                1: "added",
                                2: "deleted",
                              } as Record<string, string>
                            )[text(change.Kind)],
                        )}
                      </td>
                      <td>
                        <code>{path}</code>
                      </td>
                      <td>
                        {mount
                          ? `${mount.kind} mount · retained separately`
                          : "Container writable layer · lost on removal"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows(data.changes).length === 0 && (
            <p>
              No changed paths were reported. This is not a measurement of zero
              storage use.
            </p>
          )}
        </>
      )}
      {response?.data !== undefined && kind === "processes" && (
        <>
          <p>
            Observed: {text(data.observedAt)}. Relationships are clues, not
            proof of ownership or disposability.
          </p>
          {rows(data.notes).map((note, i) => (
            <p key={i}>{text(note)}</p>
          ))}
          <h3>Inside the container</h3>
          {data.container == null ? (
            <p>
              Container processes unavailable. A stopped container was not
              started for inspection; see the explanations above.
            </p>
          ) : (
            <div className="inspection-table">
              <table>
                <thead>
                  <tr>
                    {rows(object(data.container).Titles).map((v, i) => (
                      <th key={i}>{text(v)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows(object(data.container).Processes).map((row, i) => (
                    <tr key={i}>
                      {rows(row).map((v, j) => (
                        <td key={j}>{text(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h3>Related host programs</h3>
          {rows(data.host).length ? (
            <ul>
              {rows(data.host).map((value, i) => {
                const proc = object(value);
                return (
                  <li key={i}>
                    <strong>{text(proc.program)}</strong> · PID {text(proc.pid)}
                    {rows(proc.evidence).map((e, j) => (
                      <p key={j}>{text(e)}</p>
                    ))}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>
              No host relationship was observed. Permissions or namespaces may
              prevent correlation; absence is not proof of non-use.
            </p>
          )}
        </>
      )}
      {response?.data !== undefined && kind === "inspect" && (
        <details open>
          <summary>Raw Docker metadata · environment omitted</summary>
          <pre>{JSON.stringify(response.data, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
