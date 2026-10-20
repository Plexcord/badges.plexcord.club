import { randomBytes } from "node:crypto";
import { connection, NextResponse } from "next/server";

export async function GET() {
  await connection();
  const state = randomBytes(16).toString("hex");
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    response_type: "code",
    redirect_uri: `${process.env.PUBLIC_URL}/api/auth/callback`,
    scope: "identify",
    state,
    prompt: "none",
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
