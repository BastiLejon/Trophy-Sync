import Link from "next/link";
import { and, count, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { decideGame, recomputeSuggestions } from "@/app/actions/admin";
import { Artwork, PageHeader, StatusBadge } from "@/components/ui";
import { percent } from "@/lib/format";

export default async function AdminGamesPage() {
  await requireAdmin();
  const { psGames, gameMappings, xboxTitles, psTrophies, trophyMappings } = schema;
  const rows = db
    .select({ game: psGames, mapping: gameMappings })
    .from(psGames)
    .leftJoin(gameMappings, eq(gameMappings.psGameId, psGames.id))
    .orderBy(sql`case ${gameMappings.status} when 'pending' then 0 when 'mapped' then 1 else 2 end`, psGames.name)
    .all();
  const titles = db.select().from(xboxTitles).orderBy(xboxTitles.name).all();
  const titleById = new Map(titles.map((t) => [t.id, t]));

  const pendingTrophies = new Map(
    db
      .select({ psGameId: psTrophies.psGameId, n: count() })
      .from(trophyMappings)
      .innerJoin(psTrophies, eq(trophyMappings.psTrophyId, psTrophies.id))
      .where(eq(trophyMappings.status, "pending"))
      .groupBy(psTrophies.psGameId)
      .all()
      .map((r) => [r.psGameId, r.n]),
  );
  const mappedTrophies = new Map(
    db
      .select({ psGameId: psTrophies.psGameId, n: count() })
      .from(trophyMappings)
      .innerJoin(psTrophies, eq(trophyMappings.psTrophyId, psTrophies.id))
      .where(and(eq(trophyMappings.status, "mapped")))
      .groupBy(psTrophies.psGameId)
      .all()
      .map((r) => [r.psGameId, r.n]),
  );

  return (
    <div>
      <div className="mb-4 text-sm"><Link href="/admin" className="text-muted hover:text-foreground">← Admin</Link></div>
      <PageHeader
        title="Spiel-Mappings"
        subtitle="Ordne jedem PlayStation-Spiel den passenden Xbox-Titel zu oder markiere es als „kein Gegenstück“."
        actions={
          <form action={recomputeSuggestions}>
            <button className="btn-ghost">Vorschläge neu berechnen</button>
          </form>
        }
      />
      <div className="space-y-3">
        {rows.map(({ game, mapping }) => {
          const status = mapping?.status ?? "pending";
          const suggestion = mapping?.suggestedXboxTitleId ? titleById.get(mapping.suggestedXboxTitleId) : null;
          const chosen = mapping?.xboxTitleId ? titleById.get(mapping.xboxTitleId) : null;
          const total = game.definedBronze + game.definedSilver + game.definedGold + game.definedPlatinum;
          return (
            <div key={game.id} className="card">
              <div className="flex flex-wrap items-center gap-4">
                <Artwork src={game.iconUrl} name={game.name} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{game.name}</span>
                    <span className="badge bg-ps/15 text-ps">{game.platform}</span>
                    <StatusBadge status={status} />
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {total} Trophäen · {game.npCommunicationId}
                    {status === "mapped" && chosen && (
                      <> · Xbox: <b className="text-foreground">{chosen.name}</b> · Trophäen gemappt: {mappedTrophies.get(game.id) ?? 0}
                        {(pendingTrophies.get(game.id) ?? 0) > 0 && <span className="text-warning"> · offen: {pendingTrophies.get(game.id)}</span>}
                      </>
                    )}
                    {status === "no_counterpart" && mapping?.note && <> · {mapping.note}</>}
                  </div>
                </div>
                {status === "mapped" && (
                  <Link href={`/admin/games/${game.id}`} className="btn-primary">Trophäen zuordnen</Link>
                )}
              </div>

              {status === "pending" && (
                <form action={decideGame} className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_auto_auto]">
                  <input type="hidden" name="psGameId" value={game.id} />
                  <div>
                    <label className="mb-1 block text-xs text-muted">
                      Xbox-Titel {suggestion && <>· Vorschlag: <b className="text-foreground">{suggestion.name}</b> ({percent(mapping?.suggestionConfidence)})</>}
                    </label>
                    <select name="xboxTitleId" className="input" defaultValue={suggestion?.id ?? ""}>
                      <option value="">– Xbox-Titel wählen –</option>
                      {titles.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.achievementCount} Achievements, {t.totalGamerscore} G)</option>
                      ))}
                    </select>
                    <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                      <input type="checkbox" name="autoAccept" value="on" defaultChecked /> Sehr sichere Trophäen-Treffer automatisch übernehmen
                    </label>
                  </div>
                  <div className="flex items-end">
                    <button name="intent" value="map" className="btn-xbox">Zuordnen</button>
                  </div>
                  <div className="flex items-end">
                    <button name="intent" value="none" className="btn-ghost" formNoValidate>Kein Gegenstück</button>
                  </div>
                </form>
              )}
              {status !== "pending" && (
                <form action={decideGame} className="mt-3 flex justify-end">
                  <input type="hidden" name="psGameId" value={game.id} />
                  <button name="intent" value="reset" className="text-xs text-muted hover:text-foreground">Entscheidung zurücksetzen</button>
                </form>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <div className="card text-sm text-muted">Noch keine PlayStation-Spiele im Katalog. Sie erscheinen nach dem ersten Nutzer-Sync.</div>}
      </div>
    </div>
  );
}
