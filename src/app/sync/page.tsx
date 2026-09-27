import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { listSyncRuns, type SyncSummary } from "@/lib/sync";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Alert, PageHeader } from "@/components/ui";
import { SyncButton } from "./sync-button";

export default async function SyncPage() {
  const [user, { t, locale }] = await Promise.all([requireUser(), getT()]);
  const ready = Boolean(user.psn && user.xbox);
  const runs = listSyncRuns(user.userId);
  return (
    <div>
      <PageHeader
        title={t("sync.title")}
        subtitle={t("sync.subtitle")}
        actions={ready ? <SyncButton labels={{ button: t("sync.button"), running: t("sync.running") }} /> : null}
      />
      {!ready && (
        <Alert>
          {t("sync.needBoth")} <Link href="/" className="underline">{t("sync.toOverview")}</Link>
        </Alert>
      )}
      <div className="card mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-3">{t("sync.table.run")}</th>
              <th className="px-4 py-3">{t("sync.table.time")}</th>
              <th className="px-4 py-3">{t("sync.table.status")}</th>
              <th className="px-4 py-3 text-right">{t("sync.table.new")}</th>
              <th className="px-4 py-3 text-right">{t("sync.table.score")}</th>
              <th className="px-4 py-3 text-right">{t("sync.table.open")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted">{t("sync.table.empty")}</td></tr>
            )}
            {runs.map((r) => {
              const s = r.summary ? (JSON.parse(r.summary) as SyncSummary) : null;
              return (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">#{r.id}</td>
                  <td className="px-4 py-3">{formatDateTime(r.finishedAt ?? r.startedAt, locale)}</td>
                  <td className="px-4 py-3">
                    {r.status === "done" ? (
                      <span className="badge bg-xbox/15 text-xbox">{t("sync.status.done")}</span>
                    ) : r.status === "failed" ? (
                      <span className="badge bg-danger/15 text-danger" title={r.error ?? ""}>{t("sync.status.failed")}</span>
                    ) : (
                      <span className="badge bg-warning/15 text-warning">{t("sync.status.running")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{s ? formatNumber(s.trophies.synced, locale) : "–"}</td>
                  <td className="px-4 py-3 text-right">{s ? `+${formatNumber(s.gamerscoreAdded, locale)} G` : "–"}</td>
                  <td className="px-4 py-3 text-right">
                    {s ? formatNumber(s.trophies.pending + s.trophies.gamePending + s.trophies.noCounterpart + s.trophies.gameNoCounterpart, locale) : "–"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "done" && <Link href={`/sync/${r.id}`} className="text-ps hover:underline">{t("common.details")}</Link>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
