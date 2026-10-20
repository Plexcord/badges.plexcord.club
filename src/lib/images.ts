import { createHash, randomUUID } from "node:crypto";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import path from "node:path";

// Runtime-only folder; keep it out of build tracing.
const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? "data");
export const BADGE_DIR = path.join(DATA_DIR, "badges"); // public, served at /badges/<userId>/<file>
const PENDING_DIR = path.join(DATA_DIR, "pending"); // admin/owner only until approved

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // keep in step with serverActions.bodySizeLimit and nginx
export const MIME = { png: "image/png", gif: "image/gif", webp: "image/webp", jpg: "image/jpeg" } as const;
export type ImageExt = keyof typeof MIME;
export const FILE_RE = /^[\w-]+\.(png|gif|webp|jpg)$/;

const publicUrl = () => (process.env.PUBLIC_URL ?? "https://badges.plexcord.club").replace(/\/$/, "");

// Trust the bytes, not the file name or Content-Type.
export function sniff(buf: Uint8Array): ImageExt | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...buf.subarray(start, end));
  if (buf[0] === 0x89 && ascii(1, 4) === "PNG") return "png";
  if (ascii(0, 4) === "GIF8") return "gif";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

const privateRanges = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.168.0.0", 16],
] as const) privateRanges.addSubnet(net, prefix, "ipv4");
// IPv4-mapped IPv6 (::ffff:a.b.c.d) is matched against the IPv4 rules by BlockList itself.
for (const [net, prefix] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10]] as const)
  privateRanges.addSubnet(net, prefix, "ipv6");

const isPrivate = (address: string, family: number) =>
  privateRanges.check(address, family === 6 ? "ipv6" : "ipv4");

class FetchError extends Error {}

// Validates the IP the socket actually connects to, so DNS rebinding can't reach internal hosts.
const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { all: true }, (err, addrs) => {
    if (err) return callback(err, "", 4);
    if (!addrs.length || addrs.some((a) => isPrivate(a.address, a.family)))
      return callback(new FetchError("That host is not allowed."), "", 4);
    if (options.all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, addrs);
    callback(null, addrs[0].address, addrs[0].family);
  });
};

// Downloads a user-supplied https image URL: no redirects, no private IPs, 10 MB cap, 20 s total.
export function fetchImage(rawUrl: string): Promise<Uint8Array> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return Promise.reject(new Error("Invalid image URL."));
  }
  if (url.protocol !== "https:") return Promise.reject(new Error("Image URL must use https."));
  // Node skips `lookup` for IP literals, so check those here.
  const literal = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(literal) && isPrivate(literal, isIP(literal))) return Promise.reject(new Error("That host is not allowed."));

  return new Promise((resolve, reject) => {
    const fail = (e?: Error) => {
      clearTimeout(timer);
      req.destroy();
      reject(e instanceof FetchError ? e : new Error("Could not download the image."));
    };
    const timer = setTimeout(() => fail(new FetchError("Image download timed out.")), 20_000);
    const req = https.get(url, { lookup: safeLookup }, (res) => {
      if (res.statusCode !== 200) return fail();
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_IMAGE_BYTES) return fail(new FetchError("Image is larger than 10 MB."));
        chunks.push(chunk);
      });
      res.on("end", () => {
        clearTimeout(timer);
        resolve(new Uint8Array(Buffer.concat(chunks)));
      });
      res.on("error", fail);
    });
    req.on("error", fail);
  });
}

export async function savePending(buf: Uint8Array) {
  if (buf.byteLength > MAX_IMAGE_BYTES) throw new Error("Image is larger than 10 MB.");
  const ext = sniff(buf);
  if (!ext) throw new Error("Only PNG, GIF, WEBP or JPG images are allowed.");
  const name = `${randomUUID()}.${ext}`;
  await mkdir(PENDING_DIR, { recursive: true });
  await writeFile(path.join(PENDING_DIR, name), buf);
  return name;
}

export const readPending = (name: string) => readFile(path.join(PENDING_DIR, path.basename(name)));

export const removePending = (name: string) =>
  rm(path.join(PENDING_DIR, path.basename(name)), { force: true });

// Moves an approved upload into the public folder and returns its public URL.
export async function publishPending(name: string, userId: string) {
  const src = path.join(PENDING_DIR, path.basename(name));
  const hash = createHash("sha1").update(await readFile(src)).digest("hex");
  const file = `${Date.now()}-${hash}.${path.extname(name).slice(1)}`;
  await mkdir(path.join(BADGE_DIR, userId), { recursive: true });
  await rename(src, path.join(BADGE_DIR, userId, file));
  return `${publicUrl()}/badges/${userId}/${file}`;
}

// The download name is user text going into a header: letters, digits, space, _ . - only.
export function contentDisposition(raw: string, ext: ImageExt) {
  const name = raw.replace(/[^\p{L}\p{N} _.-]/gu, "").trim().slice(0, 60) || "badge";
  const ascii = name.replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${ascii}.${ext}"; filename*=UTF-8''${encodeURIComponent(name)}.${ext}`;
}

export async function removeBadgeFile(badgeUrl: string) {
  const m = new URL(badgeUrl).pathname.match(/^\/badges\/(\d+)\/([^/]+)$/);
  if (m && FILE_RE.test(m[2])) await rm(path.join(BADGE_DIR, m[1], m[2]), { force: true });
}
