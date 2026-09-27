/**
 * Zentrale Konfiguration. Alle Werte kommen aus Umgebungsvariablen,
 * mit sinnvollen Defaults für den lokalen Demo-Betrieb.
 */
function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const env = {
  /** Demo-Modus: erlaubt Login mit vorgefertigten Demo-Accounts ohne echte Sony/Microsoft-Zugangsdaten. */
  demoMode: bool(process.env.DEMO_MODE, true),
  /** Öffentliche Basis-URL der App (für OAuth-Redirects). */
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  /** Pfad zur SQLite-Datei. */
  databasePath: process.env.DATABASE_PATH ?? "./data/trophy-sync.db",
  /** Geheimnis für die verschlüsselten Session-Cookies (mind. 32 Zeichen). */
  sessionSecret:
    process.env.SESSION_SECRET ??
    "dev-only-secret-change-me-please-32chars-minimum!!",
  /** Admin-Passwort für den Mapping-Bereich. */
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin",
  /** Microsoft/Xbox OAuth (Azure App Registration). */
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
