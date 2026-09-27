"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import {
  acceptTrophySuggestions,
  decideGameMapping,
  decideTrophyMapping,
  ensureGameMapping,
  resetGameMapping,
  resetTrophyMapping,
  upsertXboxAchievements,
  upsertXboxTitle,
} from "@/lib/catalog";
import { getXboxClient } from "@/lib/accounts";
import { DemoXboxClient } from "@/lib/providers/xbox/demo";
import { demoXboxCatalog } from "@/lib/providers/demo-data";
import type { XboxTitleInfo } from "@/lib/providers/types";

const ADMIN = "admin";

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function decideGame(formData: FormData): Promise<void> {
  await requireAdmin();
  const psGameId = num(formData.get("psGameId"));
  if (!psGameId) return;
  const intent = String(formData.get("intent") ?? "map");
  if (intent === "reset") {
    resetGameMapping(psGameId);
  } else if (intent === "none") {
    decideGameMapping(psGameId, { xboxTitleId: null, note: String(formData.get("note") ?? "") || null, decidedBy: ADMIN });
  } else {
    const xboxTitleId = num(formData.get("xboxTitleId"));
    if (!xboxTitleId) return;
    decideGameMapping(psGameId, {
      xboxTitleId,
      note: String(formData.get("note") ?? "") || null,
      decidedBy: ADMIN,
      autoAcceptTrophies: formData.get("autoAccept") !== "off",
    });
  }
  revalidatePath("/admin");
  revalidatePath("/admin/games");
  revalidatePath(`/admin/games/${psGameId}`);
}

export async function decideTrophy(formData: FormData): Promise<void> {
  await requireAdmin();
  const psTrophyId = num(formData.get("psTrophyId"));
  const psGameId = num(formData.get("psGameId"));
  if (!psTrophyId) return;
  const intent = String(formData.get("intent") ?? "map");
  if (intent === "reset") {
    resetTrophyMapping(psTrophyId);
  } else if (intent === "none") {
    decideTrophyMapping(psTrophyId, { xboxAchievementId: null, note: String(formData.get("note") ?? "") || null, decidedBy: ADMIN });
  } else {
    const xboxAchievementId = num(formData.get("xboxAchievementId"));
    if (!xboxAchievementId) return;
    decideTrophyMapping(psTrophyId, { xboxAchievementId, note: String(formData.get("note") ?? "") || null, decidedBy: ADMIN });
  }
  if (psGameId) revalidatePath(`/admin/games/${psGameId}`);
  revalidatePath("/admin/games");
}

export async function acceptAllSuggestions(formData: FormData): Promise<void> {
  await requireAdmin();
  const psGameId = num(formData.get("psGameId"));
  const minScore = num(formData.get("minScore")) ?? env.autoMapThreshold;
  if (!psGameId) return;
  acceptTrophySuggestions(psGameId, minScore, ADMIN);
  revalidatePath(`/admin/games/${psGameId}`);
  revalidatePath("/admin/games");
}

export async function recomputeSuggestions(): Promise<void> {
  await requireAdmin();
  for (const game of db.select().from(schema.psGames).all()) ensureGameMapping(game);
  revalidatePath("/admin/games");
}

export type ImportState = { error?: string; ok?: string } | undefined;

/**
 * Importiert einen Xbox-Titel samt Achievement-Liste in den Katalog.
 * Quelle: das verknüpfte Xbox-Konto des Admins (echt) oder der Demo-Katalog.
 */
export async function importXboxTitle(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const session = await requireAdmin();
  const titleId = String(formData.get("titleId") ?? "").trim();
  if (!titleId) return { error: "Bitte eine Xbox Title-ID angeben." };
  try {
    let info: XboxTitleInfo | undefined;
    let client;
    if (env.demoMode && demoXboxCatalog.some((t) => t.titleId === titleId)) {
      client = new DemoXboxClient();
      const t = demoXboxCatalog.find((t) => t.titleId === titleId)!;
      info = { ...t };
    } else {
      if (!session.userId) return { error: "Für den Live-Import muss der Admin selbst mit einem Xbox-Konto angemeldet sein." };
      client = await getXboxClient(session.userId);
      const achievements = await client.getTitleAchievements(titleId);
      if (!achievements.length) return { error: "Keine Achievements gefunden. Der Titel muss mindestens einmal vom Admin-Konto gestartet worden sein." };
      const name = String(formData.get("name") ?? "").trim() || `Xbox-Titel ${titleId}`;
      info = {
        titleId,
        name,
        iconUrl: null,
        devices: [],
        totalGamerscore: achievements.reduce((s, a) => s + a.gamerscore, 0),
        achievementCount: achievements.length,
        lastPlayedAt: null,
      };
      const row = upsertXboxTitle(info);
      upsertXboxAchievements(row.id, achievements);
      for (const game of db.select().from(schema.psGames).all()) ensureGameMapping(game);
      revalidatePath("/admin/catalog");
      return { ok: `„${name}“ mit ${achievements.length} Achievements importiert.` };
    }
    const row = upsertXboxTitle(info);
    upsertXboxAchievements(row.id, await client.getTitleAchievements(titleId));
    for (const game of db.select().from(schema.psGames).all()) ensureGameMapping(game);
    revalidatePath("/admin/catalog");
    return { ok: `„${info.name}“ importiert.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** Importiert einen Xbox-Titel aus eingefügtem JSON (Format siehe Katalogseite). */
export async function importXboxTitleJson(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  try {
    const parsed = JSON.parse(String(formData.get("json") ?? "")) as {
      titleId: string;
      name: string;
      iconUrl?: string;
      achievements: { id: string; name: string; description?: string; gamerscore: number; iconUrl?: string; isSecret?: boolean }[];
    };
    if (!parsed.titleId || !parsed.name || !Array.isArray(parsed.achievements)) throw new Error("titleId, name und achievements[] sind Pflicht.");
    const row = upsertXboxTitle({
      titleId: String(parsed.titleId),
      name: parsed.name,
      iconUrl: parsed.iconUrl ?? null,
      devices: [],
      totalGamerscore: 0,
      achievementCount: 0,
      lastPlayedAt: null,
    });
    upsertXboxAchievements(
      row.id,
      parsed.achievements.map((a) => ({
        achievementId: String(a.id),
        name: a.name,
        description: a.description ?? "",
        lockedDescription: a.description ?? "",
        gamerscore: Number(a.gamerscore) || 0,
        iconUrl: a.iconUrl ?? null,
        isSecret: Boolean(a.isSecret),
        rarityPercent: null,
        unlocked: false,
        unlockedAt: null,
      })),
    );
    for (const game of db.select().from(schema.psGames).all()) ensureGameMapping(game);
    revalidatePath("/admin/catalog");
    return { ok: `„${parsed.name}“ mit ${parsed.achievements.length} Achievements importiert.` };
  } catch (err) {
    return { error: `Import fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function deleteXboxTitle(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = num(formData.get("id"));
  if (!id) return;
  db.delete(schema.xboxTitles).where(eq(schema.xboxTitles.id, id)).run();
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/games");
}
