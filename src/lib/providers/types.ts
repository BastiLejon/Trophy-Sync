/**
 * Plattformneutrale Datenformen, die die Provider (echt oder Demo) liefern.
 * Die Sync-Engine und die Kataloge arbeiten ausschließlich mit diesen Typen.
 */

export type TrophyType = "bronze" | "silver" | "gold" | "platinum";

export interface PsnProfile {
  accountId: string;
  onlineId: string;
  avatarUrl: string | null;
  trophyLevel: number | null;
  earned: { bronze: number; silver: number; gold: number; platinum: number };
}

export interface PsnTitle {
  npCommunicationId: string;
  npServiceName: "trophy" | "trophy2";
  name: string;
  platform: string;
  iconUrl: string | null;
  defined: { bronze: number; silver: number; gold: number; platinum: number };
  earned: { bronze: number; silver: number; gold: number; platinum: number };
  progress: number;
  lastUpdatedAt: string | null;
}

export interface PsnTrophyDefinition {
  trophyId: number;
  name: string;
  detail: string;
  type: TrophyType;
  hidden: boolean;
  iconUrl: string | null;
  groupId: string;
}

export interface PsnEarnedTrophy {
  trophyId: number;
  earned: boolean;
  earnedAt: string | null;
}

export interface PsnTitleWithTrophies extends PsnTitle {
  trophies: PsnTrophyDefinition[];
  earnedTrophies: PsnEarnedTrophy[];
}

export interface XboxProfile {
  xuid: string;
  gamertag: string;
  gamerpicUrl: string | null;
  gamerscore: number;
}

export interface XboxTitleInfo {
  titleId: string;
  name: string;
  iconUrl: string | null;
  devices: string[];
  totalGamerscore: number;
  achievementCount: number;
  lastPlayedAt: string | null;
}

export interface XboxAchievementInfo {
  achievementId: string;
  name: string;
  description: string;
  lockedDescription: string;
  gamerscore: number;
  iconUrl: string | null;
  isSecret: boolean;
  rarityPercent: number | null;
  /** Vom Spieler bereits echt freigeschaltet? */
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface XboxTitleWithAchievements extends XboxTitleInfo {
  achievements: XboxAchievementInfo[];
}

/** Zugriff auf ein PlayStation-Konto (Token bereits vorhanden). */
export interface PsnClient {
  getProfile(): Promise<PsnProfile>;
  getTitles(): Promise<PsnTitle[]>;
  getTitleTrophies(title: PsnTitle): Promise<{
    trophies: PsnTrophyDefinition[];
    earnedTrophies: PsnEarnedTrophy[];
  }>;
}

/** Zugriff auf ein Xbox-Konto (Token bereits vorhanden). */
export interface XboxClient {
  getProfile(): Promise<XboxProfile>;
  getTitles(): Promise<XboxTitleInfo[]>;
  getTitleAchievements(titleId: string): Promise<XboxAchievementInfo[]>;
}
