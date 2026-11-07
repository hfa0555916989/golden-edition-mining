import { list, put, del } from "@vercel/blob";
import { defaults, CONTENT_VERSION } from "./defaults";
import { normalizeServices } from "./services";
import type { Content, FontKey } from "./types";

const PREFIX = "content/settings";

// Previous built-in logo files. A saved setting that still points at one of
// these falls back to the new mark; anything else is a custom upload and stays.
const LEGACY_LOGO_PATHS = new Set(["/logo.svg", "/logo.png", "/logo-light.svg", "/logo-light.png", "/mark.svg"]);
const LEGACY_FAVICON_PATHS = new Set([
  "/favicon.ico", "/favicon-32.png", "/apple-touch-icon.png", "/apple-icon.png", "/icon.png", "/icon-512.png", "/mark.svg",
]);

function publicPath(v: unknown): string {
  if (typeof v !== "string" || !v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) {
    try { return new URL(v).pathname; } catch { return ""; }
  }
  return v;
}

function merge<T>(base: T, over: unknown): T {
  if (Array.isArray(base)) return (Array.isArray(over) ? over : base) as T;
  if (base && typeof base === "object") {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    if (over && typeof over === "object" && !Array.isArray(over)) {
      for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
        out[k] = k in out ? merge(out[k], v) : v;
      }
    }
    return out as T;
  }
  return (over === undefined || over === null ? base : over) as T;
}

export const hasBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function getContent(): Promise<Content> {
  if (!hasBlob()) return defaults;
  try {
    const { blobs } = await list({ prefix: PREFIX });
    if (!blobs.length) return defaults;
    blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    if (!res.ok) return defaults;
    const stored = (await res.json()) as Record<string, unknown>;
    // v3: services/stats/texts now follow the official brochure; drop older generated copies
    if (!stored || Number(stored.version || 0) < CONTENT_VERSION) {
      for (const k of ["version", "services", "stats", "seo", "hero", "about", "projects", "why", "titles", "cta", "pages"]) delete stored[k];
      const gal = stored.gallery as { url?: string }[] | undefined;
      if (Array.isArray(gal) && gal.every((x) => String(x?.url || "").startsWith("/images/"))) delete stored.gallery;
      const id = stored.identity as Record<string, unknown> | undefined;
      if (id && id.logoSizeMobile === 44) delete id.logoSizeMobile;
    }
    const c = merge(defaults, stored);
    if (LEGACY_LOGO_PATHS.has(publicPath(c.identity.logo))) c.identity.logo = "";
    if (LEGACY_FAVICON_PATHS.has(publicPath(c.identity.favicon))) c.identity.favicon = "";
    const body = c.identity.font;
    const head = c.identity.headingFont;
    const loaded = new Set<FontKey>(["alexandria", "readex"]);
    if (!loaded.has(body)) c.identity.font = "readex";
    if (!loaded.has(head) || (body === "ibmplex" && head === "readex")) c.identity.headingFont = "alexandria";
    const raw = (Array.isArray(stored.services) ? stored.services : c.services) as Partial<Content["services"][number]>[];
    c.services = normalizeServices(raw);
    return c;
  } catch (e) {
    console.error("getContent failed", e);
    return defaults;
  }
}

export async function saveContent(c: Content) {
  if (!hasBlob()) throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  // unique file per save => never served stale from CDN; old versions cleaned up
  const saved = await put(`${PREFIX}.json`, JSON.stringify({ ...c, version: CONTENT_VERSION }), {
    access: "public", addRandomSuffix: true, contentType: "application/json",
  });
  const { blobs } = await list({ prefix: PREFIX });
  const old = blobs.filter((b) => b.url !== saved.url).sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt)).slice(2);
  if (old.length) await del(old.map((b) => b.url));
  return saved.url;
}

/* ---------- private admin settings (password hash) ---------- */
const AUTH_PREFIX = "private/auth";
export type AuthSettings = { passwordHash?: string; updatedAt?: string };
export async function getAuthSettings(): Promise<AuthSettings> {
  if (!hasBlob()) return {};
  const { blobs } = await list({ prefix: AUTH_PREFIX });
  if (!blobs.length) return {};
  blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
  const res = await fetch(blobs[0].url, { cache: "no-store" });
  if (!res.ok) throw new Error("auth settings read failed");
  return (await res.json()) as AuthSettings;
}
export async function saveAuthSettings(a: AuthSettings) {
  if (!hasBlob()) throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  const saved = await put(`${AUTH_PREFIX}.json`, JSON.stringify(a), { access: "public", addRandomSuffix: true, contentType: "application/json" });
  const { blobs } = await list({ prefix: AUTH_PREFIX });
  const old = blobs.filter((b) => b.url !== saved.url);
  if (old.length) await del(old.map((b) => b.url));
}
