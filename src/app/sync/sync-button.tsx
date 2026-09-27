"use client";

import { useActionState } from "react";
import { startSync } from "@/app/actions/sync";

export function SyncButton({ labels }: { labels: { button: string; running: string } }) {
  const [state, action, pending] = useActionState(startSync, undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <button className="btn-primary" disabled={pending}>
        {pending ? labels.running : labels.button}
      </button>
      {state?.error && <span className="max-w-sm text-right text-xs text-danger">{state.error}</span>}
    </form>
  );
}
