import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listSyncRuns, type SyncSummary } from "@/lib/sync";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Alert, PageHeader } from "@/components/ui";
import { SyncButton } from "./sync-button";

export default async function SyncPage() {
  const user = await requireUser();
  const ready = Boolean(user.psn && user.xbox);
  const runs = listSyncRuns(user.userId);
  return (
    <div>
      <PageHeader
        title="Synchronisierung"
        subtitle="Liest deine PlayStation-Trophäen aus und überträgt sie anhand des Admin-Mappings symbolisch auf Xbox-Achievements."
        actions={ready ? <SyncButton /> : null}
      />
      {!ready && (
        <Alert>
          Es müssen beide Konten verknüpft sein. <Link href="/" className="underline">Zur Übersicht</Link>
        </Alert>
      )}
      <div className="card mt-6 p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-3">Lauf</th>
              <th className="px-4 py-3">Zeitpunkt</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Neu übertragen</th>
              <th className="px-4 py-3 text-right">Gamerscore</th>
              <th className="px-4 py-3 text-right">Offen / ohne Gegenstück</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted">Noch kein Sync durchgeführt.</td></tr>
            )}
            {runs.map((r) => {
              const s = r.summary ? (JSON.parse(r.summary) as SyncSummary) : null;
              return (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">#{r.id}</td>
                  <td className="px-4 py-3">{formatDateTime(r.finishedAt ?? r.startedAt)}</td>
                  <td className="px-4 py-3">
                    {r.status === "done" ? <span className="badge bg-xbox/15 text-xbox">fertig</span> : r.status === "failed" ? <span className="badge bg-danger/15 text-danger" title={r.error ?? ""}>fehlgeschlagen</span> : <span className="badge bg-warning/15 text-warning">läuft</span>}
                  </td>
                  <td className="px-4 py-3 text-right">{s ? formatNumber(s.trophies.synced) : "–"}</td>
                  <td className="px-4 py-3 text-right">{s ? `+${formatNumber(s.gamerscoreAdded)} G` : "–"}</td>
                  <td className="px-4 py-3 text-right">{s ? formatNumber(s.trophies.pending + s.trophies.gamePending + s.trophies.noCounterpart + s.trophies.gameNoCounterpart) : "–"}</td>
                  <td className="px-4 py-3 text-right">{r.status === "done" && <Link href={`/sync/${r.id}`} className="text-ps hover:underline">Details</Link>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
