import { NextResponse, after } from "next/server";
import { record, flushSoon, dayKey, BOT_RE } from "../../../lib/analytics";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
const dec = (s: string | null) => { if (!s) return ""; try { return decodeURIComponent(s); } catch { return s; } };

export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  const res = new NextResponse(null, { status: 204 });
  if (!ua || BOT_RE.test(ua)) return res;
  const body = await req.json().catch(() => ({}));
  let path = String(body?.path || "/").split("?")[0].split("#")[0].slice(0, 120) || "/";
  if (!path.startsWith("/")) path = "/";
  if (path.startsWith("/admin552255") || path.startsWith("/api")) return res;
  const country = (req.headers.get("x-vercel-ip-country") || "XX").toUpperCase().slice(0, 2);
  const region = dec(req.headers.get("x-vercel-ip-country-region")).slice(0, 40) || "?";
  const city = dec(req.headers.get("x-vercel-ip-city")).slice(0, 60) || "?";
  // unique visitor = first page view of the day for this browser (anonymous day-stamp cookie, no ID)
  const today = dayKey();
  const cookie = req.headers.get("cookie") || "";
  const seen = /(?:^|;\s*)gv_day=([0-9-]+)/.exec(cookie)?.[1];
  const newVisitor = seen !== today;
  record({ path, country, region, city, newVisitor });
  after(() => flushSoon());
  if (newVisitor) res.cookies.set("gv_day", today, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 26 });
  return res;
}
