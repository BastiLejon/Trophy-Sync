import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { db, schema } from "@/lib/db";
import { listPairings } from "@/lib/accounts";
import { releasePairingAction } from "@/app/actions/admin";
import { PageHeader } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";

export default async function AdminPairingsPage() {
  const [, { t, locale }] = await Promise.all([requireAdmin(), getT()]);
  const pairings = listPairings();
  const { psnAccounts, userXboxAchievements, xboxAchievements } = schema;
  const syncedScore = new Map<string, number>();
  for (const p of pairings) {
    const acc = db.select().from(psnAccounts).where(eq(psnAccounts.accountId, p.psnAccountId)).get();
    if (!acc) continue;
    const rows = db
      .select({ g: xboxAchievements.gamerscore })
      .from(userXboxAchievements)
      .innerJoin(xboxAchievements, eq(userXboxAchievements.xboxAchievementId, xboxAchievements.id))
      .where(and(eq(userXboxAchievements.userId, acc.userId), eq(userXboxAchievements.source, "playstation")))
      .all();
    syncedScore.set(p.psnAccountId, rows.reduce((s, r) => s + r.g, 0));
  }
  return (
    <div>
      <div className="mb-4 text-sm"><Link href="/admin" className="text-muted hover:text-foreground">← {t("common.backToAdmin")}</Link></div>
      <PageHeader title={t("adminPairings.title")} subtitle={t("adminPairings.subtitle")} />
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-3">{t("adminPairings.table.psn")}</th>
              <th className="px-4 py-3">{t("adminPairings.table.xbox")}</th>
              <th className="px-4 py-3">{t("adminPairings.table.pairedAt")}</th>
              <th className="px-4 py-3">{t("adminPairings.table.lastSync")}</th>
              <th className="px-4 py-3 text-right">{t("adminPairings.table.syncedScore")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {pairings.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2"><span className="text-ps">{p.psnOnlineId}</span> <span className="font-mono text-xs text-muted">{p.psnAccountId}</span></td>
                <td className="px-4 py-2"><span className="text-xbox">{p.gamertag}</span> <span className="font-mono text-xs text-muted">{p.xuid}</span></td>
                <td className="px-4 py-2">{formatDateTime(p.pairedAt, locale)}</td>
                <td className="px-4 py-2">{formatDateTime(p.lastSyncAt, locale)} ({p.syncCount})</td>
                <td className="px-4 py-2 text-right">{formatNumber(syncedScore.get(p.psnAccountId) ?? 0, locale)} G</td>
                <td className="px-4 py-2 text-right">
                  <form action={releasePairingAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs text-danger hover:underline">{t("adminPairings.release")}</button>
                  </form>
                </td>
              </tr>
            ))}
            {pairings.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">{t("adminPairings.empty")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
