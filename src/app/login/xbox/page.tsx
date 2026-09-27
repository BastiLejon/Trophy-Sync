import Link from "next/link";
import { env, xboxOAuthConfigured } from "@/lib/env";
import { loginDemoXbox } from "@/app/actions/auth";
import { Alert, PageHeader } from "@/components/ui";

export default async function XboxLoginPage({ searchParams }: PageProps<"/login/xbox">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const configured = xboxOAuthConfigured();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Mit Xbox anmelden" subtitle="Nachweis, dass dir das Xbox-Konto gehört." />
      {error && (
        <div className="mb-4">
          <Alert tone="error">
            {error === "not_configured"
              ? "Der Microsoft-Login ist auf diesem Server nicht konfiguriert (XBOX_CLIENT_ID / XBOX_CLIENT_SECRET fehlen)."
              : error === "state_mismatch"
                ? "Die Anmeldung konnte nicht zugeordnet werden. Bitte erneut versuchen."
                : `Anmeldung fehlgeschlagen: ${error}`}
          </Alert>
        </div>
      )}
      <div className="card border-t-4 border-t-xbox">
        <h2 className="font-semibold">Microsoft-Konto</h2>
        <p className="mt-2 text-sm text-muted">
          Du wirst zu Microsoft weitergeleitet und meldest dich dort mit dem Konto an, das zu deinem Gamertag gehört.
          Trophy Sync erhält nur Lesezugriff auf dein Xbox-Live-Profil (Scope <code className="rounded bg-surface-2 px-1">XboxLive.signin</code>).
        </p>
        <div className="mt-4">
          {configured ? (
            <a href="/api/auth/xbox/start" className="btn-xbox">Mit Microsoft anmelden</a>
          ) : (
            <button className="btn-xbox" disabled title="Nicht konfiguriert">Mit Microsoft anmelden</button>
          )}
        </div>
        {!configured && (
          <p className="mt-3 text-xs text-muted">
            Für den echten Login wird eine Azure-App-Registrierung benötigt. Siehe README (Abschnitt „Xbox Live“).
          </p>
        )}
      </div>

      {env.demoMode && (
        <div className="card mt-4">
          <h2 className="font-semibold">Demo-Konto verwenden</h2>
          <p className="mt-1 text-sm text-muted">
            Das Demo-Konto „DemoGamer“ hat bereits einige Achievements in Forza Horizon 5 und Hades freigeschaltet.
          </p>
          <form action={loginDemoXbox} className="mt-3">
            <button className="btn-ghost">Als Demo-Spieler anmelden</button>
          </form>
        </div>
      )}
      <div className="mt-6 text-sm">
        <Link href="/" className="text-muted hover:text-foreground">← Zurück</Link>
      </div>
    </div>
  );
}
