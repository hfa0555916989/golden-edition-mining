import { NextResponse, after } from "next/server";
import { isAuthed } from "../../../lib/auth";
import { dailyVid, flushSoon, recordInc, touchLive } from "../../../lib/analytics";
import { BOT_RE, classify, cleanPath, dayKey, hourInRiyadh, languageTag, parseUA, screenBucket, type Inc } from "../../../lib/analyticsModel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const GID = "gv_id";
const GFIRST = "gv_first";
const YEAR = 60 * 60 * 24 * 400;
const dec = (s: string | null) => { if (!s) return ""; try { return decodeURIComponent(s); } catch { return s; } };
function readCookie(header: string, name: string) {
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(header || "");
  if (!m) return "";
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}
function cookie(res: NextResponse, name: string, value: string) {
  res.cookies.set(name, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: YEAR });
}

export async function POST(req: Request) {
  const res = new NextResponse(null, { status: 204 });
  const ua = req.headers.get("user-agent") || "";
  if (!ua || ua.length > 500 || BOT_RE.test(ua)) return res;
  try { if (await isAuthed()) return res; } catch { /* treat as a public visit */ }

  let raw = "";
  try { raw = await req.text(); } catch { return res; }
  if (!raw || raw.length > 6000) return res;
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(raw) as Record<string, unknown>; } catch { return res; }

  const path = cleanPath(String(body.path || "/"));
  if (!path) return res;
  const today = dayKey();
  const header = req.headers.get("cookie") || "";
  let gid = readCookie(header, GID);
  const setGid = !/^[a-f0-9]{32}$/.test(gid);
  if (setGid) gid = cryptoRandom();
  let first = readCookie(header, GFIRST);
  const setFirst = !/^\d{4}-\d{2}-\d{2}$/.test(first);
  if (setFirst) first = today;
  const nv: 0 | 1 = first === today ? 1 : 0;
  const vid = dailyVid(gid, today);
  const hour = hourInRiyadh();
  const country = (req.headers.get("x-vercel-ip-country") || "XX").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) || "XX";
  const region = dec(req.headers.get("x-vercel-ip-country-region")).replace(/[\r\n]/g, "").slice(0, 40) || "?";
  const city = dec(req.headers.get("x-vercel-ip-city")).replace(/[\r\n<>]/g, "").slice(0, 60) || "?";
  const parsed = parseUA(ua);
  const dvRaw = String(body.dv || "");
  const dv = dvRaw === "mobile" || dvRaw === "tablet" || dvRaw === "desktop" ? dvRaw : parsed.dv;
  const kind = body.t === "hb" || body.t === "cv" || body.t === "pv" ? body.t : "";
  const legacy = !body.sid;
  const sid = legacy ? vid : String(body.sid || "");
  if (!legacy && !/^[a-f0-9]{12,32}$/.test(sid)) return res;

  const geo = { cc: country, rg: region, ci: city };
  const finish = (inc: Inc | null) => {
    if (inc) recordInc(today, inc);
    touchLive(vid, { path, cc: country, ci: city, dv });
    if (inc) after(() => flushSoon());
    if (setGid) cookie(res, GID, gid);
    if (setFirst) cookie(res, GFIRST, first);
    return res;
  };

  if (legacy || kind === "pv" || (!kind && body.path)) {
    const inc: Inc = { id: sid, vid, nv, ...geo };
    if (!legacy && body.ns) Object.assign(inc, persona(body, parsed, dv), { h0: hour });
    else if (legacy) Object.assign(inc, { h0: hour, dv: parsed.dv, os: parsed.os, br: parsed.br, ch: "direct" });
    inc.pv = [[path, hour, 1]];
    if (!legacy && (body.ld === 1 || body.ld === true)) inc.ld = path;
    if (!legacy) {
      const prev = body.ex ? cleanPath(String(body.ex)) : "";
      inc.ex = prev && prev !== path ? [[prev, -1], [path, 1]] : [[path, 1]];
    }
    return finish(inc);
  }

  if (kind === "hb") {
    const dt = Math.max(0, Math.min(60, Math.round(Number(body.dt) || 0)));
    const skN = Number(body.sk);
    const sk = skN === 25 || skN === 50 || skN === 75 || skN === 100 ? skN : 0;
    if (!dt && !sk) return finish(null);
    const inc: Inc = { id: sid, vid, nv, ...geo };
    if (body.ns) Object.assign(inc, persona(body, parsed, dv), { h0: hour });
    if (dt) inc.tm = [[path, dt, hour]];
    if (sk) inc.sk = [[path, sk]];
    return finish(inc);
  }

  if (kind === "cv" && (body.k === "wa" || body.k === "call")) {
    const inc: Inc = { id: sid, vid, nv, ...geo, cv: [[body.k, path, 1]] };
    if (body.ns) Object.assign(inc, persona(body, parsed, dv), { h0: hour });
    return finish(inc);
  }
  return res;
}

function persona(body: Record<string, unknown>, parsed: { os: string; br: string }, dv: string) {
  const ch = classify(String(body.ref || ""), String(body.us || ""), String(body.um || ""), String(body.uc || ""));
  return { ...ch, dv, os: parsed.os, br: parsed.br, scr: screenBucket(Number(body.sw), Number(body.sh)), lg: languageTag(String(body.lg || "")) };
}
function cryptoRandom() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}
