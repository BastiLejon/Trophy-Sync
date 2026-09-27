"use client";

import { useActionState } from "react";
import { startSync } from "@/app/actions/sync";

export function SyncButton() {
  const [state, action, pending] = useActionState(startSync, undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <button className="btn-primary" disabled={pending}>
        {pending ? "Synchronisiere…" : "Jetzt synchronisieren"}
      </button>
      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}
