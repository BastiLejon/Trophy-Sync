import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { demoXboxCatalog } from "@/lib/providers/demo-data";
import { deleteXboxTitle } from "@/app/actions/admin";
import { Artwork, PageHeader } from "@/components/ui";
import { ImportForms } from "./import-forms";

export default async function AdminCatalogPage() {
  await requireAdmin();
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
  const demoAvailable = env.demoMode ? demoXboxCatalog.filter((d) => !titles.some((t) => t.titleId === d.titleId)) : [];
  return (
    <div>
      <div className="mb-4 text-sm"><Link href="/admin" className="text-muted hover:text-foreground">← Admin</Link></div>
      <PageHeader
        title="Xbox-Katalog"
        subtitle="Xbox-Titel samt Achievement-Listen. Sie werden automatisch ergänzt, wenn Nutzer ihr Xbox-Konto verknüpfen, und können hier manuell importiert werden."
      />
      <ImportForms demoAvailable={demoAvailable.map((d) => ({ titleId: d.titleId, name: d.name }))} />
      <div className="card mt-6 p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">Title-ID</th>
              <th className="px-4 py-3 text-right">Achievements</th>
              <th className="px-4 py-3 text-right">Gamerscore</th>
              <th className="px-4 py-3 text-right">Verwendet von</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {titles.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2"><Artwork src={t.iconUrl} name={t.name} size={32} /><span className="font-medium">{t.name}</span></div>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-muted">{t.titleId}</td>
                <td className="px-4 py-2 text-right">{t.achievementCount}</td>
                <td className="px-4 py-2 text-right">{t.totalGamerscore} G</td>
                <td className="px-4 py-2 text-right">{usage.get(t.id) ?? 0} PS-Spiel(e)</td>
                <td className="px-4 py-2 text-right">
                  {(usage.get(t.id) ?? 0) === 0 && (
                    <form action={deleteXboxTitle}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-xs text-danger hover:underline">löschen</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {titles.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">Katalog ist leer.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
