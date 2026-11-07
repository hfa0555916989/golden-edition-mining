import { list, put, del } from "@vercel/blob";

/** Aggregated, anonymous counters. No IPs, no user agents, no personal data are stored. */
export type Counts = { v: number; pv: number };
export type DayAgg = { d: string; v: number; pv: number; c: Record<string, Counts>; r: Record<string, Counts>; ci: Record<string, Counts>; p: Record<string, number> };
const PREFIX = "analytics/";
export const TZ = "Asia/Riyadh";
export const dayKey = (t = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(t);
const empty = (d: string): DayAgg => ({ d, v: 0, pv: 0, c: {}, r: {}, ci: {}, p: {} });
const bump = (m: Record<string, Counts>, k: string, nv: boolean) => { const x = (m[k] ||= { v: 0, pv: 0 }); x.pv++; if (nv) x.v++; };

export function mergeAgg(a: DayAgg, b: DayAgg) {
  a.v += b.v; a.pv += b.pv;
  for (const key of ["c", "r", "ci"] as const) for (const [k, x] of Object.entries(b[key] || {})) { const y = (a[key][k] ||= { v: 0, pv: 0 }); y.v += x.v; y.pv += x.pv; }
  for (const [k, n] of Object.entries(b.p || {})) a.p[k] = (a.p[k] || 0) + n;
  return a;
}

export const BOT_RE = /bot|crawl|spider|slurp|bing|google|yandex|baidu|duckduck|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|scrapy|petal|semrush|ahrefs|mj12|dotbot|gptbot|claude|perplexity|bytespider/i;

/* Per-instance buffer, written as small immutable "delta" blobs (no read-modify-write => safe under concurrency).
   Low traffic: every hit is flushed immediately. Bursts: flushed at most every 20s per instance. */
let buf: Record<string, DayAgg> = {};
let lastFlush = 0;
let flushing: Promise<void> | null = null;

export function record(hit: { path: string; country: string; region: string; city: string; newVisitor: boolean }) {
  const d = dayKey();
  const a = (buf[d] ||= empty(d));
  a.pv++; if (hit.newVisitor) a.v++;
  bump(a.c, hit.country, hit.newVisitor);
  bump(a.r, `${hit.country}|${hit.region}`, hit.newVisitor);
  bump(a.ci, `${hit.country}|${hit.city}`, hit.newVisitor);
  a.p[hit.path] = (a.p[hit.path] || 0) + 1;
}
export async function maybeFlush(force = false) {
  if (flushing) return flushing;
  if (!force && Date.now() - lastFlush < 20_000) return;
  const data = buf; buf = {};
  if (!Object.keys(data).length) return;
  lastFlush = Date.now();
  flushing = (async () => {
    try {
      for (const a of Object.values(data)) {
        await put(`${PREFIX}${a.d}/delta-${Date.now()}.json`, JSON.stringify(a), { access: "public", addRandomSuffix: true, contentType: "application/json" });
      }
    } catch (e) {
      console.error("analytics flush failed", e);
      for (const a of Object.values(data)) buf[a.d] = buf[a.d] ? mergeAgg(buf[a.d], a) : a;
    } finally { flushing = null; }
  })();
  return flushing;
}

/** Called via after(): flush now, or — if throttled — wait out the window and flush, so buffered hits are not lost. */
export async function flushSoon() {
  await maybeFlush();
  if (!Object.keys(buf).length) return;
  const wait = Math.max(0, 20_000 - (Date.now() - lastFlush)) + 500;
  await new Promise((r) => setTimeout(r, wait));
  if (Object.keys(buf).length) await maybeFlush(true);
}
async function listAll() {
  const out: { pathname: string; url: string }[] = [];
  let cursor: string | undefined;
  do {
    const r = await list({ prefix: PREFIX, cursor, limit: 1000 });
    out.push(...r.blobs.map((b) => ({ pathname: b.pathname, url: b.url })));
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}
async function fetchJson(url: string): Promise<DayAgg | null> {
  try { const r = await fetch(url, { cache: "no-store" }); return r.ok ? ((await r.json()) as DayAgg) : null; } catch { return null; }
}
async function pool<T, R>(xs: T[], n: number, f: (x: T) => Promise<R>) {
  const out: R[] = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => { while (i < xs.length) { const k = i++; out[k] = await f(xs[k]); } }));
  return out;
}

/** Load per-day aggregates for [from, to] (YYYY-MM-DD, inclusive). Past days with many deltas are compacted into one file. */
export async function loadRange(from: string, to: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [] as DayAgg[];
  await maybeFlush(true);
  const files = (await listAll()).filter((b) => { const d = b.pathname.slice(PREFIX.length, PREFIX.length + 10); return d >= from && d <= to; });
  const byDay = new Map<string, { pathname: string; url: string }[]>();
  for (const f of files) { const d = f.pathname.slice(PREFIX.length, PREFIX.length + 10); byDay.set(d, [...(byDay.get(d) || []), f]); }
  const today = dayKey();
  const days = await pool([...byDay.entries()], 8, async ([d, fs]) => {
    const parts = (await pool(fs, 12, (f) => fetchJson(f.url))).filter(Boolean) as DayAgg[];
    const agg = parts.reduce((a, b) => mergeAgg(a, b), empty(d));
    if (d < today && fs.length > 1 && parts.length === fs.length) {
      try {
        await put(`${PREFIX}${d}/day-${Date.now()}.json`, JSON.stringify(agg), { access: "public", addRandomSuffix: true, contentType: "application/json" });
        await del(fs.map((f) => f.url));
      } catch (e) { console.error("compact failed", e); }
    }
    return agg;
  });
  return days.sort((a, b) => a.d.localeCompare(b.d));
}
export async function deleteRange(from: string, to: string) {
  const files = (await listAll()).filter((b) => { const d = b.pathname.slice(PREFIX.length, PREFIX.length + 10); return d >= from && d <= to; });
  if (files.length) await del(files.map((f) => f.url));
  return files.length;
}
