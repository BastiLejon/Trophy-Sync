import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  exchangeRefreshTokenForAuthTokens,
  getProfileFromUserName,
  getTitleTrophies,
  getUserTitles,
  getUserTrophiesEarnedForTitle,
  getUserTrophyProfileSummary,
  type AuthTokensResponse,
} from "psn-api";
import type {
  PsnClient,
  PsnEarnedTrophy,
  PsnProfile,
  PsnTitle,
  PsnTrophyDefinition,
} from "../types";

/**
 * Echte PSN-Anbindung über die inoffizielle, aber etablierte PlayStation-Network-API
 * (dieselbe, die die offizielle PlayStation-App nutzt).
 *
 * Login-Flow: Der Nutzer meldet sich bei Sony an und liest sein NPSSO-Token aus.
 * Nur der eingeloggte Kontoinhaber kann dieses Token abrufen – damit ist der
 * Besitz des Accounts nachgewiesen. Das Token wird gegen Access/Refresh-Token getauscht.
 */
export interface PsnTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
}

function toTokens(res: AuthTokensResponse): PsnTokens {
  const now = Date.now();
  return {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
    accessExpiresAt: new Date(now + res.expiresIn * 1000).toISOString(),
    refreshExpiresAt: new Date(now + res.refreshTokenExpiresIn * 1000).toISOString(),
  };
}

export async function loginWithNpsso(npsso: string): Promise<PsnTokens> {
  const code = await exchangeNpssoForAccessCode(npsso.trim());
  return toTokens(await exchangeAccessCodeForAuthTokens(code));
}

export async function refreshPsnTokens(refreshToken: string): Promise<PsnTokens> {
  return toTokens(await exchangeRefreshTokenForAuthTokens(refreshToken));
}

export class RealPsnClient implements PsnClient {
  constructor(private readonly accessToken: string) {}

  private get auth() {
    return { accessToken: this.accessToken };
  }

  async getProfile(): Promise<PsnProfile> {
    const { profile } = await getProfileFromUserName(this.auth, "me");
    let trophyLevel: number | null = null;
    let earned = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    try {
      const summary = await getUserTrophyProfileSummary(this.auth, "me");
      trophyLevel = Number(summary.trophyLevel) || null;
      earned = summary.earnedTrophies;
    } catch {
      // Zusammenfassung ist optional.
    }
    const avatar = profile.avatarUrls?.find((a) => a.size === "l") ?? profile.avatarUrls?.[0];
    return {
      accountId: String(profile.accountId),
      onlineId: profile.onlineId,
      avatarUrl: avatar?.avatarUrl ?? null,
      trophyLevel,
      earned,
    };
  }

  async getTitles(): Promise<PsnTitle[]> {
    const all: PsnTitle[] = [];
    const limit = 200;
    for (let offset = 0; ; offset += limit) {
      const res = await getUserTitles(this.auth, "me", { limit, offset });
      for (const t of res.trophyTitles) {
        if (t.hiddenFlag) continue;
        all.push({
          npCommunicationId: t.npCommunicationId,
          npServiceName: t.npServiceName,
          name: t.trophyTitleName,
          platform: t.trophyTitlePlatform,
          iconUrl: t.trophyTitleIconUrl ?? null,
          defined: t.definedTrophies,
          earned: t.earnedTrophies,
          progress: t.progress,
          lastUpdatedAt: t.lastUpdatedDateTime ?? null,
        });
      }
      if (res.trophyTitles.length < limit || !res.nextOffset) break;
    }
    return all;
  }

  async getTitleTrophies(title: PsnTitle) {
    const opts = { npServiceName: title.npServiceName };
    const [defs, earned] = await Promise.all([
      getTitleTrophies(this.auth, title.npCommunicationId, "all", opts),
      getUserTrophiesEarnedForTitle(this.auth, "me", title.npCommunicationId, "all", opts),
    ]);
    const trophies: PsnTrophyDefinition[] = defs.trophies.map((t) => ({
      trophyId: t.trophyId,
      name: t.trophyName ?? `Trophy ${t.trophyId}`,
      detail: t.trophyDetail ?? "",
      type: t.trophyType,
      hidden: Boolean(t.trophyHidden),
      iconUrl: t.trophyIconUrl ?? null,
      groupId: t.trophyGroupId ?? "default",
    }));
    const earnedTrophies: PsnEarnedTrophy[] = earned.trophies.map((t) => ({
      trophyId: t.trophyId,
      earned: Boolean(t.earned),
      earnedAt: t.earnedDateTime ?? null,
    }));
    return { trophies, earnedTrophies };
  }
}
