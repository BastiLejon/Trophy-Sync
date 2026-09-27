"use client";

import { useActionState } from "react";
import { adminLogin } from "@/app/actions/auth";
import { Alert } from "@/components/ui";

export function AdminLoginForm({ labels }: { labels: { password: string; hint: string; submit: string; submitting: string } }) {
  const [state, action, pending] = useActionState(adminLogin, undefined);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <label className="block text-sm font-medium" htmlFor="password">{labels.password}</label>
      <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
      <button className="btn-primary" disabled={pending}>{pending ? labels.submitting : labels.submit}</button>
      <p className="text-xs text-muted">{labels.hint}</p>
    </form>
  );
}
