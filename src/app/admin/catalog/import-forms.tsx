"use client";

import { useActionState } from "react";
import { importXboxTitle, importXboxTitleJson } from "@/app/actions/admin";
import { Alert } from "@/components/ui";

const EXAMPLE = `{
  "titleId": "1234567890",
  "name": "Example Game",
  "achievements": [
    { "id": "1", "name": "First Steps", "description": "Finish the tutorial.", "gamerscore": 10 },
    { "id": "2", "name": "Master", "description": "Finish the game.", "gamerscore": 100, "isSecret": true }
  ]
}`;

export interface ImportLabels {
  liveTitle: string;
  liveText: string;
  titleId: string;
  name: string;
  importButton: string;
  importing: string;
  jsonTitle: string;
  jsonText: string;
  jsonButton: string;
}

export function ImportForms({ demoAvailable, labels }: { demoAvailable: { titleId: string; name: string }[]; labels: ImportLabels }) {
  const [liveState, liveAction, livePending] = useActionState(importXboxTitle, undefined);
  const [jsonState, jsonAction, jsonPending] = useActionState(importXboxTitleJson, undefined);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card">
        <h2 className="font-semibold">{labels.liveTitle}</h2>
        <p className="mt-1 text-xs text-muted">{labels.liveText}</p>
        <form action={liveAction} className="mt-3 space-y-2">
          {liveState?.error && <Alert tone="error">{liveState.error}</Alert>}
          {liveState?.ok && <Alert tone="success">{liveState.ok}</Alert>}
          {demoAvailable.length > 0 ? (
            <select name="titleId" className="input">
              {demoAvailable.map((d) => <option key={d.titleId} value={d.titleId}>{d.name} ({d.titleId})</option>)}
            </select>
          ) : (
            <input name="titleId" className="input" placeholder={labels.titleId} required />
          )}
          <input name="name" className="input" placeholder={labels.name} />
          <button className="btn-xbox" disabled={livePending}>{livePending ? labels.importing : labels.importButton}</button>
        </form>
      </div>
      <div className="card">
        <h2 className="font-semibold">{labels.jsonTitle}</h2>
        <p className="mt-1 text-xs text-muted">{labels.jsonText}</p>
        <form action={jsonAction} className="mt-3 space-y-2">
          {jsonState?.error && <Alert tone="error">{jsonState.error}</Alert>}
          {jsonState?.ok && <Alert tone="success">{jsonState.ok}</Alert>}
          <textarea name="json" className="input h-40 font-mono text-xs" defaultValue={EXAMPLE} required />
          <button className="btn-ghost" disabled={jsonPending}>{jsonPending ? labels.importing : labels.jsonButton}</button>
        </form>
      </div>
    </div>
  );
}
