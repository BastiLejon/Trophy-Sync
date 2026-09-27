/**
 * Zentrale Konfiguration. Alle Werte kommen aus Umgebungsvariablen,
 * mit sinnvollen Defaults für den lokalen Demo-Betrieb.
 */
function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

const isProduction = process.env.NODE_ENV === "production";
const DEV_SESSION_SECRET = "dev-only-secret-change-me-please-32chars-minimum!!";
const DEV_ADMIN_PASSWORD = "admin";

export const env = {
  isProduction,
  /** Demo-Modus: Login mit vorgefertigten Demo-Accounts ohne echte Sony/Microsoft-Zugangsdaten. Standard: an, außer in Produktion. */
  demoMode: bool(process.env.DEMO_MODE, !isProduction),
  /** Öffentliche Basis-URL der App (für OAuth-Redirects). */
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  /** Pfad zur SQLite-Datei. */
  databasePath: process.env.DATABASE_PATH ?? "./data/trophy-sync.db",
  /** Geheimnis für die verschlüsselten Session-Cookies (mind. 32 Zeichen). */
  sessionSecret: process.env.SESSION_SECRET ?? DEV_SESSION_SECRET,
  /** Schlüssel für die Token-Verschlüsselung in der DB (Fallback: SESSION_SECRET). */
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY ?? process.env.SESSION_SECRET ?? DEV_SESSION_SECRET,
  /** Admin-Passwort für den Mapping-Bereich. */
  adminPassword: process.env.ADMIN_PASSWORD ?? DEV_ADMIN_PASSWORD,
  /** Microsoft/Xbox OAuth (Microsoft Entra App Registration). */
  xbox: {
    clientId: process.env.XBOX_CLIENT_ID ?? "",
    clientSecret: process.env.XBOX_CLIENT_SECRET ?? "",
    redirectUri:
      process.env.XBOX_REDIRECT_URI ??
      `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/xbox/callback`,
  },
  /** Schwelle, ab der ein automatischer Mapping-Vorschlag als "sicher" gilt. */
  autoMapThreshold: Number(process.env.AUTO_MAP_THRESHOLD ?? "0.92"),
};

export const xboxOAuthConfigured = () =>
  env.xbox.clientId.length > 0 && env.xbox.clientSecret.length > 0;

/**
 * Prüft beim Serverstart, dass in Produktion keine Entwicklungs-Defaults aktiv sind.
 * Wirft mit klarer Meldung, statt unsicher zu starten.
 */
export function assertProductionConfig(): void {
  if (!isProduction) return;
  const problems: string[] = [];
  if (env.sessionSecret === DEV_SESSION_SECRET || env.sessionSecret.length < 32) {
    problems.push("SESSION_SECRET must be set to a random value with at least 32 characters.");
  }
  if (env.adminPassword === DEV_ADMIN_PASSWORD || env.adminPassword.length < 12) {
    problems.push("ADMIN_PASSWORD must be set and have at least 12 characters.");
  }
  if (!env.appUrl.startsWith("https://")) {
    console.warn("[trophy-sync] APP_URL is not https:// – session cookies will not carry the Secure flag.");
  }
  if (problems.length) {
    throw new Error(`Refusing to start with insecure production configuration:\n- ${problems.join("\n- ")}`);
  }
}
