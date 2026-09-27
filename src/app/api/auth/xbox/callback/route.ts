import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { linkXboxAccount } from "@/lib/accounts";
import { loginWithAuthorizationCode, RealXboxClient } from "@/lib/providers/xbox/real";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const session = await getSession();
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login/xbox?error=${encodeURIComponent(reason)}`, env.appUrl));

  if (!code || !state || state !== session.xboxOAuthState) return fail("state_mismatch");
  session.xboxOAuthState = undefined;
  try {
    const tokens = await loginWithAuthorizationCode(code);
    const profile = await new RealXboxClient(tokens.xuid, tokens.userHash, tokens.xstsToken).getProfile();
    session.userId = linkXboxAccount(session.userId, profile, tokens);
    await session.save();
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
  return NextResponse.redirect(new URL("/", env.appUrl));
}
