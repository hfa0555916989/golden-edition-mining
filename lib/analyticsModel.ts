/** Pure analytics model. No Blob, no Node-only APIs.
 *  Legacy day files stay readable. New data is session increments that merge by id.
 *  Stored visitor keys are a daily-salted HMAC of a random cookie — never an IP. */

export const TZ = "Asia/Riyadh";
export const BOT_RE = /bot|crawl|spider|slurp|bing|google|yandex|baidu|duckduck|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|scrapy|petal|semrush|ahrefs|mj12|dotbot|gptbot|claude|perplexity|bytespider|dataforseo|screaming ?frog|selenium|phantomjs|puppeteer|playwright/i;

export type Counts = { v: number; pv: number };
export type DayAgg = { d: string; v: number; pv: number; c: Record<string, Counts>; r: Record<string, Counts>; ci: Record<string, Counts>; p: Record<string, number> };

export type Inc = {
  id: string;
  vid: string;
  nv?: 0 | 1;
  h0?: number;
  cc?: string; rg?: string; ci?: string;
  dv?: string; os?: string; br?: string; scr?: string; lg?: string;
  ch?: string; eng?: string; soc?: string; ref?: string;
  us?: string; um?: string; uc?: string;
  pv?: [string, number, number][];
  tm?: [string, number, number][];
  sk?: [string, number][];
  ld?: string;
  ex?: [string, number][];
  cv?: [string, string, number][];
};

export type Sess = {
  id: string; vid: string; nv: 0 | 1; h0: number;
  cc: string; rg: string; ci: string;
  dv: string; os: string; br: string; scr: string; lg: string;
  ch: string; eng: string; soc: string; ref: string;
  us: string; um: string; uc: string;
  pg: Record<string, { n: number; sec: number; sk: number }>;
  ld: string;
  ex: Record<string, number>;
  cv: Record<string, number>;
  hh: Record<string, number>;
  ha: Record<string, 1 | undefined>;
};

export type RollSession = {
  id: string; vid: string; nv: 0 | 1; h0: number;
  cc: string; rg: string; ci: string;
  dv: string; os: string; br: string; scr: string; lg: string;
  ch: string; eng: string; soc: string; ref: string;
  us: string; um: string; uc: string;
  pg: [string, number, number, number][];
  ld: string;
  ex: [string, number][];
  cv: [string, string, number][];
  hh: [number, number][];
  ha: number[];
};

export type V2Delta = { k: "v2"; d: string; uid: string; s: Inc[] };
export type V2Roll = { k: "v2"; roll: 1; d: string; seq: number; uids: string[]; sessions: RollSession[] };
export type Filter = { country: string; city: string; source: string; device: string };
export type DayBundle = { d: string; legacy: DayAgg | null; sessions: Sess[] };

export type Bag = { visitors: number; views: number };
export type CountRow = { key: string; label: string; visitors: number; views: number };
export type PageStat = {
  path: string; views: number; visitors: number | null; avgSec: number | null;
  landings: number; exits: number;
  scroll: { p25: number; p50: number; p75: number; p100: number } | null;
};
export type ConvStat = { key: string; label: string; wa: number; call: number };
export type Totals = {
  visitors: number; sessions: number; views: number; v2views: number; dur: number;
  bounces: number; newV: number; retV: number; wa: number; call: number; convSessions: number;
  flowKnown: boolean; legacyDays: number;
};
export type Point = { key: string; label: string; visitors: number; views: number };
export type Report = {
  from: string; to: string; prevFrom: string; prevTo: string;
  kpi: Totals; prev: Totals;
  series: Point[]; seriesHourly: boolean;
  hours: Point[]; dow: Point[];
  channels: CountRow[]; channelSummary: CountRow[];
  referrers: CountRow[]; utm: CountRow[];
  countries: CountRow[]; regions: CountRow[]; cities: CountRow[];
  devices: CountRow[]; oses: CountRow[]; browsers: CountRow[]; screens: CountRow[]; langs: CountRow[];
  pages: PageStat[]; landings: PageStat[]; exits: PageStat[];
  convPages: ConvStat[]; convSources: ConvStat[]; convCities: ConvStat[];
  funnel: { visits: number; service: number; clicks: number };
  facets: { countries: string[]; cities: { key: string; cc: string; name: string }[]; sources: { key: string; label: string }[]; devices: string[] };
  legacyDays: number;
};

const SEARCH: [string, string][] = [["google.", "Google"], ["bing.com", "Bing"], ["yahoo.", "Yahoo"], ["duckduckgo.", "DuckDuckGo"], ["yandex.", "Yandex"], ["baidu.", "Baidu"], ["ecosia.", "Ecosia"]];
const SOCIAL: [string, string][] = [["facebook.com", "Facebook"], ["fb.com", "Facebook"], ["instagram.com", "Instagram"], ["twitter.com", "X"], ["x.com", "X"], ["t.co", "X"], ["tiktok.com", "TikTok"], ["snapchat.com", "Snapchat"], ["linkedin.com", "LinkedIn"], ["youtube.com", "YouTube"], ["youtu.be", "YouTube"], ["pinterest.com", "Pinterest"], ["telegram.", "Telegram"], ["t.me", "Telegram"], ["reddit.com", "Reddit"], ["whatsapp.com", "WhatsApp"]];
const PAID_HOST = ["googleadservices.", "doubleclick.", "googlesyndication."];
const CH_LABEL: Record<string, string> = { direct: "مباشر", organic: "بحث", social: "اجتماعي", referral: "إحالة", campaign: "حملات" };
const CH_FACET: Record<string, string> = { direct: "مباشر", organic: "كل البحث", social: "كل الشبكات الاجتماعية", referral: "كل الإحالات", campaign: "كل الحملات" };
const MAX_SESSION_SEC = 3 * 3600;

export function dayKey(t = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(t);
}
export function hourInRiyadh(t = new Date()) {
  const h = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).formatToParts(t).find((p) => p.type === "hour")?.value;
  const n = Number(h);
  if (!Number.isFinite(n)) return 0;
  return n === 24 ? 0 : Math.min(23, Math.max(0, n));
}
export function addDays(s: string, n: number) {
  const d = new Date(s + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function eachDay(from: string, to: string) {
  const out: string[] = [];
  let cur = from <= to ? from : to;
  const end = from <= to ? to : from;
  let g = 0;
  while (cur <= end && g++ < 400) { out.push(cur); cur = addDays(cur, 1); }
  return out;
}
export function prevWindow(from: string, to: string): [string, string] {
  const n = Math.max(1, eachDay(from, to).length);
  const prevTo = addDays(from, -1);
  return [addDays(prevTo, -(n - 1)), prevTo];
}
export function cleanPath(input: string) {
  let path = String(input || "").split("?")[0].split("#")[0].trim();
  if (!path) return "";
  try { path = decodeURIComponent(path); } catch { /* keep raw */ }
  if (!path.startsWith("/")) path = "/" + path;
  path = path.replace(/\/{2,}/g, "/");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path.startsWith("/admin552255") || path.startsWith("/api") || path.includes("..")) return "";
  return path.slice(0, 120);
}
export function screenBucket(w: number, h: number) {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 200 || h < 200) return "";
  const rw = Math.max(320, Math.min(3840, Math.round(w / 10) * 10));
  const rh = Math.max(320, Math.min(3840, Math.round(h / 10) * 10));
  return `${rw}×${rh}`;
}
export function languageTag(s: string) {
  const m = /^[A-Za-z]{2,3}(?:-[A-Za-z]{2})?/.exec((s || "").trim());
  return m ? m[0] : "";
}
export function parseUA(ua: string): { os: string; br: string; dv: "mobile" | "tablet" | "desktop" } {
  const u = ua || "";
  const br = /Edg\//.test(u) ? "Edge" : /OPR\/|Opera/.test(u) ? "Opera" : /SamsungBrowser/.test(u) ? "Samsung Internet" : /Firefox\//.test(u) ? "Firefox" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : "أخرى";
  const os = /Windows/.test(u) ? "Windows" : /Android/.test(u) ? "Android" : /iPhone|iPad|iPod/.test(u) ? "iOS" : /Mac OS X/.test(u) ? "macOS" : /CrOS/.test(u) ? "ChromeOS" : /Linux/.test(u) ? "Linux" : "أخرى";
  const dv = /iPad|Tablet/.test(u) || (/Android/.test(u) && !/Mobile/.test(u)) ? "tablet" : /Mobi|iPhone|iPod|Android/.test(u) ? "mobile" : "desktop";
  return { os, br, dv };
}
const clip = (s: string, n: number) => s.replace(/[\r\n<>]/g, "").slice(0, n);
function hostMatch(host: string, needle: string) {
  if (needle.endsWith(".")) return host.includes(needle);
  return host === needle || host.endsWith("." + needle);
}
export function classify(ref: string, us: string, um: string, uc: string) {
  const host = clip(ref, 80).toLowerCase().replace(/^www\./, "");
  const source = clip(us, 60), medium = clip(um, 60), campaign = clip(uc, 60);
  if (source || medium || campaign) return { ch: "campaign", eng: "", soc: "", ref: host, us: source, um: medium, uc: campaign };
  if (!host) return { ch: "direct", eng: "", soc: "", ref: "", us: "", um: "", uc: "" };
  if (PAID_HOST.some((p) => hostMatch(host, p))) return { ch: "campaign", eng: "", soc: "", ref: host, us: "google", um: "cpc", uc: "" };
  for (const [n, label] of SEARCH) if (hostMatch(host, n)) return { ch: "organic", eng: label, soc: "", ref: host, us: "", um: "", uc: "" };
  for (const [n, label] of SOCIAL) if (hostMatch(host, n)) return { ch: "social", eng: "", soc: label, ref: host, us: "", um: "", uc: "" };
  return { ch: "referral", eng: "", soc: "", ref: host, us: "", um: "", uc: "" };
}

export function emptySess(id = "", vid = ""): Sess {
  return { id, vid, nv: 0, h0: -1, cc: "", rg: "", ci: "", dv: "", os: "", br: "", scr: "", lg: "", ch: "", eng: "", soc: "", ref: "", us: "", um: "", uc: "", pg: {}, ld: "", ex: {}, cv: {}, hh: {}, ha: {} };
}
export function cloneSess(s: Sess): Sess {
  const pg: Sess["pg"] = {};
  for (const [k, v] of Object.entries(s.pg)) pg[k] = { ...v };
  return { ...s, pg, ex: { ...s.ex }, cv: { ...s.cv }, hh: { ...s.hh }, ha: { ...s.ha } };
}
const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : 0);
export function emptyAgg(d: string): DayAgg { return { d, v: 0, pv: 0, c: {}, r: {}, ci: {}, p: {} }; }
export function mergeAgg(a: DayAgg, b: DayAgg) {
  a.v += num(b.v); a.pv += num(b.pv);
  for (const key of ["c", "r", "ci"] as const) for (const [k, x] of Object.entries(b[key] || {})) {
    const y = (a[key][k] ||= { v: 0, pv: 0 }); y.v += num(x?.v); y.pv += num(x?.pv);
  }
  for (const [k, n] of Object.entries(b.p || {})) a.p[k] = (a.p[k] || 0) + num(n);
  return a;
}
export function isLegacy(x: unknown): x is DayAgg {
  if (!x || typeof x !== "object") return false;
  const o = x as DayAgg & { k?: string };
  return o.k !== "v2" && (typeof o.pv === "number" || typeof o.v === "number");
}
export function isV2(x: unknown): x is V2Delta | V2Roll {
  return !!x && typeof x === "object" && (x as { k?: string }).k === "v2";
}
export function isRoll(x: V2Delta | V2Roll): x is V2Roll {
  return (x as V2Roll).roll === 1 && Array.isArray((x as V2Roll).sessions);
}

function pageOf(s: Sess, path: string) { return (s.pg[path] ||= { n: 0, sec: 0, sk: 0 }); }
export function applyInc(s: Sess, inc: Inc) {
  if (inc.vid && !s.vid) s.vid = inc.vid;
  if (inc.nv) s.nv = 1;
  if (inc.h0 != null && inc.h0 >= 0 && inc.h0 <= 23 && s.h0 < 0) s.h0 = inc.h0;
  const fill = (k: "cc" | "rg" | "ci" | "dv" | "os" | "br" | "scr" | "lg" | "ch" | "eng" | "soc" | "ref" | "us" | "um" | "uc") => {
    const v = inc[k]; if (typeof v === "string" && v && !s[k]) s[k] = v;
  };
  (["cc", "rg", "ci", "dv", "os", "br", "scr", "lg", "ch", "eng", "soc", "ref", "us", "um", "uc"] as const).forEach(fill);
  for (const [path, hour, n] of inc.pv || []) {
    if (!path || n <= 0 || hour < 0 || hour > 23) continue;
    pageOf(s, path).n += n;
    const h = String(hour);
    s.hh[h] = (s.hh[h] || 0) + n;
    s.ha[h] = 1;
  }
  for (const [path, sec, hour] of inc.tm || []) {
    if (!path || sec <= 0 || hour < 0 || hour > 23) continue;
    pageOf(s, path).sec += sec;
    s.ha[String(hour)] = 1;
  }
  for (const [path, m] of inc.sk || []) {
    if (!path || m <= 0) continue;
    const p = pageOf(s, path); if (m > p.sk) p.sk = m;
  }
  if (inc.ld && !s.ld) s.ld = inc.ld;
  for (const [path, d] of inc.ex || []) if (path) s.ex[path] = (s.ex[path] || 0) + d;
  for (const [kind, path, n] of inc.cv || []) {
    if ((kind !== "wa" && kind !== "call") || !path || n <= 0) continue;
    const k = `${kind}\t${path}`;
    s.cv[k] = (s.cv[k] || 0) + n;
  }
  return s;
}
export function mergeInc(a: Inc, b: Inc): Inc {
  const out: Inc = { ...a, id: a.id || b.id, vid: a.vid || b.vid };
  if (b.nv) out.nv = 1;
  if (out.h0 == null && b.h0 != null) out.h0 = b.h0;
  const keys = ["cc", "rg", "ci", "dv", "os", "br", "scr", "lg", "ch", "eng", "soc", "ref", "us", "um", "uc"] as const;
  for (const k of keys) if (!out[k] && b[k]) out[k] = b[k];
  const pv = new Map<string, [string, number, number]>();
  for (const row of [...(a.pv || []), ...(b.pv || [])]) {
    const key = `${row[0]}|${row[1]}`;
    const cur = pv.get(key);
    if (cur) cur[2] += row[2]; else pv.set(key, [row[0], row[1], row[2]]);
  }
  const tm = new Map<string, [string, number, number]>();
  for (const row of [...(a.tm || []), ...(b.tm || [])]) {
    const key = `${row[0]}|${row[2]}`;
    const cur = tm.get(key);
    if (cur) cur[1] += row[1]; else tm.set(key, [row[0], row[1], row[2]]);
  }
  const sk = new Map<string, number>();
  for (const [p, m] of [...(a.sk || []), ...(b.sk || [])]) sk.set(p, Math.max(sk.get(p) || 0, m));
  const ex = new Map<string, number>();
  for (const [p, d] of [...(a.ex || []), ...(b.ex || [])]) ex.set(p, (ex.get(p) || 0) + d);
  const cv = new Map<string, [string, string, number]>();
  for (const row of [...(a.cv || []), ...(b.cv || [])]) {
    const key = `${row[0]}|${row[1]}`;
    const cur = cv.get(key);
    if (cur) cur[2] += row[2]; else cv.set(key, [row[0], row[1], row[2]]);
  }
  if (pv.size) out.pv = [...pv.values()];
  if (tm.size) out.tm = [...tm.values()];
  if (sk.size) out.sk = [...sk.entries()];
  if (!out.ld && b.ld) out.ld = b.ld;
  if (ex.size) out.ex = [...ex.entries()];
  if (cv.size) out.cv = [...cv.values()];
  return out;
}

export function toRoll(s: Sess): RollSession {
  return {
    id: s.id, vid: s.vid, nv: s.nv, h0: s.h0,
    cc: s.cc, rg: s.rg, ci: s.ci, dv: s.dv, os: s.os, br: s.br, scr: s.scr, lg: s.lg,
    ch: s.ch, eng: s.eng, soc: s.soc, ref: s.ref, us: s.us, um: s.um, uc: s.uc,
    pg: Object.entries(s.pg).map(([p, v]) => [p, v.n, v.sec, v.sk]),
    ld: s.ld,
    ex: Object.entries(s.ex).filter(([, n]) => n),
    cv: Object.entries(s.cv).map(([k, n]) => { const [kind, path] = k.split("\t"); return [kind, path, n] as [string, string, number]; }),
    hh: Object.entries(s.hh).map(([h, n]) => [Number(h), n]),
    ha: Object.keys(s.ha).map(Number),
  };
}
export function fromRoll(r: RollSession): Sess | null {
  if (!r || typeof r !== "object" || !r.id || !r.vid) return null;
  const s = emptySess(String(r.id).slice(0, 40), String(r.vid).slice(0, 40));
  s.nv = r.nv ? 1 : 0;
  s.h0 = Number.isInteger(r.h0) ? r.h0 : -1;
  s.cc = String(r.cc || ""); s.rg = String(r.rg || ""); s.ci = String(r.ci || "");
  s.dv = String(r.dv || ""); s.os = String(r.os || ""); s.br = String(r.br || ""); s.scr = String(r.scr || ""); s.lg = String(r.lg || "");
  s.ch = String(r.ch || ""); s.eng = String(r.eng || ""); s.soc = String(r.soc || ""); s.ref = String(r.ref || "");
  s.us = String(r.us || ""); s.um = String(r.um || ""); s.uc = String(r.uc || "");
  s.ld = String(r.ld || "");
  for (const row of r.pg || []) if (row && row[0]) s.pg[String(row[0])] = { n: num(row[1]), sec: num(row[2]), sk: num(row[3]) };
  for (const row of r.ex || []) if (row && row[0]) s.ex[String(row[0])] = num(row[1]);
  for (const row of r.cv || []) if (row && row[0] && row[1]) s.cv[`${row[0]}\t${row[1]}`] = num(row[2]);
  for (const row of r.hh || []) if (row) s.hh[String(row[0])] = num(row[1]);
  for (const h of r.ha || []) s.ha[String(h)] = 1;
  return s;
}
export function sessionsFromParts(parts: (V2Delta | V2Roll)[]) {
  const rolls = parts.filter(isRoll).sort((a, b) => (b.seq || 0) - (a.seq || 0) || (b.uids?.length || 0) - (a.uids?.length || 0));
  const roll = rolls[0];
  const seen = new Set(roll?.uids || []);
  const sessions: Sess[] = [];
  const byId = new Map<string, Sess>();
  for (const raw of roll?.sessions || []) {
    const s = fromRoll(raw);
    if (!s) continue;
    sessions.push(s); byId.set(s.id, s);
  }
  for (const part of parts) {
    if (isRoll(part)) continue;
    if (part.uid && seen.has(part.uid)) continue;
    for (const inc of part.s || []) {
      if (!inc?.id) continue;
      let s = byId.get(inc.id);
      if (!s) { s = emptySess(inc.id, inc.vid || ""); sessions.push(s); byId.set(inc.id, s); }
      applyInc(s, inc);
    }
  }
  const uids = new Set(seen);
  for (const part of parts) if (!isRoll(part) && part.uid) uids.add(part.uid);
  return { sessions, uids: [...uids], seq: (roll?.seq || 0) + 1 };
}

export function sourceId(s: Pick<Sess, "ch" | "eng" | "soc" | "ref" | "us" | "um" | "uc">) {
  if (s.ch === "organic") return `organic:${s.eng || "?"}`;
  if (s.ch === "social") return `social:${s.soc || "?"}`;
  if (s.ch === "referral") return `referral:${s.ref || "?"}`;
  if (s.ch === "campaign") return `campaign:${s.us || ""}|${s.um || ""}|${s.uc || ""}`;
  if (s.ch === "direct") return "direct";
  return "";
}
export function sourceLabel(s: Pick<Sess, "ch" | "eng" | "soc" | "ref" | "us" | "um" | "uc">) {
  if (s.ch === "organic") return `بحث · ${s.eng || "أخرى"}`;
  if (s.ch === "social") return `اجتماعي · ${s.soc || "أخرى"}`;
  if (s.ch === "referral") return `إحالة · ${s.ref || "أخرى"}`;
  if (s.ch === "campaign") return `حملة · ${[s.us, s.um, s.uc].filter(Boolean).join(" / ") || "بدون اسم"}`;
  if (s.ch === "direct") return "مباشر";
  return "غير محدد";
}
export function matchSource(s: Sess, f: string) {
  if (!f) return true;
  if (f === "direct" || f === "organic" || f === "social" || f === "referral" || f === "campaign") return s.ch === f;
  return sourceId(s) === f;
}
function matchSess(s: Sess, f: Filter) {
  if (f.country && s.cc !== f.country) return false;
  if (f.city && `${s.cc}|${s.ci}` !== f.city) return false;
  if (f.device && s.dv !== f.device) return false;
  if (f.source && !matchSource(s, f.source)) return false;
  return true;
}
export function pageviews(s: Sess) { return Object.values(s.pg).reduce((a, p) => a + p.n, 0); }
export function sessionSec(s: Sess) { return Math.min(MAX_SESSION_SEC, Object.values(s.pg).reduce((a, p) => a + p.sec, 0)); }
function convOf(s: Sess) {
  let wa = 0, call = 0;
  const pages = new Map<string, { wa: number; call: number }>();
  for (const [k, n] of Object.entries(s.cv)) {
    const [kind, path] = k.split("\t");
    if (kind === "wa") wa += n; else if (kind === "call") call += n; else continue;
    const row = pages.get(path) || { wa: 0, call: 0 };
    if (kind === "wa") row.wa += n; else row.call += n;
    pages.set(path, row);
  }
  return { wa, call, pages };
}
function counted(s: Sess) { return pageviews(s) > 0 || sessionSec(s) > 0 || convOf(s).wa + convOf(s).call > 0; }
function isService(path: string) { return path === "/services" || path.startsWith("/services/"); }

function legacySlice(day: DayAgg, f: Filter) {
  const blank = { v: 0, pv: 0, c: {} as DayAgg["c"], r: {} as DayAgg["r"], ci: {} as DayAgg["ci"], p: {} as DayAgg["p"] };
  if ((f.source || f.device) && (day.pv || day.v)) return blank;
  if (f.city) {
    const x = day.ci?.[f.city];
    if (!x) return blank;
    const [cc] = f.city.split("|");
    if (f.country && cc !== f.country) return blank;
    return { v: num(x.v), pv: num(x.pv), c: { [cc]: { ...x } }, r: {}, ci: { [f.city]: { ...x } }, p: {} };
  }
  if (f.country) {
    const x = day.c?.[f.country] || { v: 0, pv: 0 };
    const r: DayAgg["r"] = {}, ci: DayAgg["ci"] = {};
    for (const [k, v] of Object.entries(day.r || {})) if (k.startsWith(f.country + "|")) r[k] = v;
    for (const [k, v] of Object.entries(day.ci || {})) if (k.startsWith(f.country + "|")) ci[k] = v;
    return { v: num(x.v), pv: num(x.pv), c: x.v || x.pv ? { [f.country]: { v: num(x.v), pv: num(x.pv) } } : {}, r, ci, p: {} };
  }
  return { v: num(day.v), pv: num(day.pv), c: day.c || {}, r: day.r || {}, ci: day.ci || {}, p: day.p || {} };
}

type PageAgg = { views: number; v2views: number; sec: number; visitors: number; landings: number; exits: number; s25: number; s50: number; s75: number; s100: number; base: number };
const emptyPage = (): PageAgg => ({ views: 0, v2views: 0, sec: 0, visitors: 0, landings: 0, exits: 0, s25: 0, s50: 0, s75: 0, s100: 0, base: 0 });

function bagAdd(m: Map<string, Bag>, key: string, v: number, pv: number) {
  if (!key) return;
  const row = m.get(key) || { visitors: 0, views: 0 };
  row.visitors += v; row.views += pv; m.set(key, row);
}
function dim() {
  const vids = new Map<string, Set<string>>();
  const views = new Map<string, number>();
  return {
    add(key: string, vid: string, pv: number) {
      if (!key) return;
      let s = vids.get(key); if (!s) vids.set(key, s = new Set()); s.add(vid);
      if (pv) views.set(key, (views.get(key) || 0) + pv);
    },
    fold(into: Map<string, Bag>) { for (const [k, s] of vids) bagAdd(into, k, s.size, views.get(k) || 0); },
  };
}
function toRows(m: Map<string, Bag>, label: (k: string) => string, limit: number): CountRow[] {
  return [...m.entries()].map(([key, x]) => ({ key, label: label(key), visitors: x.visitors, views: x.views }))
    .sort((a, b) => b.visitors - a.visitors || b.views - a.views).slice(0, limit);
}
const DOW = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
function dowIndex(d: string) { return (new Date(d + "T12:00:00Z").getUTCDay() + 1) % 7; }

type Digest = {
  totals: Totals;
  byDay: Map<string, { visitors: number; views: number }>;
  hours: Point[];
  channels: Map<string, Bag>; summary: Map<string, Bag>;
  referrers: Map<string, Bag>; utm: Map<string, Bag>;
  countries: Map<string, Bag>; regions: Map<string, Bag>; cities: Map<string, Bag>;
  devices: Map<string, Bag>; oses: Map<string, Bag>; browsers: Map<string, Bag>; screens: Map<string, Bag>; langs: Map<string, Bag>;
  pages: Map<string, PageAgg>;
  convPages: Map<string, { wa: number; call: number }>;
  convSources: Map<string, { wa: number; call: number; label: string }>;
  convCities: Map<string, { wa: number; call: number }>;
  funnel: { visits: number; service: number; clicks: number };
};

function emptyTotals(): Totals {
  return { visitors: 0, sessions: 0, views: 0, v2views: 0, dur: 0, bounces: 0, newV: 0, retV: 0, wa: 0, call: 0, convSessions: 0, flowKnown: true, legacyDays: 0 };
}
function digest(days: DayBundle[], filter: Filter): Digest {
  const totals = emptyTotals();
  const byDay = new Map<string, { visitors: number; views: number }>();
  const hourVids: Record<number, number> = {};
  const hourViews: Record<number, number> = {};
  for (let h = 0; h < 24; h++) { hourVids[h] = 0; hourViews[h] = 0; }
  const channels = new Map<string, Bag>(), summary = new Map<string, Bag>(), referrers = new Map<string, Bag>(), utm = new Map<string, Bag>();
  const countries = new Map<string, Bag>(), regions = new Map<string, Bag>(), cities = new Map<string, Bag>();
  const devices = new Map<string, Bag>(), oses = new Map<string, Bag>(), browsers = new Map<string, Bag>(), screens = new Map<string, Bag>(), langs = new Map<string, Bag>();
  const pages = new Map<string, PageAgg>();
  const convPages = new Map<string, { wa: number; call: number }>();
  const convSources = new Map<string, { wa: number; call: number; label: string }>();
  const convCities = new Map<string, { wa: number; call: number }>();
  const funnel = { visits: 0, service: 0, clicks: 0 };
  let legacyPresent = false;

  const ensurePage = (path: string) => { let p = pages.get(path); if (!p) pages.set(path, p = emptyPage()); return p; };
  const addConv = (m: Map<string, { wa: number; call: number }>, key: string, wa: number, call: number) => {
    const row = m.get(key) || { wa: 0, call: 0 }; row.wa += wa; row.call += call; m.set(key, row);
  };

  for (const day of days) {
    if ((day.legacy?.pv || 0) > 0 || (day.legacy?.v || 0) > 0) { legacyPresent = true; totals.legacyDays++; }
    const legacy = day.legacy ? legacySlice(day.legacy, filter) : null;
    const sessions = day.sessions.filter((s) => counted(s) && matchSess(s, filter));
    const vids = new Set<string>();
    const news = new Set<string>(), rets = new Set<string>();
    const ch = dim(), sum = dim(), ref = dim(), ut = dim(), geoC = dim(), geoR = dim(), geoI = dim();
    const dev = dim(), os = dim(), br = dim(), scr = dim(), lg = dim();
    const pVids = new Map<string, Set<string>>();
    const hVids: Record<number, Set<string>> = {};
    let dayViews = legacy?.pv || 0;

    for (const s of sessions) {
      const pv = pageviews(s);
      const sec = sessionSec(s);
      const conv = convOf(s);
      vids.add(s.vid);
      if (s.nv) news.add(s.vid); else rets.add(s.vid);
      totals.sessions++;
      totals.v2views += pv;
      totals.dur += sec;
      dayViews += pv;
      if (pv === 1 && conv.wa + conv.call === 0) totals.bounces++;
      totals.wa += conv.wa; totals.call += conv.call;
      if (conv.wa + conv.call > 0) totals.convSessions++;
      funnel.visits++;
      if (Object.keys(s.pg).some((p) => s.pg[p].n > 0 && isService(p))) funnel.service++;
      if (conv.wa + conv.call > 0) funnel.clicks++;
      const sid = sourceId(s), slab = sourceLabel(s);
      if (sid) { ch.add(sid, s.vid, pv); if (s.ch) sum.add(s.ch, s.vid, pv); }
      if (s.ref) ref.add(s.ref, s.vid, pv);
      if (s.us || s.um || s.uc) ut.add([s.us || "—", s.um || "—", s.uc || "—"].join(" / "), s.vid, pv);
      if (s.cc) geoC.add(s.cc, s.vid, pv);
      if (s.cc) geoR.add(`${s.cc}|${s.rg || "?"}`, s.vid, pv);
      if (s.cc) geoI.add(`${s.cc}|${s.ci || "?"}`, s.vid, pv);
      if (s.dv) dev.add(s.dv, s.vid, pv);
      if (s.os) os.add(s.os, s.vid, pv);
      if (s.br) br.add(s.br, s.vid, pv);
      if (s.scr) scr.add(s.scr, s.vid, pv);
      if (s.lg) lg.add(s.lg, s.vid, pv);
      for (const [h, n] of Object.entries(s.hh)) hourViews[+h] = (hourViews[+h] || 0) + n;
      for (const h of Object.keys(s.ha)) { (hVids[+h] ||= new Set()).add(s.vid); }
      if (s.ld && s.pg[s.ld]) ensurePage(s.ld).landings++;
      for (const [path, n] of Object.entries(s.ex)) if (n > 0) ensurePage(path).exits += n;
      for (const [path, p] of Object.entries(s.pg)) {
        if (p.n <= 0 && p.sec <= 0 && p.sk <= 0) continue;
        const row = ensurePage(path);
        row.views += p.n; row.v2views += p.n; row.sec += Math.min(p.sec, MAX_SESSION_SEC);
        if (p.n > 0) {
          let set = pVids.get(path); if (!set) pVids.set(path, set = new Set()); set.add(s.vid);
          row.base++;
          if (p.sk >= 25) row.s25++;
          if (p.sk >= 50) row.s50++;
          if (p.sk >= 75) row.s75++;
          if (p.sk >= 100) row.s100++;
        }
      }
      for (const [path, c] of conv.pages) addConv(convPages, path, c.wa, c.call);
      if (conv.wa || conv.call) {
        const key = sid || "direct";
        const row = convSources.get(key) || { wa: 0, call: 0, label: slab };
        row.wa += conv.wa; row.call += conv.call; convSources.set(key, row);
        addConv(convCities, `${s.cc || "XX"}|${s.ci || "?"}`, conv.wa, conv.call);
      }
    }
    for (const v of news) rets.delete(v);
    totals.visitors += vids.size + (legacy?.v || 0);
    totals.views += dayViews;
    totals.newV += news.size; totals.retV += rets.size;
    byDay.set(day.d, { visitors: vids.size + (legacy?.v || 0), views: dayViews });
    for (let h = 0; h < 24; h++) hourVids[h] += hVids[h]?.size || 0;
    ch.fold(channels); sum.fold(summary); ref.fold(referrers); ut.fold(utm);
    geoC.fold(countries); geoR.fold(regions); geoI.fold(cities);
    dev.fold(devices); os.fold(oses); br.fold(browsers); scr.fold(screens); lg.fold(langs);
    for (const [path, set] of pVids) ensurePage(path).visitors += set.size;
    if (legacy) {
      for (const [k, x] of Object.entries(legacy.c)) bagAdd(countries, k, num(x.v), num(x.pv));
      for (const [k, x] of Object.entries(legacy.r)) bagAdd(regions, k, num(x.v), num(x.pv));
      for (const [k, x] of Object.entries(legacy.ci)) bagAdd(cities, k, num(x.v), num(x.pv));
      if (!filter.country && !filter.city && !filter.source && !filter.device) {
        for (const [path, n] of Object.entries(legacy.p)) ensurePage(path).views += num(n);
      }
    }
  }
  totals.flowKnown = totals.sessions > 0 || !legacyPresent;
  const hours = Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: String(h), visitors: hourVids[h] || 0, views: hourViews[h] || 0 }));
  return { totals, byDay, hours, channels, summary, referrers, utm, countries, regions, cities, devices, oses, browsers, screens, langs, pages, convPages, convSources, convCities, funnel };
}

function pageList(pages: Map<string, PageAgg>, sort: (p: PageStat) => number): PageStat[] {
  const rows: PageStat[] = [];
  for (const [path, p] of pages) {
    if (p.views <= 0 && p.landings <= 0 && p.exits <= 0) continue;
    const tracked = p.v2views > 0;
    rows.push({
      path, views: p.views,
      visitors: tracked ? p.visitors : null,
      avgSec: tracked ? Math.round(p.sec / p.v2views) : null,
      landings: p.landings, exits: Math.max(0, p.exits),
      scroll: p.base > 0 ? { p25: p.s25 / p.base, p50: p.s50 / p.base, p75: p.s75 / p.base, p100: p.s100 / p.base } : null,
    });
  }
  return rows.sort((a, b) => sort(b) - sort(a) || b.views - a.views);
}
function convRows(m: Map<string, { wa: number; call: number; label?: string }>, label: (k: string, row: { label?: string }) => string): ConvStat[] {
  return [...m.entries()].map(([key, row]) => ({ key, label: label(key, row), wa: row.wa, call: row.call }))
    .filter((r) => r.wa + r.call > 0).sort((a, b) => b.wa + b.call - (a.wa + a.call)).slice(0, 25);
}

export function buildReport(input: { from: string; to: string; prevFrom: string; prevTo: string; days: DayBundle[]; prevDays: DayBundle[]; filter: Filter }): Report {
  const filter = { country: input.filter.country || "", city: input.filter.city || "", source: input.filter.source || "", device: input.filter.device || "" };
  const emptyFilter: Filter = { country: "", city: "", source: "", device: "" };
  const base = digest(input.days, emptyFilter);
  const cur = filter.country || filter.city || filter.source || filter.device ? digest(input.days, filter) : base;
  const prev = digest(input.prevDays, filter);
  const hourly = input.from === input.to;
  const series = hourly
    ? cur.hours
    : eachDay(input.from, input.to).map((d) => ({ key: d, label: d.slice(5).replace("-", "/"), visitors: cur.byDay.get(d)?.visitors || 0, views: cur.byDay.get(d)?.views || 0 }));
  const dowMap = Array.from({ length: 7 }, () => ({ visitors: 0, views: 0 }));
  for (const d of eachDay(input.from, input.to)) {
    const row = cur.byDay.get(d); if (!row) continue;
    const i = dowIndex(d); dowMap[i].visitors += row.visitors; dowMap[i].views += row.views;
  }
  const pages = pageList(cur.pages, (p) => p.views).slice(0, 40);
  const facetsSources: { key: string; label: string }[] = [];
  for (const key of ["direct", "organic", "social", "referral", "campaign"]) if (base.summary.has(key)) facetsSources.push({ key, label: CH_FACET[key] });
  for (const row of toRows(base.channels, (k) => k, 80)) if (row.key !== "direct") facetsSources.push({ key: row.key, label: sourceLabel(labelParts(row.key)) });
  return {
    from: input.from, to: input.to, prevFrom: input.prevFrom, prevTo: input.prevTo,
    kpi: cur.totals, prev: prev.totals,
    series, seriesHourly: hourly, hours: cur.hours,
    dow: dowMap.map((x, i) => ({ key: String(i), label: DOW[i], visitors: x.visitors, views: x.views })),
    channels: toRows(cur.channels, (k) => sourceLabel(labelParts(k)), 25),
    channelSummary: toRows(cur.summary, (k) => CH_LABEL[k] || k, 8),
    referrers: toRows(cur.referrers, (k) => k, 25),
    utm: toRows(cur.utm, (k) => k, 25),
    countries: toRows(cur.countries, (k) => k, 30),
    regions: toRows(cur.regions, (k) => k, 25),
    cities: toRows(cur.cities, (k) => k.split("|")[1] || k, 25),
    devices: toRows(cur.devices, (k) => k, 8),
    oses: toRows(cur.oses, (k) => k, 12),
    browsers: toRows(cur.browsers, (k) => k, 12),
    screens: toRows(cur.screens, (k) => k, 12),
    langs: toRows(cur.langs, (k) => k, 12),
    pages,
    landings: pageList(cur.pages, (p) => p.landings).filter((p) => p.landings > 0).slice(0, 15),
    exits: pageList(cur.pages, (p) => p.exits).filter((p) => p.exits > 0).slice(0, 15),
    convPages: convRows(cur.convPages, (k) => k),
    convSources: convRows(cur.convSources, (k, row) => row.label || k),
    convCities: convRows(cur.convCities, (k) => k),
    funnel: cur.funnel,
    facets: {
      countries: toRows(base.countries, (k) => k, 60).map((r) => r.key),
      cities: toRows(base.cities, (k) => k, 80).map((r) => ({ key: r.key, cc: r.key.split("|")[0], name: r.key.split("|").slice(1).join("|") })),
      sources: facetsSources,
      devices: toRows(base.devices, (k) => k, 5).map((r) => r.key),
    },
    legacyDays: base.totals.legacyDays,
  };
}
function labelParts(id: string): Pick<Sess, "ch" | "eng" | "soc" | "ref" | "us" | "um" | "uc"> {
  const [ch, rest = ""] = [id.slice(0, id.indexOf(":")), id.slice(id.indexOf(":") + 1)];
  if (id === "direct") return { ch: "direct", eng: "", soc: "", ref: "", us: "", um: "", uc: "" };
  if (ch === "organic") return { ch, eng: rest, soc: "", ref: "", us: "", um: "", uc: "" };
  if (ch === "social") return { ch, eng: "", soc: rest, ref: "", us: "", um: "", uc: "" };
  if (ch === "referral") return { ch, eng: "", soc: "", ref: rest, us: "", um: "", uc: "" };
  if (ch === "campaign") { const [us = "", um = "", uc = ""] = rest.split("|"); return { ch, eng: "", soc: "", ref: "", us, um, uc }; }
  return { ch: id, eng: "", soc: "", ref: "", us: "", um: "", uc: "" };
}

export function isV2Path(pathname: string) {
  return pathname.includes("/v2-") || pathname.includes("/v2roll-");
}
