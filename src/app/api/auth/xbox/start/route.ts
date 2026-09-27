import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { env, xboxOAuthConfigured } from "@/lib/env";
import { getSession } from "@/lib/session";
import { buildXboxAuthorizeUrl } from "@/lib/providers/xbox/real";

export async function GET() {
  if (!xboxOAuthConfigured()) {
    return NextResponse.redirect(new URL("/login/xbox?error=not_configured", env.appUrl));
  }
  const session = await getSession();
  const state = randomBytes(16).toString("hex");
  session.xboxOAuthState = state;
  await session.save();
  return NextResponse.redirect(buildXboxAuthorizeUrl(state));
}
