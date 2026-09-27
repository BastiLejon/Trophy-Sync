"use client";

import { useActionState } from "react";
import { adminLogin } from "@/app/actions/auth";
import { Alert } from "@/components/ui";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, undefined);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <label className="block text-sm font-medium" htmlFor="password">Admin-Passwort</label>
      <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
      <button className="btn-primary" disabled={pending}>{pending ? "Prüfe…" : "Anmelden"}</button>
      <p className="text-xs text-muted">Wird über die Umgebungsvariable ADMIN_PASSWORD gesetzt (Standard im Demo-Modus: „admin“).</p>
    </form>
  );
}
