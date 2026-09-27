import { eq } from "drizzle-orm";
import { db, nowIso, schema } from "@/lib/db";
import { env } from "@/lib/env";
import {
  ensureGameMapping,
  upsertPsGame,
  upsertPsTrophies,
  upsertXboxAchievements,
  upsertXboxTitle,
} from "@/lib/catalog";
import { DemoPsnClient } from "@/lib/providers/psn/demo";
import { RealPsnClient, refreshPsnTokens, type PsnTokens } from "@/lib/providers/psn/real";
import { DemoXboxClient } from "@/lib/providers/xbox/demo";
import { RealXboxClient, refreshXboxTokens, type XboxSessionTokens } from "@/lib/providers/xbox/real";
import type { PsnClient, PsnProfile, XboxClient, XboxProfile } from "@/lib/providers/types";

const { users, psnAccounts, xboxAccounts, userPsTitles, userPsTrophies, userXboxTitles, userXboxAchievements } =
  schema;

/* ---------- Konten verknüpfen ---------- */

function createUser(): number {
  return db.insert(users).values({}).returning({ id: users.id }).get().id;
}

/**
 * Verknüpft ein PSN-Konto mit dem aktuellen Benutzer (oder legt einen neuen an).
 * Existiert das PSN-Konto bereits bei einem anderen Benutzer, wird dieser Benutzer verwendet
 * (= Login über PlayStation).
 */
export function linkPsnAccount(
  currentUserId: number | undefined,
  profile: PsnProfile,
  tokens: PsnTokens | null,
): number {
  const existing = db.select().from(psnAccounts).where(eq(psnAccounts.accountId, profile.accountId)).get();
  const values = {
    accountId: profile.accountId,
    onlineId: profile.onlineId,
    avatarUrl: profile.avatarUrl,
    isDemo: tokens === null,
    accessToken: tokens?.accessToken ?? null,
    refreshToken: tokens?.refreshToken ?? null,
    accessExpiresAt: tokens?.accessExpiresAt ?? null,
    refreshExpiresAt: tokens?.refreshExpiresAt ?? null,
    trophyLevel: profile.trophyLevel,
    earnedBronze: profile.earned.bronze,
    earnedSilver: profile.earned.silver,
    earnedGold: profile.earned.gold,
    earnedPlatinum: profile.earned.platinum,
  };
  if (existing) {
    db.update(psnAccounts).set(values).where(eq(psnAccounts.id, existing.id)).run();
    return existing.userId;
  }
  let userId = currentUserId;
  if (userId && db.select().from(psnAccounts).where(eq(psnAccounts.userId, userId)).get()) {
    // Benutzer hat schon ein anderes PSN-Konto → neuer Benutzer.
    userId = undefined;
  }
  if (!userId || !db.select().from(users).where(eq(users.id, userId)).get()) userId = createUser();
  db.insert(psnAccounts).values({ ...values, userId }).run();
  return userId;
}

export function linkXboxAccount(
  currentUserId: number | undefined,
  profile: XboxProfile,
  tokens: XboxSessionTokens | null,
): number {
  const existing = db.select().from(xboxAccounts).where(eq(xboxAccounts.xuid, profile.xuid)).get();
  const values = {
    xuid: profile.xuid,
    gamertag: profile.gamertag,
    gamerpicUrl: profile.gamerpicUrl,
    gamerscore: profile.gamerscore,
    isDemo: tokens === null,
    msRefreshToken: tokens?.msRefreshToken ?? null,
    xstsToken: tokens?.xstsToken ?? null,
    userHash: tokens?.userHash ?? null,
    xstsExpiresAt: tokens?.xstsExpiresAt ?? null,
  };
  if (existing) {
    // Bereits einem Benutzer zugeordnet: wenn der aktuelle Benutzer noch kein Xbox-Konto hat
    // und das Xbox-Konto noch keinem PSN-Benutzer gehört, ziehe es zum aktuellen Benutzer um.
    if (currentUserId && existing.userId !== currentUserId) {
      const ownerHasPsn = db.select().from(psnAccounts).where(eq(psnAccounts.userId, existing.userId)).get();
      const currentHasXbox = db.select().from(xboxAccounts).where(eq(xboxAccounts.userId, currentUserId)).get();
      if (!ownerHasPsn && !currentHasXbox) {
        db.update(xboxAccounts).set({ ...values, userId: currentUserId }).where(eq(xboxAccounts.id, existing.id)).run();
        db.update(userXboxTitles).set({ userId: currentUserId }).where(eq(userXboxTitles.userId, existing.userId)).run();
        db.update(userXboxAchievements).set({ userId: currentUserId }).where(eq(userXboxAchievements.userId, existing.userId)).run();
        db.delete(users).where(eq(users.id, existing.userId)).run();
        return currentUserId;
      }
    }
    db.update(xboxAccounts).set(values).where(eq(xboxAccounts.id, existing.id)).run();
    return existing.userId;
  }
  let userId = currentUserId;
  if (userId && db.select().from(xboxAccounts).where(eq(xboxAccounts.userId, userId)).get()) userId = undefined;
  if (!userId || !db.select().from(users).where(eq(users.id, userId)).get()) userId = createUser();
  db.insert(xboxAccounts).values({ ...values, userId }).run();
  return userId;
}

export function getAccounts(userId: number) {
  return {
    psn: db.select().from(psnAccounts).where(eq(psnAccounts.userId, userId)).get() ?? null,
    xbox: db.select().from(xboxAccounts).where(eq(xboxAccounts.userId, userId)).get() ?? null,
  };
}

export function unlinkPsn(userId: number) {
  db.delete(psnAccounts).where(eq(psnAccounts.userId, userId)).run();
  db.delete(userPsTitles).where(eq(userPsTitles.userId, userId)).run();
  db.delete(userPsTrophies).where(eq(userPsTrophies.userId, userId)).run();
}

export function unlinkXbox(userId: number) {
  db.delete(xboxAccounts).where(eq(xboxAccounts.userId, userId)).run();
  db.delete(userXboxTitles).where(eq(userXboxTitles.userId, userId)).run();
  db.delete(userXboxAchievements).where(eq(userXboxAchievements.userId, userId)).run();
}

/* ---------- Clients mit Token-Refresh ---------- */

export async function getPsnClient(userId: number): Promise<PsnClient> {
  const acc = db.select().from(psnAccounts).where(eq(psnAccounts.userId, userId)).get();
  if (!acc) throw new Error("Kein PlayStation-Konto verknüpft.");
  if (acc.isDemo) {
    if (!env.demoMode) throw new Error("Demo-Modus ist deaktiviert.");
    return new DemoPsnClient();
  }
  let accessToken = acc.accessToken!;
  const expiresSoon = !acc.accessExpiresAt || new Date(acc.accessExpiresAt).getTime() - Date.now() < 60_000;
  if (expiresSoon) {
    if (!acc.refreshToken) throw new Error("PSN-Sitzung abgelaufen. Bitte erneut anmelden.");
    const t = await refreshPsnTokens(acc.refreshToken);
    db.update(psnAccounts)
      .set({
        accessToken: t.accessToken,
        refreshToken: t.refreshToken,
        accessExpiresAt: t.accessExpiresAt,
        refreshExpiresAt: t.refreshExpiresAt,
      })
      .where(eq(psnAccounts.id, acc.id))
      .run();
    accessToken = t.accessToken;
  }
  return new RealPsnClient(accessToken);
}

export async function getXboxClient(userId: number): Promise<XboxClient> {
  const acc = db.select().from(xboxAccounts).where(eq(xboxAccounts.userId, userId)).get();
  if (!acc) throw new Error("Kein Xbox-Konto verknüpft.");
  if (acc.isDemo) {
    if (!env.demoMode) throw new Error("Demo-Modus ist deaktiviert.");
    return new DemoXboxClient();
  }
  let { xstsToken, userHash } = acc;
  const expiresSoon = !acc.xstsExpiresAt || new Date(acc.xstsExpiresAt).getTime() - Date.now() < 60_000;
  if (expiresSoon || !xstsToken || !userHash) {
    if (!acc.msRefreshToken) throw new Error("Xbox-Sitzung abgelaufen. Bitte erneut anmelden.");
    const t = await refreshXboxTokens(acc.msRefreshToken);
    db.update(xboxAccounts)
      .set({ msRefreshToken: t.msRefreshToken, xstsToken: t.xstsToken, userHash: t.userHash, xstsExpiresAt: t.xstsExpiresAt })
      .where(eq(xboxAccounts.id, acc.id))
      .run();
    xstsToken = t.xstsToken;
    userHash = t.userHash;
  }
  return new RealXboxClient(acc.xuid, userHash!, xstsToken!);
}

/* ---------- Bibliotheken importieren ---------- */

export interface PsnImportSummary {
  titles: number;
  trophiesDefined: number;
  trophiesEarned: number;
}

/** Liest Spiele + Trophäen aus PSN, aktualisiert Katalog und Nutzerfortschritt. */
export async function importPsnLibrary(userId: number, client?: PsnClient): Promise<PsnImportSummary> {
  const psn = client ?? (await getPsnClient(userId));
  const titles = await psn.getTitles();
  const summary: PsnImportSummary = { titles: 0, trophiesDefined: 0, trophiesEarned: 0 };
  for (const title of titles) {
    const game = upsertPsGame(title);
    const { trophies, earnedTrophies } = await psn.getTitleTrophies(title);
    const rows = upsertPsTrophies(game.id, trophies);
    const byTrophyId = new Map(rows.map((r) => [r.trophyId, r.id]));
    summary.titles++;
    summary.trophiesDefined += rows.length;

    db.insert(userPsTitles)
      .values({
        userId,
        psGameId: game.id,
        progress: title.progress,
        earnedBronze: title.earned.bronze,
        earnedSilver: title.earned.silver,
        earnedGold: title.earned.gold,
        earnedPlatinum: title.earned.platinum,
        lastUpdatedAt: title.lastUpdatedAt,
      })
      .onConflictDoUpdate({
        target: [userPsTitles.userId, userPsTitles.psGameId],
        set: {
          progress: title.progress,
          earnedBronze: title.earned.bronze,
          earnedSilver: title.earned.silver,
          earnedGold: title.earned.gold,
          earnedPlatinum: title.earned.platinum,
          lastUpdatedAt: title.lastUpdatedAt,
        },
      })
      .run();

    for (const e of earnedTrophies) {
      if (!e.earned) continue;
      const psTrophyId = byTrophyId.get(e.trophyId);
      if (!psTrophyId) continue;
      db.insert(userPsTrophies)
        .values({ userId, psTrophyId, earnedAt: e.earnedAt })
        .onConflictDoUpdate({ target: [userPsTrophies.userId, userPsTrophies.psTrophyId], set: { earnedAt: e.earnedAt } })
        .run();
      summary.trophiesEarned++;
    }
    ensureGameMapping(game);
  }
  db.update(psnAccounts).set({ lastImportedAt: nowIso() }).where(eq(psnAccounts.userId, userId)).run();
  return summary;
}

export interface XboxImportSummary {
  titles: number;
  achievementsDefined: number;
  achievementsUnlocked: number;
}

/** Liest gespielte Titel + Achievements aus Xbox Live, aktualisiert Katalog und echten Fortschritt. */
export async function importXboxLibrary(userId: number, client?: XboxClient): Promise<XboxImportSummary> {
  const xbox = client ?? (await getXboxClient(userId));
  const [profile, titles] = await Promise.all([xbox.getProfile(), xbox.getTitles()]);
  const summary: XboxImportSummary = { titles: 0, achievementsDefined: 0, achievementsUnlocked: 0 };
  for (const t of titles) {
    const title = upsertXboxTitle(t);
    const achievements = await xbox.getTitleAchievements(t.titleId);
    const rows = upsertXboxAchievements(title.id, achievements);
    const byAchId = new Map(rows.map((r) => [r.achievementId, r.id]));
    summary.titles++;
    summary.achievementsDefined += rows.length;
    db.insert(userXboxTitles)
      .values({ userId, xboxTitleId: title.id, lastPlayedAt: t.lastPlayedAt })
      .onConflictDoUpdate({ target: [userXboxTitles.userId, userXboxTitles.xboxTitleId], set: { lastPlayedAt: t.lastPlayedAt } })
      .run();
    for (const a of achievements) {
      if (!a.unlocked) continue;
      const xboxAchievementId = byAchId.get(a.achievementId);
      if (!xboxAchievementId) continue;
      // Echte Freischaltungen überschreiben symbolische aus dem Sync.
      db.insert(userXboxAchievements)
        .values({ userId, xboxAchievementId, unlockedAt: a.unlockedAt, source: "xbox", psTrophyId: null })
        .onConflictDoUpdate({
          target: [userXboxAchievements.userId, userXboxAchievements.xboxAchievementId],
          set: { unlockedAt: a.unlockedAt, source: "xbox", psTrophyId: null },
        })
        .run();
      summary.achievementsUnlocked++;
    }
  }
  db.update(xboxAccounts)
    .set({ gamerscore: profile.gamerscore, gamertag: profile.gamertag, gamerpicUrl: profile.gamerpicUrl, lastImportedAt: nowIso() })
    .where(eq(xboxAccounts.userId, userId))
    .run();
  // Neue Xbox-Titel könnten offene Spiel-Mappings mit Vorschlägen versorgen.
  for (const game of db.select().from(schema.psGames).all()) ensureGameMapping(game);
  return summary;
}
