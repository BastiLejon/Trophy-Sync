"use client";

import { useActionState } from "react";
import { importXboxTitle, importXboxTitleJson } from "@/app/actions/admin";
import { Alert } from "@/components/ui";

const EXAMPLE = `{
  "titleId": "1234567890",
  "name": "Beispielspiel",
  "achievements": [
    { "id": "1", "name": "Erste Schritte", "description": "Beende das Tutorial.", "gamerscore": 10 },
    { "id": "2", "name": "Meister", "description": "Beende das Spiel.", "gamerscore": 100, "isSecret": true }
  ]
}`;

export function ImportForms({ demoAvailable }: { demoAvailable: { titleId: string; name: string }[] }) {
  const [liveState, liveAction, livePending] = useActionState(importXboxTitle, undefined);
  const [jsonState, jsonAction, jsonPending] = useActionState(importXboxTitleJson, undefined);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card">
        <h2 className="font-semibold">Aus Xbox Live importieren</h2>
        <p className="mt-1 text-xs text-muted">
          Lädt die Achievement-Liste eines Titels über das verknüpfte Xbox-Konto des Admins. Der Titel muss dort mindestens einmal
          gestartet worden sein. Die Title-ID findest du z.&nbsp;B. in der URL auf xbox.com.
        </p>
        <form action={liveAction} className="mt-3 space-y-2">
          {liveState?.error && <Alert tone="error">{liveState.error}</Alert>}
          {liveState?.ok && <Alert tone="success">{liveState.ok}</Alert>}
          {demoAvailable.length > 0 ? (
            <select name="titleId" className="input">
              {demoAvailable.map((d) => <option key={d.titleId} value={d.titleId}>{d.name} ({d.titleId})</option>)}
            </select>
          ) : (
            <input name="titleId" className="input" placeholder="Title-ID, z. B. 1551648579" required />
          )}
          <input name="name" className="input" placeholder="Anzeigename (optional)" />
          <button className="btn-xbox" disabled={livePending}>{livePending ? "Importiere…" : "Importieren"}</button>
        </form>
      </div>
      <div className="card">
        <h2 className="font-semibold">Aus JSON importieren</h2>
        <p className="mt-1 text-xs text-muted">Für Titel, die ohne Xbox-Zugang gepflegt werden sollen.</p>
        <form action={jsonAction} className="mt-3 space-y-2">
          {jsonState?.error && <Alert tone="error">{jsonState.error}</Alert>}
          {jsonState?.ok && <Alert tone="success">{jsonState.ok}</Alert>}
          <textarea name="json" className="input h-40 font-mono text-xs" defaultValue={EXAMPLE} required />
          <button className="btn-ghost" disabled={jsonPending}>{jsonPending ? "Importiere…" : "JSON importieren"}</button>
        </form>
      </div>
    </div>
  );
}
