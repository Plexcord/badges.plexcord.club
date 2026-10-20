import { createHmac, timingSafeEqual } from "node:crypto";

export type SessionUser = { id: string; username: string; avatar: string | null };

export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // seconds

const sign = (data: string, secret: string) =>
  createHmac("sha256", secret).update(data).digest("base64url");

export function encodeSession(user: SessionUser, secret: string, now = Date.now()) {
  const data = Buffer.from(
    JSON.stringify({ ...user, exp: now + SESSION_MAX_AGE * 1000 }),
  ).toString("base64url");
  return `${data}.${sign(data, secret)}`;
}

export function decodeSession(raw: string, secret: string, now = Date.now()): SessionUser | null {
  const [data, sig] = raw.split(".");
  if (!data || !sig) return null;
  const expected = Buffer.from(sign(data, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(data, "base64url").toString());
    return s.exp > now ? { id: s.id, username: s.username, avatar: s.avatar } : null;
  } catch {
    return null;
  }
}
