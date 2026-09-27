"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { linkPsnAccount, linkXboxAccount, unlinkPsn, unlinkXbox } from "@/lib/accounts";
import { loginWithNpsso, RealPsnClient } from "@/lib/providers/psn/real";
import { DemoPsnClient } from "@/lib/providers/psn/demo";
import { DemoXboxClient } from "@/lib/providers/xbox/demo";
import { isBlocked, recordFailure, recordSuccess } from "@/lib/throttle";

export type ActionState = { error?: string } | undefined;

/** Login mit PlayStation über das NPSSO-Token. */
export async function loginPsn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getT();
  const npsso = String(formData.get("npsso") ?? "").trim();
  if (npsso.length < 20) return { error: t("psLogin.error.invalid") };
  try {
    const tokens = await loginWithNpsso(npsso);
    const profile = await new RealPsnClient(tokens.accessToken).getProfile();
    const session = await getSession();
    session.userId = linkPsnAccount(session.userId, profile, tokens);
    await session.save();
  } catch (err) {
    return { error: t("psLogin.error.failed", { message: err instanceof Error ? err.message : String(err) }) };
  }
  redirect("/");
}

export async function loginDemoPsn(): Promise<void> {
  if (!env.demoMode) throw new Error("Demo mode is disabled.");
  const profile = await new DemoPsnClient().getProfile();
  const session = await getSession();
  session.userId = linkPsnAccount(session.userId, profile, null);
  await session.save();
  redirect("/");
}

export async function loginDemoXbox(): Promise<void> {
  if (!env.demoMode) throw new Error("Demo mode is disabled.");
  const profile = await new DemoXboxClient().getProfile();
  const session = await getSession();
  session.userId = linkXboxAccount(session.userId, profile, null);
  await session.save();
  redirect("/");
}

function unlinkRedirect(err: unknown): never {
  redirect(err instanceof Error && err.message === "locked" ? "/?error=unlink_locked" : "/");
}

export async function unlinkPsnAction(): Promise<void> {
  const session = await getSession();
  try {
    if (session.userId) unlinkPsn(session.userId);
  } catch (err) {
    unlinkRedirect(err);
  }
  redirect("/");
}

export async function unlinkXboxAction(): Promise<void> {
  const session = await getSession();
  try {
    if (session.userId) unlinkXbox(session.userId);
  } catch (err) {
    unlinkRedirect(err);
  }
  redirect("/");
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/");
}

async function clientKey(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "local").split(",")[0].trim();
}

export async function adminLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getT();
  const key = await clientKey();
  const blockedUntil = isBlocked(key);
  if (blockedUntil) return { error: t("admin.error.throttled", { minutes: Math.ceil((blockedUntil - Date.now()) / 60000) }) };
  const password = String(formData.get("password") ?? "");
  if (password.length === 0 || password !== env.adminPassword) {
    recordFailure(key);
    return { error: t("admin.error.wrongPassword") };
  }
  recordSuccess(key);
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
