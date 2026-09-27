import { env } from "@/lib/env";
import type {
  XboxAchievementInfo,
  XboxClient,
  XboxProfile,
  XboxTitleInfo,
} from "../types";

/**
 * Echte Xbox-Live-Anbindung.
 *
 * 1. Microsoft-OAuth (login.live.com) mit Scope "XboxLive.signin offline_access"
 * 2. Tausch des MS-Access-Tokens in ein Xbox-User-Token (user.auth.xboxlive.com)
 * 3. Tausch in ein XSTS-Token (xsts.auth.xboxlive.com) → XUID, Gamertag, User-Hash
 * 4. Aufrufe gegen profile/titlehub/achievements.xboxlive.com mit "XBL3.0 x=<uhs>;<xsts>"
 */

const MS_AUTHORIZE = "https://login.live.com/oauth20_authorize.srf";
const MS_TOKEN = "https://login.live.com/oauth20_token.srf";
const XBL_USER_AUTH = "https://user.auth.xboxlive.com/user/authenticate";
const XSTS_AUTH = "https://xsts.auth.xboxlive.com/xsts/authorize";
const SCOPE = "XboxLive.signin offline_access";

export function buildXboxAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.xbox.clientId,
    response_type: "code",
    redirect_uri: env.xbox.redirectUri,
    scope: SCOPE,
    state,
  });
  return `${MS_AUTHORIZE}?${params.toString()}`;
}

interface MsTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function msToken(body: Record<string, string>): Promise<MsTokenResponse> {
  const res = await fetch(MS_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.xbox.clientId,
      client_secret: env.xbox.clientSecret,
      scope: SCOPE,
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Microsoft-Token-Fehler ${res.status}: ${await res.text()}`);
  return (await res.json()) as MsTokenResponse;
}

export interface XboxSessionTokens {
  msRefreshToken: string;
  xstsToken: string;
  userHash: string;
  xuid: string;
  gamertag: string;
  xstsExpiresAt: string;
}

async function exchangeForXsts(msAccessToken: string): Promise<XboxSessionTokens & { msRefreshToken: "" }> {
  const userRes = await fetch(XBL_USER_AUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      Properties: {
        AuthMethod: "RPS",
        SiteName: "user.auth.xboxlive.com",
        RpsTicket: `d=${msAccessToken}`,
      },
      RelyingParty: "http://auth.xboxlive.com",
      TokenType: "JWT",
    }),
  });
  if (!userRes.ok) throw new Error(`Xbox-User-Token-Fehler ${userRes.status}: ${await userRes.text()}`);
  const user = (await userRes.json()) as { Token: string };

  const xstsRes = await fetch(XSTS_AUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      Properties: { SandboxId: "RETAIL", UserTokens: [user.Token] },
      RelyingParty: "http://xboxlive.com",
      TokenType: "JWT",
    }),
  });
  if (!xstsRes.ok) {
    const text = await xstsRes.text();
    if (text.includes("2148916233")) {
      throw new Error("Dieses Microsoft-Konto hat noch kein Xbox-Profil. Bitte zuerst auf xbox.com anlegen.");
    }
    throw new Error(`XSTS-Fehler ${xstsRes.status}: ${text}`);
  }
  const xsts = (await xstsRes.json()) as {
    Token: string;
    NotAfter: string;
    DisplayClaims: { xui: { uhs: string; xid: string; gtg: string }[] };
  };
  const claim = xsts.DisplayClaims.xui[0];
  return {
    msRefreshToken: "",
    xstsToken: xsts.Token,
    userHash: claim.uhs,
    xuid: claim.xid,
    gamertag: claim.gtg,
    xstsExpiresAt: xsts.NotAfter,
  };
}

export async function loginWithAuthorizationCode(code: string): Promise<XboxSessionTokens> {
  const ms = await msToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.xbox.redirectUri,
  });
  const tokens = await exchangeForXsts(ms.access_token);
  return { ...tokens, msRefreshToken: ms.refresh_token };
}

export async function refreshXboxTokens(msRefreshToken: string): Promise<XboxSessionTokens> {
  const ms = await msToken({ grant_type: "refresh_token", refresh_token: msRefreshToken });
  const tokens = await exchangeForXsts(ms.access_token);
  return { ...tokens, msRefreshToken: ms.refresh_token ?? msRefreshToken };
}

/* ---------- API-Client ---------- */

interface TitleHubTitle {
  titleId: string;
  name: string;
  displayImage?: string;
  devices?: string[];
  achievement?: { currentAchievements: number; totalAchievements: number; currentGamerscore: number; totalGamerscore: number };
  titleHistory?: { lastTimePlayed?: string };
  type?: string;
}

interface AchievementsResponse {
  achievements: {
    id: string;
    name: string;
    description: string;
    lockedDescription: string;
    isSecret: boolean;
    progressState: string;
    progression?: { timeUnlocked?: string };
    mediaAssets?: { name: string; type: string; url: string }[];
    rewards?: { type: string; value: string }[];
    rarity?: { currentPercentage?: number };
  }[];
  pagingInfo?: { continuationToken?: string | null };
}

export class RealXboxClient implements XboxClient {
  constructor(
    private readonly xuid: string,
    private readonly userHash: string,
    private readonly xstsToken: string,
  ) {}

  private async get<T>(url: string, contractVersion = 2): Promise<T> {
    const res = await fetch(url, {
      headers: {
        Authorization: `XBL3.0 x=${this.userHash};${this.xstsToken}`,
        "x-xbl-contract-version": String(contractVersion),
        "Accept-Language": "de-DE,en-US",
        Accept: "application/json",
      },
    });
    if (!res.ok) throw new Error(`Xbox-API-Fehler ${res.status} für ${url}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  async getProfile(): Promise<XboxProfile> {
    const data = await this.get<{
      profileUsers: { id: string; settings: { id: string; value: string }[] }[];
    }>(
      "https://profile.xboxlive.com/users/me/profile/settings?settings=Gamertag,GameDisplayPicRaw,Gamerscore",
    );
    const user = data.profileUsers[0];
    const setting = (id: string) => user.settings.find((s) => s.id === id)?.value ?? "";
    return {
      xuid: user.id,
      gamertag: setting("Gamertag"),
      gamerpicUrl: setting("GameDisplayPicRaw") || null,
      gamerscore: Number(setting("Gamerscore")) || 0,
    };
  }

  async getTitles(): Promise<XboxTitleInfo[]> {
    const data = await this.get<{ titles: TitleHubTitle[] }>(
      `https://titlehub.xboxlive.com/users/xuid(${this.xuid})/titles/titlehistory/decoration/achievement,image,detail?maxItems=1000`,
    );
    return data.titles
      .filter((t) => (t.achievement?.totalAchievements ?? 0) > 0 && t.type !== "App")
      .map((t) => ({
        titleId: t.titleId,
        name: t.name,
        iconUrl: t.displayImage ?? null,
        devices: t.devices ?? [],
        totalGamerscore: t.achievement?.totalGamerscore ?? 0,
        achievementCount: t.achievement?.totalAchievements ?? 0,
        lastPlayedAt: t.titleHistory?.lastTimePlayed ?? null,
      }));
  }

  async getTitleAchievements(titleId: string): Promise<XboxAchievementInfo[]> {
    const out: XboxAchievementInfo[] = [];
    let continuation: string | null | undefined;
    do {
      const url = new URL(`https://achievements.xboxlive.com/users/xuid(${this.xuid})/achievements`);
      url.searchParams.set("titleId", titleId);
      url.searchParams.set("maxItems", "500");
      if (continuation) url.searchParams.set("continuationToken", continuation);
      const data = await this.get<AchievementsResponse>(url.toString());
      for (const a of data.achievements) {
        const gs = a.rewards?.find((r) => r.type === "Gamerscore")?.value;
        out.push({
          achievementId: a.id,
          name: a.name,
          description: a.description ?? "",
          lockedDescription: a.lockedDescription ?? "",
          gamerscore: Number(gs ?? 0) || 0,
          iconUrl: a.mediaAssets?.find((m) => m.type === "Icon")?.url ?? null,
          isSecret: Boolean(a.isSecret),
          rarityPercent: a.rarity?.currentPercentage ?? null,
          unlocked: a.progressState === "Achieved",
          unlockedAt: a.progression?.timeUnlocked && a.progressState === "Achieved" ? a.progression.timeUnlocked : null,
        });
      }
      continuation = data.pagingInfo?.continuationToken;
    } while (continuation);
    return out;
  }
}
