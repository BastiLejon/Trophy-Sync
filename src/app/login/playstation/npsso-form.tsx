"use client";

import { useActionState } from "react";
import { loginPsn } from "@/app/actions/auth";
import { Alert } from "@/components/ui";

export function NpssoForm() {
  const [state, action, pending] = useActionState(loginPsn, undefined);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <label className="block text-sm font-medium" htmlFor="npsso">
        NPSSO-Token
      </label>
      <input id="npsso" name="npsso" className="input font-mono" placeholder="64 Zeichen" autoComplete="off" required minLength={20} />
      <button className="btn-ps" disabled={pending}>
        {pending ? "Anmeldung läuft…" : "Anmelden und Trophäen freigeben"}
      </button>
    </form>
  );
}
