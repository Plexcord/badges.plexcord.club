// Run: npm test  (Node 22.18+ strips TS types natively)
import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeSession, encodeSession } from "./token.ts";
import { contentDisposition, fetchImage, sniff } from "./images.ts";

const secret = "x".repeat(32);
const user = { id: "123456789012345678", username: "test", avatar: null };

test("session round-trips and rejects tampering, wrong secret and expiry", () => {
  const raw = encodeSession(user, secret, 1000);
  assert.deepEqual(decodeSession(raw, secret, 2000), user);

  const [data, sig] = raw.split(".");
  const forged = Buffer.from(JSON.stringify({ ...user, id: "1", exp: 9e15 })).toString("base64url");
  assert.equal(decodeSession(`${forged}.${sig}`, secret, 2000), null);
  assert.equal(decodeSession(`${data}.${sig}x`, secret, 2000), null);
  assert.equal(decodeSession(raw, "y".repeat(32), 2000), null);
  assert.equal(decodeSession(raw, secret, 1000 + 8 * 86400 * 1000), null);
  assert.equal(decodeSession("garbage", secret), null);
});

test("sniff trusts magic bytes only", () => {
  const b = (...xs) => new Uint8Array([...xs, ...new Array(12).fill(0)]);
  assert.equal(sniff(b(0x89, 0x50, 0x4e, 0x47)), "png");
  assert.equal(sniff(new TextEncoder().encode("GIF89a.......")), "gif");
  assert.equal(sniff(b(0xff, 0xd8, 0xff)), "jpg");
  assert.equal(sniff(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")), "webp");
  assert.equal(sniff(new TextEncoder().encode("<?php system($_GET[1]); ?>")), null);
  assert.equal(sniff(new TextEncoder().encode("<svg onload=alert(1)>")), null);
});

test("fetchImage refuses non-https, private IPs and hostnames resolving to them", async () => {
  await assert.rejects(fetchImage("http://example.com/a.png"), /https/);
  await assert.rejects(fetchImage("https://127.0.0.1/a.png"), /not allowed/);
  await assert.rejects(fetchImage("https://[::1]/a.png"), /not allowed/);
  await assert.rejects(fetchImage("https://[::ffff:10.0.0.1]/a.png"), /not allowed/);
  await assert.rejects(fetchImage("https://169.254.169.254/latest/meta-data"), /not allowed/);
  // Resolved at connect time by safeLookup, which is what stops DNS rebinding.
  await assert.rejects(fetchImage("https://localhost/a.png"), /not allowed/);
});

test("download names cannot break out of the header", () => {
  const h = contentDisposition('evil"\r\nSet-Cookie: x=1', "png");
  assert.equal(h, "attachment; filename=\"evilSet-Cookie x1.png\"; filename*=UTF-8''evilSet-Cookie%20x1.png");
  assert.equal(contentDisposition("Çiçek", "gif"), "attachment; filename=\"_i_ek.gif\"; filename*=UTF-8''%C3%87i%C3%A7ek.gif");
  assert.equal(contentDisposition("", "jpg"), "attachment; filename=\"badge.jpg\"; filename*=UTF-8''badge.jpg");
});
