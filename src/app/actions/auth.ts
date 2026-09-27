"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { linkPsnAccount, linkXboxAccount, unlinkPsn, unlinkXbox } from "@/lib/accounts";
import { loginWithNpsso, RealPsnClient } from "@/lib/providers/psn/real";
import { DemoPsnClient } from "@/lib/providers/psn/demo";
import { DemoXboxClient } from "@/lib/providers/xbox/demo";

export type ActionState = { error?: string } | undefined;

/** Login mit PlayStation über das NPSSO-Token. */
export async function loginPsn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const npsso = String(formData.get("npsso") ?? "").trim();
  if (npsso.length < 20) return { error: "Bitte ein gültiges NPSSO-Token einfügen (64 Zeichen)." };
  let userId: number;
  try {
    const tokens = await loginWithNpsso(npsso);
    const profile = await new RealPsnClient(tokens.accessToken).getProfile();
    const session = await getSession();
    userId = linkPsnAccount(session.userId, profile, tokens);
    session.userId = userId;
    await session.save();
  } catch (err) {
    return { error: `PlayStation-Anmeldung fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` };
  }
  redirect("/");
}

export async function loginDemoPsn(): Promise<void> {
  if (!env.demoMode) throw new Error("Demo-Modus ist deaktiviert.");
  const profile = await new DemoPsnClient().getProfile();
  const session = await getSession();
  session.userId = linkPsnAccount(session.userId, profile, null);
  await session.save();
  redirect("/");
}

export async function loginDemoXbox(): Promise<void> {
  if (!env.demoMode) throw new Error("Demo-Modus ist deaktiviert.");
  const profile = await new DemoXboxClient().getProfile();
  const session = await getSession();
  session.userId = linkXboxAccount(session.userId, profile, null);
  await session.save();
  redirect("/");
}

export async function unlinkPsnAction(): Promise<void> {
  const session = await getSession();
  if (session.userId) unlinkPsn(session.userId);
  redirect("/");
}

export async function unlinkXboxAction(): Promise<void> {
  const session = await getSession();
  if (session.userId) unlinkXbox(session.userId);
  redirect("/");
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/");
}

export async function adminLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (password !== env.adminPassword) return { error: "Falsches Passwort." };
  const session = await getSession();
  session.isAdmin = true;
  await session.save();
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  const session = await getSession();
  session.isAdmin = false;
  await session.save();
  redirect("/admin");
}
