import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { rankCandidates } from "@/lib/matching";
import { acceptAllSuggestions, decideTrophy } from "@/app/actions/admin";
import { Alert, Artwork, GamerscoreBadge, PageHeader, StatusBadge, TrophyBadge } from "@/components/ui";
import { percent } from "@/lib/format";

export default async function AdminTrophiesPage({ params }: PageProps<"/admin/games/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const { psGames, psTrophies, gameMappings, xboxTitles, xboxAchievements, trophyMappings } = schema;
  const game = db.select().from(psGames).where(eq(psGames.id, Number(id))).get();
  if (!game) notFound();
  const mapping = db.select().from(gameMappings).where(eq(gameMappings.psGameId, game.id)).get();
  const xboxTitle = mapping?.xboxTitleId ? db.select().from(xboxTitles).where(eq(xboxTitles.id, mapping.xboxTitleId)).get() : null;
  if (!mapping || mapping.status !== "mapped" || !xboxTitle) {
    return (
      <div>
        <PageHeader title={game.name} />
        <Alert>Dieses Spiel ist noch keinem Xbox-Titel zugeordnet. <Link href="/admin/games" className="underline">Zur Spiel-Liste</Link></Alert>
      </div>
    );
  }
  const trophies = db.select().from(psTrophies).where(eq(psTrophies.psGameId, game.id)).orderBy(psTrophies.trophyId).all();
  const achievements = db.select().from(xboxAchievements).where(eq(xboxAchievements.xboxTitleId, xboxTitle.id)).orderBy(xboxAchievements.name).all();
  const achById = new Map(achievements.map((a) => [a.id, a]));
  const mappings = new Map(
    db.select().from(trophyMappings).all().filter((m) => trophies.some((t) => t.id === m.psTrophyId)).map((m) => [m.psTrophyId, m]),
  );
  const usedAchievements = new Map<number, number>();
  for (const m of mappings.values()) if (m.status === "mapped" && m.xboxAchievementId) usedAchievements.set(m.xboxAchievementId, m.psTrophyId);
  const pending = trophies.filter((t) => (mappings.get(t.id)?.status ?? "pending") === "pending").length;

  return (
    <div>
      <div className="mb-4 text-sm"><Link href="/admin/games" className="text-muted hover:text-foreground">← Spiel-Mappings</Link></div>
      <PageHeader
        title={game.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="badge bg-ps/15 text-ps">{game.platform}</span>
            <span>→</span>
            <span className="badge bg-xbox/15 text-xbox">{xboxTitle.name}</span>
            <span>· {trophies.length} Trophäen, {achievements.length} Achievements · {pending} offen</span>
          </span>
        }
        actions={
          <form action={acceptAllSuggestions} className="flex items-center gap-2">
            <input type="hidden" name="psGameId" value={game.id} />
            <label className="text-xs text-muted">Vorschläge ab</label>
            <input name="minScore" type="number" step="0.05" min="0.3" max="1" defaultValue={env.autoMapThreshold} className="input w-24" />
            <button className="btn-primary" disabled={pending === 0}>alle übernehmen</button>
          </form>
        }
      />
      <div className="space-y-3">
        {trophies.map((t) => {
          const m = mappings.get(t.id);
          const status = m?.status ?? "pending";
          const chosen = m?.xboxAchievementId ? achById.get(m.xboxAchievementId) : null;
          const suggested = m?.suggestedXboxAchievementId ? achById.get(m.suggestedXboxAchievementId) : null;
          const ranked = status === "pending" ? rankCandidates({ name: t.name, detail: t.detail }, achievements, (a) => ({ name: a.name, detail: a.description }), 3) : [];
          return (
            <div key={t.id} className="card">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
                <div className="flex items-start gap-3">
                  <Artwork src={t.iconUrl} name={t.name} size={44} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{t.name}</span>
                      <TrophyBadge type={t.type} />
                      {t.hidden && <span className="badge bg-surface-2 text-muted">versteckt</span>}
                    </div>
                    <div className="text-sm text-muted">{t.detail}</div>
                  </div>
                </div>
                <div className="hidden items-center text-muted md:flex">→</div>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <StatusBadge status={status} />
                    {m?.note && <span className="text-xs text-muted">{m.note}</span>}
                  </div>
                  {status === "mapped" && chosen && (
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">{chosen.name}</div>
                        <div className="text-xs text-muted">{chosen.description}</div>
                      </div>
                      <GamerscoreBadge value={chosen.gamerscore} />
                    </div>
                  )}
                  {status === "pending" && (
                    <form action={decideTrophy} className="space-y-2">
                      <input type="hidden" name="psTrophyId" value={t.id} />
                      <input type="hidden" name="psGameId" value={game.id} />
                      <select name="xboxAchievementId" className="input" defaultValue={suggested?.id ?? ""}>
                        <option value="">– Achievement wählen –</option>
                        {achievements.map((a) => {
                          const usedBy = usedAchievements.get(a.id);
                          return (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.gamerscore} G){usedBy ? " – bereits zugeordnet" : ""}
                            </option>
                          );
                        })}
                      </select>
                      {ranked.length > 0 && (
                        <div className="text-xs text-muted">
                          Vorschläge:{" "}
                          {ranked.map((c, i) => (
                            <span key={c.item.id}>
                              {i > 0 && " · "}
                              <b className="text-foreground">{c.item.name}</b> ({percent(c.score)})
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button name="intent" value="map" className="btn-xbox px-3 py-1">Zuordnen</button>
                        <button name="intent" value="none" className="btn-ghost px-3 py-1">Kein Gegenstück</button>
                      </div>
                    </form>
                  )}
                  {status !== "pending" && (
                    <form action={decideTrophy} className="mt-2">
                      <input type="hidden" name="psTrophyId" value={t.id} />
                      <input type="hidden" name="psGameId" value={game.id} />
                      <button name="intent" value="reset" className="text-xs text-muted hover:text-foreground">Zurücksetzen</button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
