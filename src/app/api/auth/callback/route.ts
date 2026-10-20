import { NextResponse, type NextRequest } from "next/server";
import { sessionCookie } from "@/lib/session";

export async function GET(req: NextRequest) {
  const base = process.env.PUBLIC_URL!;
  const fail = () => NextResponse.redirect(new URL("/panel?error=login", base));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state || state !== req.cookies.get("oauth_state")?.value) return fail();

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${base}/api/auth/callback`,
    }),
  });
  if (!tokenRes.ok) return fail();
  const { access_token } = await tokenRes.json();

  const meRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!meRes.ok) return fail();
  const me = await meRes.json();

  const res = NextResponse.redirect(new URL("/panel", base));
  res.cookies.set(sessionCookie({ id: me.id, username: me.global_name ?? me.username, avatar: me.avatar }));
  res.cookies.delete("oauth_state");
  return res;
}
