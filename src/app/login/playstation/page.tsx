import Link from "next/link";
import { env } from "@/lib/env";
import { loginDemoPsn } from "@/app/actions/auth";
import { PageHeader } from "@/components/ui";
import { NpssoForm } from "./npsso-form";

const NPSSO_URL = "https://ca.account.sony.com/api/v1/ssocookie";

export default function PlaystationLoginPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Mit PlayStation anmelden" subtitle="Nachweis, dass dir das PSN-Konto gehört." />

      <div className="card border-t-4 border-t-ps">
        <h2 className="font-semibold">So funktioniert der Login</h2>
        <p className="mt-2 text-sm text-muted">
          Sony bietet für Drittanbieter-Webseiten keinen öffentlichen „Login with PlayStation“. Stattdessen
          meldest du dich direkt bei Sony an und übergibst Trophy Sync dein persönliches NPSSO-Token. Nur
          der eingeloggte Kontoinhaber kann dieses Token abrufen – damit ist der Besitz belegt. Trophy Sync
          nutzt damit dieselbe Schnittstelle wie die offizielle PlayStation-App.
        </p>
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="badge bg-ps/15 text-ps">1</span>
            <span>
              Melde dich bei{" "}
              <a href="https://www.playstation.com/" target="_blank" rel="noreferrer" className="text-ps underline">
                playstation.com
              </a>{" "}
              mit deinem PSN-Konto an.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="badge bg-ps/15 text-ps">2</span>
            <span>
              Öffne im selben Browser{" "}
              <a href={NPSSO_URL} target="_blank" rel="noreferrer" className="text-ps underline break-all">
                {NPSSO_URL}
              </a>
              . Du siehst eine Antwort wie <code className="rounded bg-surface-2 px-1">{"{ \"npsso\": \"…\" }"}</code>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="badge bg-ps/15 text-ps">3</span>
            <span>Kopiere den 64-stelligen Wert und füge ihn unten ein.</span>
          </li>
        </ol>
        <div className="mt-5">
          <NpssoForm />
        </div>
        <p className="mt-3 text-xs text-muted">
          Das NPSSO-Token wird nur einmal gegen ein Zugriffs-Token getauscht und nicht gespeichert. Das
          Zugriffs-Token liegt verschlüsselt in der Server-Datenbank und lässt sich jederzeit über „Verknüpfung lösen“ entfernen.
        </p>
      </div>

      {env.demoMode && (
        <div className="card mt-4">
          <h2 className="font-semibold">Demo-Konto verwenden</h2>
          <p className="mt-1 text-sm text-muted">
            Ohne echtes Konto ausprobieren: Das Demo-Konto „DemoHunter_DE“ enthält sieben Spiele mit Trophäen.
          </p>
          <form action={loginDemoPsn} className="mt-3">
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
