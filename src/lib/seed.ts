import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { decideGameMapping, ensureGameMapping, upsertXboxAchievements, upsertXboxTitle } from "@/lib/catalog";
import { demoSeedGameDecisions, demoXboxCatalog } from "@/lib/providers/demo-data";
import { DemoPsnClient } from "@/lib/providers/psn/demo";
import { upsertPsGame, upsertPsTrophies } from "@/lib/catalog";

/**
 * Befüllt im Demo-Modus den Xbox-Katalog und die PS-Kataloge und setzt einige
 * Admin-Entscheidungen, als wären sie bereits getroffen. Idempotent.
 */
export async function seedDemoCatalog(): Promise<void> {
  if (!env.demoMode) return;
  const marker = db.select().from(schema.xboxTitles).where(eq(schema.xboxTitles.titleId, demoXboxCatalog[0].titleId)).get();
  if (marker) return;

  for (const t of demoXboxCatalog) {
    const row = upsertXboxTitle(t);
    upsertXboxAchievements(row.id, t.achievements);
  }
  const psn = new DemoPsnClient();
  for (const title of await psn.getTitles()) {
    const game = upsertPsGame(title);
    const { trophies } = await psn.getTitleTrophies(title);
    upsertPsTrophies(game.id, trophies);
    ensureGameMapping(game);
  }
  for (const d of demoSeedGameDecisions) {
    const game = db.select().from(schema.psGames).where(eq(schema.psGames.npCommunicationId, d.npCommunicationId)).get();
    if (!game) continue;
    const xbox = d.xboxTitleId
      ? db.select().from(schema.xboxTitles).where(eq(schema.xboxTitles.titleId, d.xboxTitleId)).get()
      : null;
    decideGameMapping(game.id, {
      xboxTitleId: xbox?.id ?? null,
      note: d.note ?? null,
      decidedBy: "seed-admin",
      autoAcceptTrophies: true,
    });
  }
}
