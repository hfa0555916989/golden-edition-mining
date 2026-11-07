import { NextResponse } from "next/server";
import { isAuthed } from "../../../../lib/auth";
import { deleteRange, loadLive, loadRangeDays } from "../../../../lib/analytics";
import { buildReport, prevWindow, type Filter } from "../../../../lib/analyticsModel";
import { getContent } from "../../../../lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const okDay = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
let titleCache: { exp: number; titles: Record<string, string> } | null = null;

async function titles() {
  if (titleCache && titleCache.exp > Date.now()) return titleCache.titles;
  const c = await getContent();
  const titles: Record<string, string> = {
    "/": "الرئيسية",
    "/about": c.titles?.about || "من نحن",
    "/contact": c.titles?.contact || "تواصل معنا",
    "/services": c.titles?.services || "الخدمات",
  };
  for (const s of c.services || []) if (s.slug && s.title) titles[`/services/${s.slug}`] = s.title;
  titleCache = { exp: Date.now() + 60_000, titles };
  return titles;
}
function readFilter(u: URL): Filter {
  const country = (u.searchParams.get("country") || "").toUpperCase();
  const city = u.searchParams.get("city") || "";
  const source = u.searchParams.get("source") || "";
  const device = u.searchParams.get("device") || "";
  return {
    country: /^[A-Z]{2}$/.test(country) ? country : "",
    city: city.length > 0 && city.length <= 80 && !/[\r\n<>%]/.test(city) ? city : "",
    source: /^[\w:|.-]{1,140}$/.test(source) ? source : "",
    device: device === "mobile" || device === "tablet" || device === "desktop" ? device : "",
  };
}

export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const u = new URL(req.url);
  if (u.searchParams.get("live") === "1") {
    return NextResponse.json({ live: await loadLive() }, { headers: { "cache-control": "no-store" } });
  }
  let from = u.searchParams.get("from");
  let to = u.searchParams.get("to");
  if (!okDay(from) || !okDay(to)) return NextResponse.json({ error: "bad range" }, { status: 400 });
  if (from > to) [from, to] = [to, from];
  const span = Math.round((Date.parse(to + "T12:00:00Z") - Date.parse(from + "T12:00:00Z")) / 86400000) + 1;
  if (span < 1 || span > 400) return NextResponse.json({ error: "range too long" }, { status: 400 });
  const [prevFrom, prevTo] = prevWindow(from, to);
  try {
    const [days, prevDays] = await loadRangeDays(from, to, prevFrom, prevTo);
    const report = buildReport({ from, to, prevFrom, prevTo, days, prevDays, filter: readFilter(u) });
    const pageTitles = await titles().catch(() => ({} as Record<string, string>));
    return NextResponse.json({ ...report, titles: pageTitles }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("analytics report", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
export async function DELETE(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const u = new URL(req.url);
  const from = u.searchParams.get("from"), to = u.searchParams.get("to");
  if (!okDay(from) || !okDay(to)) return NextResponse.json({ error: "bad range" }, { status: 400 });
  return NextResponse.json({ deleted: await deleteRange(from, to) });
}
