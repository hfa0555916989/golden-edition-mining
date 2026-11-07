import crypto from "crypto";
import { list, put, del } from "@vercel/blob";
import {
  type DayAgg, type DayBundle, type Inc, type Sess, type V2Delta, type V2Roll,
  addDays, applyInc, cloneSess, dayKey, eachDay, emptyAgg, emptySess, isLegacy, isV2, isV2Path, mergeAgg, mergeInc, sessionsFromParts, toRoll,
} from "./analyticsModel";

/** Daily aggregates in Vercel Blob. Legacy `analytics/YYYY-MM-DD/*` files are never deleted by compaction.
 *  Visitor ids stored here are HMAC(secret, day + cookie), not IP addresses. */

const PREFIX = "analytics/";
const LIVE = "analytics-live/";
export { dayKey } from "./analyticsModel";

const buf: Record<string, Map<string, Inc>> = {};
let lastFlush = 0;
let flushing: Promise<void> | null = null;
const cache = new Map<string, { exp: number; legacy: DayAgg | null; sessions: Sess[] }>();
let chain: Promise<void> = Promise.resolve();
const liveMem = new Map<string, { path: string; cc: string; ci: string; dv: string; t: number }>();
const liveWrite = new Map<string, number>();

const token = () => !!process.env.BLOB_READ_WRITE_TOKEN;
export function dailyVid(id: string, day: string) {
  const pepper = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "gv-local";
  return crypto.createHmac("sha256", pepper).update(`gv1:${day}:${id}`).digest("hex").slice(0, 16);
}
export function recordInc(day: string, inc: Inc) {
  const m = (buf[day] ||= new Map());
  const prev = m.get(inc.id);
  m.set(inc.id, prev ? mergeInc(prev, inc) : inc);
}

export function touchLive(vid: string, info: { path: string; cc: string; ci: string; dv: string }) {
  const now = Date.now();
  liveMem.set(vid, { ...info, t: now });
  if (!token() || now - (liveWrite.get(vid) || 0) < 20_000) return;
  liveWrite.set(vid, now);
  void put(`${LIVE}${vid}.json`, JSON.stringify({ p: info.path, cc: info.cc, ci: info.ci, dv: info.dv, t: now }), {
    access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 30,
  }).catch((e) => console.error("live", e));
}

export async function maybeFlush(force = false) {
  if (!token()) return;
  if (flushing) return flushing;
  if (!force && Date.now() - lastFlush < 20_000) return;
  const data: Record<string, Map<string, Inc>> = {};
  for (const d of Object.keys(buf)) { data[d] = buf[d]; delete buf[d]; }
  if (!Object.keys(data).length) return;
  lastFlush = Date.now();
  flushing = (async () => {
    try {
      for (const d of Object.keys(data)) {
        const s = [...data[d].values()];
        if (!s.length) continue;
        const uid = crypto.randomBytes(8).toString("hex");
        await put(`${PREFIX}${d}/v2-${Date.now()}.json`, JSON.stringify({ k: "v2", d, uid, s } satisfies V2Delta), {
          access: "public", addRandomSuffix: true, contentType: "application/json",
        });
        cache.delete(d);
      }
    } catch (e) {
      console.error("analytics flush failed", e);
      for (const d of Object.keys(data)) {
        const m = (buf[d] ||= new Map());
        for (const inc of data[d].values()) {
          const newer = m.get(inc.id);
          m.set(inc.id, newer ? mergeInc(inc, newer) : inc);
        }
      }
    } finally { flushing = null; }
  })();
  return flushing;
}
export async function flushSoon() {
  await maybeFlush();
  if (!Object.keys(buf).length) return;
  const wait = Math.max(0, 20_000 - (Date.now() - lastFlush)) + 500;
  await new Promise((r) => setTimeout(r, wait));
  if (Object.keys(buf).length) await maybeFlush(true);
}

async function listAll(prefix: string) {
  const out: { pathname: string; url: string }[] = [];
  let cursor: string | undefined;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    out.push(...r.blobs.map((b) => ({ pathname: b.pathname, url: b.url })));
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}
async function fetchJson(url: string): Promise<unknown> {
  try { const r = await fetch(url, { cache: "no-store" }); return r.ok ? await r.json() : null; } catch { return null; }
}
async function pool<T, R>(xs: T[], n: number, f: (x: T) => Promise<R>) {
  const out: R[] = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => { while (i < xs.length) { const k = i++; out[k] = await f(xs[k]); } }));
  return out;
}

function materialize(d: string): DayBundle {
  const e = cache.get(d);
  const base = e?.sessions || [];
  const extra = buf[d];
  if (!extra?.size) return { d, legacy: e?.legacy ?? null, sessions: base };
  const copy = base.map(cloneSess);
  const by = new Map(copy.map((s) => [s.id, s]));
  for (const inc of extra.values()) {
    let s = by.get(inc.id);
    if (!s) { s = emptySess(inc.id, inc.vid || ""); copy.push(s); by.set(inc.id, s); }
    applyInc(s, inc);
  }
  return { d, legacy: e?.legacy ?? null, sessions: copy };
}
function fresh(d: string) { const e = cache.get(d); return !!e && e.exp > Date.now(); }

async function hydrate(days: string[]) {
  const today = dayKey();
  const want = new Set(days);
  const files = (await listAll(PREFIX)).filter((f) => want.has(f.pathname.slice(PREFIX.length, PREFIX.length + 10)));
  const byDay = new Map<string, { pathname: string; url: string }[]>();
  for (const d of days) byDay.set(d, []);
  for (const f of files) {
    const d = f.pathname.slice(PREFIX.length, PREFIX.length + 10);
    byDay.get(d)?.push(f);
  }
  await pool([...byDay.entries()], 4, async ([d, fs]) => {
    const jsons = await pool(fs, 8, (f) => fetchJson(f.url));
    const complete = jsons.every(Boolean);
    let legacy: DayAgg | null = null;
    const v2: (V2Delta | V2Roll)[] = [];
    const v2Files: { pathname: string; url: string }[] = [];
    fs.forEach((f, i) => {
      const body = jsons[i];
      if (!body) return;
      if (isV2(body)) { v2.push(body); if (isV2Path(f.pathname)) v2Files.push(f); }
      else if (isLegacy(body)) legacy = mergeAgg(legacy || emptyAgg(d), body);
    });
    const merged = sessionsFromParts(v2);
    const onlyRoll = v2Files.length === 1 && v2Files[0].pathname.includes("/v2roll-");
    const doCompact = complete && v2Files.length > 0 && (d < today ? !(onlyRoll && v2Files.length === 1) : v2Files.length > 12);
    if (doCompact) {
      try {
        const roll: V2Roll = { k: "v2", roll: 1, d, seq: merged.seq, uids: merged.uids, sessions: merged.sessions.map(toRoll) };
        const saved = await put(`${PREFIX}${d}/v2roll-${Date.now()}.json`, JSON.stringify(roll), { access: "public", addRandomSuffix: true, contentType: "application/json" });
        const doomed = v2Files.filter((f) => f.url !== saved.url).map((f) => f.url);
        if (doomed.length) await del(doomed);
      } catch (e) { console.error("compact failed", e); }
    }
    cache.set(d, { exp: Date.now() + (complete ? (d === today ? 5_000 : 5 * 60_000) : 5_000), legacy, sessions: merged.sessions });
  });
}
function ensure(days: string[]) {
  const run = chain.then(async () => {
    const miss = [...new Set(days)].filter((d) => !fresh(d));
    if (!miss.length || !token()) return;
    await hydrate(miss);
  });
  chain = run.then(() => {}, () => {});
  return run;
}
export async function loadRangeDays(from: string, to: string, prevFrom: string, prevTo: string) {
  const a = eachDay(from, to);
  const b = eachDay(prevFrom, prevTo);
  await ensure([...a, ...b]);
  return [a.map(materialize), b.map(materialize)] as const;
}

export async function loadLive() {
  const now = Date.now();
  const map = new Map<string, { path: string; cc: string; ci: string; dv: string; t: number }>();
  for (const [vid, row] of liveMem) {
    if (now - row.t < 5 * 60_000) map.set(vid, row); else liveMem.delete(vid);
  }
  if (token()) {
    try {
      const files = await listAll(LIVE);
      const stale: string[] = [];
      const rows = await pool(files, 8, async (f) => {
        const j = (await fetchJson(f.url)) as { p?: string; cc?: string; ci?: string; dv?: string; t?: number } | null;
        const t = typeof j?.t === "number" ? j.t : 0;
        return { url: f.url, id: (f.pathname.split("/").pop() || "").replace(/\.json$/, ""), path: j?.p || "/", cc: j?.cc || "XX", ci: j?.ci || "?", dv: j?.dv || "", t };
      });
      for (const r of rows) {
        if (!r.t || now - r.t >= 5 * 60_000) stale.push(r.url);
        else if (!map.has(r.id)) map.set(r.id, r);
      }
      if (stale.length) void del(stale).catch(() => {});
    } catch (e) { console.error("live list", e); }
  }
  return [...map.values()].sort((a, b) => b.t - a.t).slice(0, 50).map(({ path, cc, ci, dv, t }) => ({ path, cc, ci, dv, t }));
}

export async function deleteRange(from: string, to: string) {
  if (!token()) return 0;
  const files = (await listAll(PREFIX)).filter((b) => { const d = b.pathname.slice(PREFIX.length, PREFIX.length + 10); return d >= from && d <= to; });
  if (files.length) await del(files.map((f) => f.url));
  let d = from; let g = 0;
  while (d <= to && g++ < 400) { cache.delete(d); delete buf[d]; d = addDays(d, 1); }
  return files.length;
}
