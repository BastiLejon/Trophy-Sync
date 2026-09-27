import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = () => sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

/* ---------- Benutzer & verknüpfte Konten ---------- */

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at").notNull().default(now()),
});

export const psnAccounts = sqliteTable(
  "psn_accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    onlineId: text("online_id").notNull(),
    avatarUrl: text("avatar_url"),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessExpiresAt: text("access_expires_at"),
    refreshExpiresAt: text("refresh_expires_at"),
    trophyLevel: integer("trophy_level"),
    earnedBronze: integer("earned_bronze").notNull().default(0),
    earnedSilver: integer("earned_silver").notNull().default(0),
    earnedGold: integer("earned_gold").notNull().default(0),
    earnedPlatinum: integer("earned_platinum").notNull().default(0),
    lastImportedAt: text("last_imported_at"),
    createdAt: text("created_at").notNull().default(now()),
  },
  (t) => [
    uniqueIndex("psn_accounts_account_id").on(t.accountId),
    uniqueIndex("psn_accounts_user_id").on(t.userId),
  ],
);

export const xboxAccounts = sqliteTable(
  "xbox_accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    xuid: text("xuid").notNull(),
    gamertag: text("gamertag").notNull(),
    gamerpicUrl: text("gamerpic_url"),
    gamerscore: integer("gamerscore").notNull().default(0),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    msRefreshToken: text("ms_refresh_token"),
    xstsToken: text("xsts_token"),
    userHash: text("user_hash"),
    xstsExpiresAt: text("xsts_expires_at"),
    lastImportedAt: text("last_imported_at"),
    createdAt: text("created_at").notNull().default(now()),
  },
  (t) => [
    uniqueIndex("xbox_accounts_xuid").on(t.xuid),
    uniqueIndex("xbox_accounts_user_id").on(t.userId),
  ],
);

/* ---------- Kataloge (plattformübergreifend, einmal pro Spiel) ---------- */

export const psGames = sqliteTable(
  "ps_games",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    npCommunicationId: text("np_communication_id").notNull(),
    npServiceName: text("np_service_name").notNull().default("trophy2"),
    name: text("name").notNull(),
    platform: text("platform").notNull().default("PS5"),
    iconUrl: text("icon_url"),
    definedBronze: integer("defined_bronze").notNull().default(0),
    definedSilver: integer("defined_silver").notNull().default(0),
    definedGold: integer("defined_gold").notNull().default(0),
    definedPlatinum: integer("defined_platinum").notNull().default(0),
    createdAt: text("created_at").notNull().default(now()),
  },
  (t) => [uniqueIndex("ps_games_npcid").on(t.npCommunicationId)],
);

export const psTrophies = sqliteTable(
  "ps_trophies",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    psGameId: integer("ps_game_id")
      .notNull()
      .references(() => psGames.id, { onDelete: "cascade" }),
    trophyId: integer("trophy_id").notNull(),
    name: text("name").notNull(),
    detail: text("detail").notNull().default(""),
    type: text("type", { enum: ["bronze", "silver", "gold", "platinum"] }).notNull(),
    hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
    iconUrl: text("icon_url"),
    groupId: text("group_id").notNull().default("default"),
  },
  (t) => [uniqueIndex("ps_trophies_game_trophy").on(t.psGameId, t.trophyId)],
);

export const xboxTitles = sqliteTable(
  "xbox_titles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    titleId: text("title_id").notNull(),
    name: text("name").notNull(),
    iconUrl: text("icon_url"),
    devices: text("devices").notNull().default("XboxSeries"),
    totalGamerscore: integer("total_gamerscore").notNull().default(0),
    achievementCount: integer("achievement_count").notNull().default(0),
    createdAt: text("created_at").notNull().default(now()),
  },
  (t) => [uniqueIndex("xbox_titles_title_id").on(t.titleId)],
);

export const xboxAchievements = sqliteTable(
  "xbox_achievements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    xboxTitleId: integer("xbox_title_id")
      .notNull()
      .references(() => xboxTitles.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    lockedDescription: text("locked_description").notNull().default(""),
    gamerscore: integer("gamerscore").notNull().default(0),
    iconUrl: text("icon_url"),
    isSecret: integer("is_secret", { mode: "boolean" }).notNull().default(false),
    rarityPercent: real("rarity_percent"),
  },
  (t) => [
    uniqueIndex("xbox_achievements_title_ach").on(t.xboxTitleId, t.achievementId),
  ],
);

/* ---------- Admin-Mappings (einmalig pro Spiel/Trophäe) ---------- */

export const MAPPING_STATUS = ["pending", "mapped", "no_counterpart"] as const;
export type MappingStatus = (typeof MAPPING_STATUS)[number];

export const gameMappings = sqliteTable(
  "game_mappings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    psGameId: integer("ps_game_id")
      .notNull()
      .references(() => psGames.id, { onDelete: "cascade" }),
    xboxTitleId: integer("xbox_title_id").references(() => xboxTitles.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: MAPPING_STATUS }).notNull().default("pending"),
    /** Bester automatischer Vorschlag (nur informativ, bis der Admin entscheidet). */
    suggestedXboxTitleId: integer("suggested_xbox_title_id").references(
      () => xboxTitles.id,
      { onDelete: "set null" },
    ),
    suggestionConfidence: real("suggestion_confidence"),
    note: text("note"),
    decidedBy: text("decided_by"),
    decidedAt: text("decided_at"),
    updatedAt: text("updated_at").notNull().default(now()),
  },
  (t) => [uniqueIndex("game_mappings_ps_game").on(t.psGameId)],
);

export const trophyMappings = sqliteTable(
  "trophy_mappings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    psTrophyId: integer("ps_trophy_id")
      .notNull()
      .references(() => psTrophies.id, { onDelete: "cascade" }),
    xboxAchievementId: integer("xbox_achievement_id").references(
      () => xboxAchievements.id,
      { onDelete: "set null" },
    ),
    status: text("status", { enum: MAPPING_STATUS }).notNull().default("pending"),
    suggestedXboxAchievementId: integer("suggested_xbox_achievement_id").references(
      () => xboxAchievements.id,
      { onDelete: "set null" },
    ),
    suggestionConfidence: real("suggestion_confidence"),
    note: text("note"),
    decidedBy: text("decided_by"),
    decidedAt: text("decided_at"),
    updatedAt: text("updated_at").notNull().default(now()),
  },
  (t) => [uniqueIndex("trophy_mappings_ps_trophy").on(t.psTrophyId)],
);

/* ---------- Fortschritt pro Benutzer ---------- */

export const userPsTitles = sqliteTable(
  "user_ps_titles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    psGameId: integer("ps_game_id")
      .notNull()
      .references(() => psGames.id, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0),
    earnedBronze: integer("earned_bronze").notNull().default(0),
    earnedSilver: integer("earned_silver").notNull().default(0),
    earnedGold: integer("earned_gold").notNull().default(0),
    earnedPlatinum: integer("earned_platinum").notNull().default(0),
    lastUpdatedAt: text("last_updated_at"),
  },
  (t) => [uniqueIndex("user_ps_titles_user_game").on(t.userId, t.psGameId)],
);

export const userPsTrophies = sqliteTable(
  "user_ps_trophies",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    psTrophyId: integer("ps_trophy_id")
      .notNull()
      .references(() => psTrophies.id, { onDelete: "cascade" }),
    earnedAt: text("earned_at"),
  },
  (t) => [
    uniqueIndex("user_ps_trophies_user_trophy").on(t.userId, t.psTrophyId),
    index("user_ps_trophies_user").on(t.userId),
  ],
);

export const userXboxTitles = sqliteTable(
  "user_xbox_titles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    xboxTitleId: integer("xbox_title_id")
      .notNull()
      .references(() => xboxTitles.id, { onDelete: "cascade" }),
    lastPlayedAt: text("last_played_at"),
  },
  (t) => [uniqueIndex("user_xbox_titles_user_title").on(t.userId, t.xboxTitleId)],
);

export const ACHIEVEMENT_SOURCE = ["xbox", "playstation"] as const;
export type AchievementSource = (typeof ACHIEVEMENT_SOURCE)[number];

export const userXboxAchievements = sqliteTable(
  "user_xbox_achievements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    xboxAchievementId: integer("xbox_achievement_id")
      .notNull()
      .references(() => xboxAchievements.id, { onDelete: "cascade" }),
    unlockedAt: text("unlocked_at"),
    /** "xbox" = echt auf Xbox freigeschaltet, "playstation" = symbolisch per Sync übertragen. */
    source: text("source", { enum: ACHIEVEMENT_SOURCE }).notNull(),
    psTrophyId: integer("ps_trophy_id").references(() => psTrophies.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    uniqueIndex("user_xbox_achievements_user_ach").on(t.userId, t.xboxAchievementId),
    index("user_xbox_achievements_user").on(t.userId),
  ],
);

/* ---------- Feste Konto-Paarungen (zentral, plattformübergreifend) ---------- */

/**
 * Nach dem ersten erfolgreichen Sync wird ein PSN-Konto fest mit genau einem Xbox-Konto
 * gepaart. Die Paarung bleibt bestehen, auch wenn der Nutzer die Verknüpfung löst, damit
 * kein Konto ein zweites Mal (mit einem anderen Gegenkonto) verwendet werden kann.
 */
export const accountPairings = sqliteTable(
  "account_pairings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    psnAccountId: text("psn_account_id").notNull(),
    psnOnlineId: text("psn_online_id").notNull(),
    xuid: text("xuid").notNull(),
    gamertag: text("gamertag").notNull(),
    pairedAt: text("paired_at").notNull().default(now()),
    lastSyncAt: text("last_sync_at"),
    syncCount: integer("sync_count").notNull().default(0),
  },
  (t) => [
    uniqueIndex("account_pairings_psn").on(t.psnAccountId),
    uniqueIndex("account_pairings_xuid").on(t.xuid),
  ],
);

/* ---------- Sync-Läufe ---------- */

export const SYNC_ITEM_RESULT = [
  "synced",
  "already_synced",
  "already_unlocked_on_xbox",
  "trophy_pending",
  "trophy_no_counterpart",
  "game_pending",
  "game_no_counterpart",
] as const;
export type SyncItemResult = (typeof SYNC_ITEM_RESULT)[number];

export const syncRuns = sqliteTable("sync_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startedAt: text("started_at").notNull().default(now()),
  finishedAt: text("finished_at"),
  status: text("status", { enum: ["running", "done", "failed"] })
    .notNull()
    .default("running"),
  error: text("error"),
  /** JSON mit Zusammenfassung (Zähler). */
  summary: text("summary"),
});

export const syncRunItems = sqliteTable(
  "sync_run_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    runId: integer("run_id")
      .notNull()
      .references(() => syncRuns.id, { onDelete: "cascade" }),
    psGameId: integer("ps_game_id")
      .notNull()
      .references(() => psGames.id, { onDelete: "cascade" }),
    psTrophyId: integer("ps_trophy_id").references(() => psTrophies.id, {
      onDelete: "cascade",
    }),
    xboxAchievementId: integer("xbox_achievement_id").references(
      () => xboxAchievements.id,
      { onDelete: "set null" },
    ),
    result: text("result", { enum: SYNC_ITEM_RESULT }).notNull(),
    gamerscore: integer("gamerscore").notNull().default(0),
  },
  (t) => [index("sync_run_items_run").on(t.runId)],
);

export type User = typeof users.$inferSelect;
export type PsnAccount = typeof psnAccounts.$inferSelect;
export type XboxAccount = typeof xboxAccounts.$inferSelect;
export type PsGame = typeof psGames.$inferSelect;
export type PsTrophy = typeof psTrophies.$inferSelect;
export type XboxTitle = typeof xboxTitles.$inferSelect;
export type XboxAchievement = typeof xboxAchievements.$inferSelect;
export type GameMapping = typeof gameMappings.$inferSelect;
export type TrophyMapping = typeof trophyMappings.$inferSelect;
export type SyncRun = typeof syncRuns.$inferSelect;
export type AccountPairing = typeof accountPairings.$inferSelect;
export type SyncRunItem = typeof syncRunItems.$inferSelect;
