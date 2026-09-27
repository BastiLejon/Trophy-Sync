import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { demoXboxCatalog } from "@/lib/providers/demo-data";
import { deleteXboxTitle } from "@/app/actions/admin";
import { Artwork, PageHeader } from "@/components/ui";
import { ImportForms } from "./import-forms";

export default async function AdminCatalogPage() {
  const [, { t }] = await Promise.all([requireAdmin(), getT()]);
  const { xboxTitles, gameMappings } = schema;
  const titles = db.select().from(xboxTitles).orderBy(xboxTitles.name).all();
  const usage = new Map(
    db
      .select({ id: gameMappings.xboxTitleId, n: count() })
      .from(gameMappings)
      .where(eq(gameMappings.status, "mapped"))
      .groupBy(gameMappings.xboxTitleId)
      .all()
      .map((r) => [r.id, r.n]),
  );
  const demoAvailable = env.demoMode ? demoXboxCatalog.filter((d) => !titles.some((x) => x.titleId === d.titleId)) : [];
  return (
    <div>
      <div className="mb-4 text-sm"><Link href="/admin" className="text-muted hover:text-foreground">← {t("common.backToAdmin")}</Link></div>
      <PageHeader title={t("adminCatalog.title")} subtitle={t("adminCatalog.subtitle")} />
      <ImportForms
        demoAvailable={demoAvailable.map((d) => ({ titleId: d.titleId, name: d.name }))}
        labels={{
          liveTitle: t("adminCatalog.live.title"),
          liveText: t("adminCatalog.live.text"),
          titleId: t("adminCatalog.live.titleId"),
          name: t("adminCatalog.live.name"),
          importButton: t("adminCatalog.live.button"),
          importing: t("adminCatalog.importing"),
          jsonTitle: t("adminCatalog.json.title"),
          jsonText: t("adminCatalog.json.text"),
          jsonButton: t("adminCatalog.json.button"),
        }}
      />
      <div className="card mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-3">{t("adminCatalog.table.title")}</th>
              <th className="px-4 py-3">{t("adminCatalog.table.titleId")}</th>
              <th className="px-4 py-3 text-right">{t("adminCatalog.table.achievements")}</th>
              <th className="px-4 py-3 text-right">{t("adminCatalog.table.score")}</th>
              <th className="px-4 py-3 text-right">{t("adminCatalog.table.usedBy")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {titles.map((x) => (
              <tr key={x.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2"><Artwork src={x.iconUrl} name={x.name} size={32} /><span className="font-medium">{x.name}</span></div>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-muted">{x.titleId}</td>
                <td className="px-4 py-2 text-right">{x.achievementCount}</td>
                <td className="px-4 py-2 text-right">{x.totalGamerscore} G</td>
                <td className="px-4 py-2 text-right">{t("adminCatalog.table.usedByValue", { n: usage.get(x.id) ?? 0 })}</td>
                <td className="px-4 py-2 text-right">
                  {(usage.get(x.id) ?? 0) === 0 && (
                    <form action={deleteXboxTitle}>
                      <input type="hidden" name="id" value={x.id} />
                      <button className="text-xs text-danger hover:underline">{t("adminCatalog.delete")}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {titles.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">{t("adminCatalog.empty")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
