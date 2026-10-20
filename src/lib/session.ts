import { cookies } from "next/headers";
import { connection } from "next/server";
import { prisma } from "./db";
import { decodeSession, encodeSession, SESSION_MAX_AGE, type SessionUser } from "./token";

const COOKIE = "session";
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return s;
};

export const sessionCookie = (user: SessionUser) => ({
  name: COOKIE,
  value: encodeSession(user, secret()),
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
});

export async function getSession() {
  await connection(); // the expiry check reads the clock, which may not run during a prefetch
  const raw = (await cookies()).get(COOKIE)?.value;
  return raw ? decodeSession(raw, secret()) : null;
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

// Every page, action and route re-checks access here; never trust the client.
export async function getAccess() {
  const user = await getSession();
  if (!user) return null;
  const row = await prisma.allowedUser.findUnique({ where: { id: user.id } });
  return { user, allowed: !!row, isAdmin: !!row?.isAdmin, badgeLimit: row?.badgeLimit ?? 0 };
}

export const avatarUrl = (u: SessionUser) =>
  u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) >> BigInt(22)) % 6}.png`;
