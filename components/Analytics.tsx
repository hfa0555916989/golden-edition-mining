"use client";
import { useEffect, useMemo, useState } from "react";
import type { ConvStat, CountRow, PageStat, Report, Totals } from "../lib/analyticsModel";

const TZ = "Asia/Riyadh";
const dk = (t: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(t);
const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const nf = new Intl.NumberFormat("ar-SA");
const nf1 = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const PAGE_FALLBACK: Record<string, string> = {
  "/": "الرئيسية", "/about": "من نحن", "/contact": "تواصل معنا", "/services": "الخدمات",
  "/services/general-contracting": "المقاولات العامة", "/services/mining": "مجال التعدين",
  "/services/heavy-equipment-rental": "تأجير المعدات الثقيلة", "/services/labor-services": "خدمات اليد العاملة",
  "/services/agriculture": "المجال الزراعي", "/services/tourism-hotels": "السياحة والفنادق",
};
const DEV: Record<string, string> = { mobile: "جوال", tablet: "جهاز لوحي", desktop: "كمبيوتر" };
const SA: Record<string, string> = { "01": "منطقة الرياض", "02": "منطقة مكة المكرمة", "03": "منطقة المدينة المنورة", "04": "المنطقة الشرقية", "05": "منطقة القصيم", "06": "منطقة حائل", "07": "منطقة تبوك", "08": "منطقة الحدود الشمالية", "09": "منطقة جازان", "10": "منطقة نجران", "11": "منطقة الباحة", "12": "منطقة الجوف", "14": "منطقة عسير" };
type Mode = "today" | "yesterday" | "7d" | "30d" | "month" | "lastmonth" | "year" | "custom";
type LiveRow = { path: string; cc: string; ci: string; dv: string; t: number };
type Delta = { kind: "na" } | { kind: "new" } | { kind: "pct"; v: number };

let dn: Intl.DisplayNames | null = null;
const flag = (cc: string) => /^[A-Z]{2}$/.test(cc) && cc !== "XX" ? String.fromCodePoint(...[...cc].map((ch) => 0x1f1a5 + ch.charCodeAt(0))) : "🌐";
const countryName = (cc: string) => { if (!/^[A-Z]{2}$/.test(cc) || cc === "XX") return "غير معروف"; try { dn ||= new Intl.DisplayNames(["ar"], { type: "region" }); return dn.of(cc) || cc; } catch { return cc; } };
const regionLabel = (key: string) => { const [cc, r = ""] = key.split("|"); const name = !r || r === "?" ? "غير معروف" : cc === "SA" && SA[r] ? SA[r] : r; return `${flag(cc)} ${name}`; };
const cityLabel = (key: string) => { const [cc, ...rest] = key.split("|"); const name = rest.join("|"); return `${flag(cc)} ${!name || name === "?" ? "غير معروف" : name}`; };
const pageTitle = (path: string, titles: Record<string, string>) => titles[path] || PAGE_FALLBACK[path] || path;
const rate = (n: number, d: number) => (d ? n / d : 0);
const dur = (sec: number) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; if (h) return `${nf.format(h)}س ${nf.format(m)}د`; if (m) return `${nf.format(m)}د ${nf.format(s)}ث`; return `${nf.format(s)}ث`; };
const pctText = (n: number) => nf1.format(n * 100) + "%";
function change(cur: number, prev: number, known: boolean): Delta {
  if (!known) return { kind: "na" };
  if (!prev) return cur ? { kind: "new" } : { kind: "pct", v: 0 };
  return { kind: "pct", v: ((cur - prev) / prev) * 100 };
}
function DeltaView({ d, good }: { d: Delta; good: "up" | "down" }) {
  if (d.kind === "na") return <span className="text-[11px] text-gray-400">لا مقارنة</span>;
  if (d.kind === "new") return <span className={`text-[11px] font-semibold ${good === "down" ? "text-red-600" : "text-emerald-600"}`}>جديد</span>;
  const up = d.v > 0.05, down = d.v < -0.05;
  const positive = !up && !down ? null : good === "up" ? up : down;
  const color = positive === null ? "text-gray-400" : positive ? "text-emerald-600" : "text-red-600";
  return <span className={`text-[11px] font-semibold ${color}`}>{up ? "▲" : down ? "▼" : "●"} {nf1.format(Math.abs(d.v))}%</span>;
}
function rangeFor(mode: Mode, today: string, from: string, to: string): [string, string] {
  if (mode === "today") return [today, today];
  if (mode === "yesterday") { const y = addDays(today, -1); return [y, y]; }
  if (mode === "7d") return [addDays(today, -6), today];
  if (mode === "30d") return [addDays(today, -29), today];
  if (mode === "month") return [today.slice(0, 7) + "-01", today];
  if (mode === "lastmonth") {
    const [y, m] = today.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);
    return [start, end];
  }
  if (mode === "year") return [`${today.slice(0, 4)}-01-01`, today];
  return from <= to ? [from, to] : [to, from];
}

function Trend({ series }: { series: { label: string; visitors: number; views: number }[] }) {
  const W = 760, H = 210, P = 28;
  const max = Math.max(1, ...series.map((s) => Math.max(s.views, s.visitors)));
  const bw = (W - P * 2) / Math.max(1, series.length);
  const y = (n: number) => H - P - (n / max) * (H - P * 2);
  const line = series.map((s, i) => `${i ? "L" : "M"}${P + bw * i + bw / 2},${y(s.visitors)}`).join(" ");
  const step = Math.ceil(series.length / 12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="الزوار والمشاهدات عبر الزمن">
      {[0, 0.5, 1].map((f) => <g key={f}><line x1={P} x2={W - P} y1={y(max * f)} y2={y(max * f)} stroke="#eee" /><text x={4} y={y(max * f) + 3} fontSize="10" fill="#999">{Math.round(max * f)}</text></g>)}
      {series.map((s, i) => <rect key={i} x={P + bw * i + bw * 0.18} y={y(s.views)} width={Math.max(1, bw * 0.64)} height={Math.max(0, H - P - y(s.views))} rx="2" fill="#d4af37" opacity=".55"><title>{`${s.label}: ${s.views} مشاهدة، ${s.visitors} زائر`}</title></rect>)}
      <path d={line} fill="none" stroke="#8a6d1d" strokeWidth="2.5" />
      {series.map((s, i) => <circle key={`c${i}`} cx={P + bw * i + bw / 2} cy={y(s.visitors)} r={series.length > 40 ? 1.6 : 2.6} fill="#8a6d1d" />)}
      {series.map((s, i) => i % step === 0 ? <text key={`t${i}`} x={P + bw * i + bw / 2} y={H - 8} fontSize="10" textAnchor="middle" fill="#888">{s.label}</text> : null)}
    </svg>
  );
}
function VBars({ series, aria }: { series: { label: string; visitors: number; views: number }[]; aria: string }) {
  const W = 760, H = 168, P = 26;
  const max = Math.max(1, ...series.map((s) => Math.max(s.visitors, s.views)));
  const bw = (W - P * 2) / Math.max(1, series.length);
  const y = (n: number) => H - P - (n / max) * (H - P * 1.6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={aria}>
      {series.map((s, i) => (
        <g key={s.label + i}>
          <rect x={P + bw * i + bw * 0.18} y={y(s.views)} width={Math.max(1, bw * 0.3)} height={Math.max(0, H - P - y(s.views))} rx="1" fill="#d4af37"><title>{`${s.label}: ${s.views} مشاهدة`}</title></rect>
          <rect x={P + bw * i + bw * 0.52} y={y(s.visitors)} width={Math.max(1, bw * 0.3)} height={Math.max(0, H - P - y(s.visitors))} rx="1" fill="#8a6d1d"><title>{`${s.label}: ${s.visitors} زائر`}</title></rect>
          <text x={P + bw * i + bw / 2} y={H - 6} fontSize={series.length > 12 ? 8 : 10} textAnchor="middle" fill="#888">{s.label}</text>
        </g>
      ))}
    </svg>
  );
}
function Bars({ rows, max, value }: { rows: { label: string; visitors: number; views: number; sub?: string }[]; max: number; value: "visitors" | "views" }) {
  if (!rows.length) return <p className="text-sm text-gray-500 py-6 text-center">لا توجد بيانات في هذه الفترة</p>;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.label + i}>
          <div className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{r.label}</span><span className="text-gray-500 shrink-0 text-xs">{r.sub}</span></div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded bg-gray-100 overflow-hidden"><div className="h-full rounded" style={{ width: `${Math.max(3, ((value === "visitors" ? r.visitors : r.views) / (max || 1)) * 100)}%`, background: "linear-gradient(90deg,#8a6d1d,#d4af37)" }} /></div>
            <span className="text-xs w-16 text-left shrink-0">{nf.format(r.visitors)} <span className="text-gray-400">/ {nf.format(r.views)}</span></span>
          </div>
        </div>
      ))}
    </div>
  );
}
function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <section className="rounded-xl border p-3 sm:p-4"><div className="mb-3"><h3 className="font-bold">{title}</h3>{hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}</div>{children}</section>;
}
function Scrolls({ s }: { s: PageStat["scroll"] }) {
  if (!s) return <span className="text-gray-400">—</span>;
  const bits = [["25", s.p25], ["50", s.p50], ["75", s.p75], ["100", s.p100]] as const;
  return <div className="flex gap-1.5">{bits.map(([n, v]) => <span key={n} className="text-[10px] text-gray-500 text-center" title={`${n}%: ${pctText(v)}`}><span className="block h-1.5 w-7 rounded bg-gray-100 overflow-hidden mb-0.5"><span className="block h-full bg-yellow-700" style={{ width: `${Math.round(v * 100)}%` }} /></span>{n}</span>)}</div>;
}

const PRESETS: [Mode, string][] = [["today", "اليوم"], ["yesterday", "أمس"], ["7d", "7 أيام"], ["30d", "30 يوم"], ["month", "هذا الشهر"], ["lastmonth", "الشهر الماضي"], ["year", "هذه السنة"], ["custom", "فترة مخصصة"]];

export default function Analytics() {
  const today = dk(new Date());
  const [mode, setMode] = useState<Mode>("7d");
  const [from, setFrom] = useState(addDays(today, -6));
  const [to, setTo] = useState(today);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState("");
  const [device, setDevice] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [live, setLive] = useState<LiveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [more, setMore] = useState<Record<string, boolean>>({});
  const range = useMemo(() => rangeFor(mode, today, from, to), [mode, today, from, to]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true); setErr("");
    const q = new URLSearchParams({ from: range[0], to: range[1] });
    if (country) q.set("country", country);
    if (city) q.set("city", city);
    if (source) q.set("source", source);
    if (device) q.set("device", device);
    fetch(`/api/admin/analytics?${q}`, { signal: ac.signal })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((j) => { setReport(j as Report); setTitles(j.titles || {}); })
      .catch((e) => { if (e?.name === "AbortError") return; setErr(e === 401 ? "انتهت الجلسة، أعد تسجيل الدخول" : "تعذر تحميل الإحصائيات (" + e + ")"); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [range, country, city, source, device]);

  useEffect(() => {
    let off = false;
    const tick = () => fetch("/api/admin/analytics?live=1").then((r) => r.ok ? r.json() : null).then((j) => { if (!off && j) setLive(j.live || []); }).catch(() => {});
    tick();
    const id = setInterval(() => { if (document.visibilityState === "visible") tick(); }, 20000);
    return () => { off = true; clearInterval(id); };
  }, []);

  const titleOf = (path: string) => pageTitle(path, titles);
  const take = <T,>(id: string, rows: T[], n = 8) => more[id] ? rows : rows.slice(0, n);
  const moreBtn = (id: string, n: number, limit = 8) => n > limit ? <button type="button" className="text-xs text-yellow-800 mt-2" onClick={() => setMore((m) => ({ ...m, [id]: !m[id] }))}>{more[id] ? "عرض أقل" : `عرض الكل (${nf.format(n)})`}</button> : null;

  function exportCsv() {
    if (!report) return;
    const esc = (s: string | number) => { const v = String(s ?? ""); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
    const lines: string[] = ["\uFEFFالمؤشر,القيمة,الفترة السابقة"];
    const k = report.kpi, p = report.prev;
    const row = (name: string, a: string | number, b: string | number) => lines.push([name, a, b].map(esc).join(","));
    row("الفترة", `${report.from} → ${report.to}`, `${report.prevFrom} → ${report.prevTo}`);
    row("الزوار", k.visitors, p.visitors);
    row("الجلسات", k.sessions, p.sessions);
    row("المشاهدات", k.views, p.views);
    row("متوسط مدة الجلسة (ثانية)", k.sessions ? Math.round(k.dur / k.sessions) : 0, p.sessions ? Math.round(p.dur / p.sessions) : 0);
    row("معدل الارتداد", k.sessions ? pctText(k.bounces / k.sessions) : "0%", p.sessions ? pctText(p.bounces / p.sessions) : "0%");
    row("صفحات لكل جلسة", k.sessions ? (k.v2views / k.sessions).toFixed(2) : "0", p.sessions ? (p.v2views / p.sessions).toFixed(2) : "0");
    row("زوار جدد", k.newV, p.newV);
    row("زوار عائدون", k.retV, p.retV);
    row("نقرات واتساب", k.wa, p.wa);
    row("نقرات اتصال", k.call, p.call);
    row("معدل التحويل", k.sessions ? pctText(k.convSessions / k.sessions) : "0%", p.sessions ? pctText(p.convSessions / p.sessions) : "0%");
    const table = (title: string, head: string[], rows: (string | number)[][]) => { lines.push(""); lines.push(title); lines.push(head.map(esc).join(",")); for (const r of rows) lines.push(r.map(esc).join(",")); };
    table("السلسلة", ["التسمية", "الزوار", "المشاهدات"], report.series.map((s) => [s.label, s.visitors, s.views]));
    table("ساعات اليوم", ["الساعة", "الزوار", "المشاهدات"], report.hours.map((s) => [s.label, s.visitors, s.views]));
    table("أيام الأسبوع", ["اليوم", "الزوار", "المشاهدات"], report.dow.map((s) => [s.label, s.visitors, s.views]));
    const counts = (title: string, rows: CountRow[], label: (r: CountRow) => string) => table(title, ["الاسم", "الزوار", "المشاهدات"], rows.map((r) => [label(r), r.visitors, r.views]));
    counts("القنوات", report.channels, (r) => r.label);
    counts("النطاقات", report.referrers, (r) => r.label);
    counts("UTM", report.utm, (r) => r.label);
    counts("الدول", report.countries, (r) => `${countryName(r.key)} (${r.key})`);
    counts("المناطق", report.regions, (r) => regionLabel(r.key));
    counts("المدن", report.cities, (r) => cityLabel(r.key));
    counts("الأجهزة", report.devices, (r) => DEV[r.key] || r.key);
    counts("أنظمة التشغيل", report.oses, (r) => r.label);
    counts("المتصفحات", report.browsers, (r) => r.label);
    counts("مقاسات الشاشة", report.screens, (r) => r.label);
    counts("اللغة", report.langs, (r) => r.label);
    table("الصفحات", ["المسار", "العنوان", "المشاهدات", "الزوار", "متوسط الثواني", "دخول", "خروج", "تمرير 25", "تمرير 50", "تمرير 75", "تمرير 100"], report.pages.map((pg) => [pg.path, titleOf(pg.path), pg.views, pg.visitors ?? "", pg.avgSec ?? "", pg.landings, pg.exits, pg.scroll ? Math.round(pg.scroll.p25 * 100) : "", pg.scroll ? Math.round(pg.scroll.p50 * 100) : "", pg.scroll ? Math.round(pg.scroll.p75 * 100) : "", pg.scroll ? Math.round(pg.scroll.p100 * 100) : ""]));
    const conv = (title: string, rows: ConvStat[], label: (r: ConvStat) => string) => table(title, ["الاسم", "واتساب", "اتصال"], rows.map((r) => [label(r), r.wa, r.call]));
    conv("تحويلات الصفحات", report.convPages, (r) => `${titleOf(r.key)} (${r.key})`);
    conv("تحويلات المصادر", report.convSources, (r) => r.label);
    conv("تحويلات المدن", report.convCities, (r) => cityLabel(r.key));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `analytics-${report.from}_${report.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const k = report?.kpi;
  const p = report?.prev;
  const flow = !!p?.flowKnown;
  const share = (n: number) => (k && k.visitors ? pctText(n / k.visitors) : "");
  const geoRows = (rows: CountRow[] | undefined, label: (r: CountRow) => string) => (rows || []).map((r) => ({ label: label(r), visitors: r.visitors, views: r.views, sub: share(r.visitors) }));
  const maxOf = (rows: { visitors: number }[]) => rows[0]?.visitors || 1;

  const card = (label: string, value: string, d: Delta, good: "up" | "down", sub?: string) => (
    <div className="rounded-xl border p-3 bg-gradient-to-br from-white to-yellow-50 min-w-0">
      <div className="text-[11px] sm:text-xs text-gray-500">{label}</div>
      <div className="text-xl sm:text-2xl font-bold mt-1 truncate">{value}</div>
      <div className="flex items-center justify-between gap-1 mt-1"><DeltaView d={d} good={good} />{sub && <span className="text-[10px] text-gray-400 truncate">{sub}</span>}</div>
    </div>
  );

  const citiesForCountry = (report?.facets.cities || []).filter((c) => !country || c.cc === country);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {PRESETS.map(([m, l]) => <button key={m} type="button" onClick={() => setMode(m)} className={`px-3 py-1.5 rounded-full text-sm border ${mode === m ? "bg-gray-900 text-white border-gray-900" : "bg-white"}`}>{l}</button>)}
        {mode === "custom" && <><input type="date" className="inp !w-auto" value={from} max={today} onChange={(e) => setFrom(e.target.value)} /><span className="text-sm">إلى</span><input type="date" className="inp !w-auto" value={to} max={today} onChange={(e) => setTo(e.target.value)} /></>}
        <button type="button" onClick={exportCsv} disabled={!report} className="px-3 py-1.5 rounded-full text-sm border bg-white disabled:opacity-40 mr-auto">تصدير CSV</button>
        {loading && <span className="text-sm text-gray-500">جاري التحميل…</span>}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <select className="inp !w-auto text-sm" value={country} onChange={(e) => { setCountry(e.target.value); setCity(""); }} aria-label="الدولة">
          <option value="">كل الدول</option>
          {(report?.facets.countries || []).map((cc) => <option key={cc} value={cc}>{flag(cc)} {countryName(cc)}</option>)}
        </select>
        <select className="inp !w-auto text-sm max-w-[14rem]" value={city} onChange={(e) => setCity(e.target.value)} aria-label="المدينة">
          <option value="">كل المدن</option>
          {citiesForCountry.map((c) => <option key={c.key} value={c.key}>{flag(c.cc)} {c.name === "?" ? "غير معروف" : c.name}</option>)}
        </select>
        <select className="inp !w-auto text-sm max-w-[16rem]" value={source} onChange={(e) => setSource(e.target.value)} aria-label="المصدر">
          <option value="">كل المصادر</option>
          {(report?.facets.sources || []).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className="inp !w-auto text-sm" value={device} onChange={(e) => setDevice(e.target.value)} aria-label="الجهاز">
          <option value="">كل الأجهزة</option>
          {(report?.facets.devices || ["mobile", "tablet", "desktop"]).map((d) => <option key={d} value={d}>{DEV[d] || d}</option>)}
        </select>
      </div>
      <p className="text-xs text-gray-500 mb-3">الفترة {range[0]} — {range[1]} بتوقيت الرياض{report ? `، مقارنة بـ ${report.prevFrom} — ${report.prevTo}` : ""}. الزائر يُحسب مرة في اليوم. المعرّف كوكي عشوائي يُملَّح يومياً ولا يُحفظ عنوان IP. تُستبعد برامج الزحف وزيارات لوحة التحكم.</p>
      {report && report.legacyDays > 0 && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">البيانات الأقدم محفوظة وتظهر ضمن الزوار والمشاهدات والدول والمدن والصفحات. الجلسات والمدة والمصادر والأجهزة وعمق التمرير والتحويلات تُحسب من التتبع الجديد فقط{(source || device) ? " — فلتر المصدر أو الجهاز لا ينطبق على تلك البيانات القديمة." : "."}</p>}
      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}

      <section className="rounded-xl border p-3 sm:p-4 mb-4" aria-live="polite">
        <div className="flex items-center gap-2 font-bold"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />الزوار الآن <span className="text-sm font-normal text-gray-500">({nf.format(live.length)} · آخر 5 دقائق)</span></div>
        {live.length === 0 ? <p className="text-sm text-gray-500 mt-2">لا يوجد زوار نشطون حالياً</p> : (
          <ul className="mt-2 divide-y">
            {live.map((r, i) => { const s = Math.max(0, Math.round((Date.now() - r.t) / 1000)); return <li key={r.path + String(r.t) + i} className="py-1.5 flex items-center justify-between gap-3 text-sm"><span className="truncate">{titleOf(r.path)}</span><span className="text-gray-500 shrink-0 text-xs">{flag(r.cc)} {r.ci === "?" ? "غير معروف" : r.ci} · {DEV[r.dv] || r.dv || "—"} · {s < 60 ? `منذ ${nf.format(s)} ث` : `منذ ${nf.format(Math.round(s / 60))} د`}</span></li>; })}
          </ul>
        )}
      </section>

      {k && p && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 mb-4">
          {card("الزوار الفريدون", nf.format(k.visitors), change(k.visitors, p.visitors, true), "up", "يومي")}
          {card("الجلسات", nf.format(k.sessions), change(k.sessions, p.sessions, flow), "up")}
          {card("مشاهدات الصفحات", nf.format(k.views), change(k.views, p.views, true), "up")}
          {card("متوسط مدة الجلسة", k.sessions ? dur(k.dur / k.sessions) : "—", change(rate(k.dur, k.sessions), rate(p.dur, p.sessions), flow), "up")}
          {card("معدل الارتداد", k.sessions ? pctText(k.bounces / k.sessions) : "—", change(rate(k.bounces, k.sessions), rate(p.bounces, p.sessions), flow), "down", "صفحة واحدة بلا نقرة")}
          {card("صفحات / جلسة", k.sessions ? nf1.format(k.v2views / k.sessions) : "—", change(rate(k.v2views, k.sessions), rate(p.v2views, p.sessions), flow), "up")}
          <div className="rounded-xl border p-3 bg-gradient-to-br from-white to-yellow-50">
            <div className="text-[11px] sm:text-xs text-gray-500">جدد / عائدون</div>
            <div className="text-xl sm:text-2xl font-bold mt-1">{nf.format(k.newV)} <span className="text-gray-300">/</span> {nf.format(k.retV)}</div>
            <div className="mt-1 h-1.5 rounded bg-gray-100 overflow-hidden flex">{k.newV + k.retV > 0 && <div className="h-full bg-yellow-600" style={{ width: `${(k.newV / (k.newV + k.retV)) * 100}%` }} />}<div className="h-full bg-gray-800 flex-1" /></div>
            <div className="flex gap-3 mt-1"><DeltaView d={change(k.newV, p.newV, flow)} good="up" /><DeltaView d={change(k.retV, p.retV, flow)} good="up" /></div>
          </div>
          {card("التحويلات", nf.format(k.wa + k.call), change(k.wa + k.call, p.wa + p.call, flow), "up", `واتساب ${nf.format(k.wa)} · اتصال ${nf.format(k.call)}`)}
          {card("معدل التحويل", k.sessions ? pctText(k.convSessions / k.sessions) : "—", change(rate(k.convSessions, k.sessions), rate(p.convSessions, p.sessions), flow), "up", "جلسات نقرت")}
        </div>
      )}

      <Panel title={report?.seriesHourly ? "الزوار حسب الساعة" : "الزوار والمشاهدات"} hint="الخط: الزوار · الأعمدة: المشاهدات">
        {report ? <Trend series={report.series} /> : <p className="text-sm text-gray-500 py-6 text-center">بانتظار البيانات</p>}
        <p className="text-[11px] text-gray-400 mt-1"><span className="text-yellow-700">■ المشاهدات</span> · <span style={{ color: "#8a6d1d" }}>● الزوار</span></p>
      </Panel>
      <div className="grid lg:grid-cols-2 gap-4 my-4">
        <Panel title="ساعات اليوم" hint="مجموع النشاط في كل ساعة بتوقيت الرياض"><VBars series={report?.hours || []} aria="التوزيع حسب الساعة" /></Panel>
        <Panel title="أيام الأسبوع" hint="من السبت إلى الجمعة"><VBars series={report?.dow || []} aria="التوزيع حسب اليوم" /></Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Panel title="مصادر الزيارات" hint="بحث حسب المحرك، اجتماعي حسب المنصة، مباشر، إحالة، حملات">
          <div className="flex flex-wrap gap-2 mb-3">{(report?.channelSummary || []).map((c) => <span key={c.key} className="text-xs rounded-full border px-2 py-1 bg-yellow-50">{c.label} · {nf.format(c.visitors)}</span>)}</div>
          <Bars rows={take("ch", geoRows(report?.channels, (r) => r.label))} max={maxOf(report?.channels || [])} value="visitors" />
          {moreBtn("ch", report?.channels.length || 0)}
        </Panel>
        <Panel title="النطاقات المُحيلة">
          <Bars rows={take("ref", geoRows(report?.referrers, (r) => r.label))} max={maxOf(report?.referrers || [])} value="visitors" />
          {moreBtn("ref", report?.referrers.length || 0)}
        </Panel>
        <Panel title="حملات UTM" hint="المصدر / الوسيط / الحملة">
          <Bars rows={take("utm", (report?.utm || []).map((r) => ({ label: r.label, visitors: r.visitors, views: r.views, sub: share(r.visitors) })))} max={maxOf(report?.utm || [])} value="visitors" />
          {moreBtn("utm", report?.utm.length || 0)}
        </Panel>
        <Panel title="الدول">
          <Bars rows={take("c", geoRows(report?.countries, (r) => `${flag(r.key)} ${countryName(r.key)}`))} max={maxOf(report?.countries || [])} value="visitors" />
          {moreBtn("c", report?.countries.length || 0)}
        </Panel>
        <Panel title="المناطق" hint="مناطق السعودية بأسمائها">
          <Bars rows={take("r", geoRows(report?.regions, (r) => regionLabel(r.key)))} max={maxOf(report?.regions || [])} value="visitors" />
          {moreBtn("r", report?.regions.length || 0)}
        </Panel>
        <Panel title="المدن">
          <Bars rows={take("ci", geoRows(report?.cities, (r) => cityLabel(r.key)))} max={maxOf(report?.cities || [])} value="visitors" />
          {moreBtn("ci", report?.cities.length || 0)}
        </Panel>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
        <Panel title="نوع الجهاز"><Bars rows={geoRows(report?.devices, (r) => DEV[r.key] || r.label)} max={maxOf(report?.devices || [])} value="visitors" /></Panel>
        <Panel title="نظام التشغيل"><Bars rows={take("os", geoRows(report?.oses, (r) => r.label), 6)} max={maxOf(report?.oses || [])} value="visitors" /></Panel>
        <Panel title="المتصفح"><Bars rows={take("br", geoRows(report?.browsers, (r) => r.label), 6)} max={maxOf(report?.browsers || [])} value="visitors" /></Panel>
        <Panel title="مقاس الشاشة"><Bars rows={take("sc", geoRows(report?.screens, (r) => r.label), 6)} max={maxOf(report?.screens || [])} value="visitors" /></Panel>
        <Panel title="اللغة"><Bars rows={take("lg", geoRows(report?.langs, (r) => r.label), 6)} max={maxOf(report?.langs || [])} value="visitors" /></Panel>
      </div>

      <Panel title="الصفحات" hint="العنوان العربي، متوسط الوقت، وصفحات الدخول والخروج، وعمق التمرير">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead><tr className="text-gray-500 text-xs text-right"><th className="pb-2 font-medium">الصفحة</th><th className="pb-2 font-medium">مشاهدات</th><th className="pb-2 font-medium">زوار</th><th className="pb-2 font-medium">الوقت</th><th className="pb-2 font-medium">دخول</th><th className="pb-2 font-medium">خروج</th><th className="pb-2 font-medium">تمرير 25/50/75/100</th></tr></thead>
            <tbody>
              {take("pg", report?.pages || [], 12).map((pg) => (
                <tr key={pg.path} className="border-t align-top">
                  <td className="py-2 pl-2"><div className="font-medium">{titleOf(pg.path)}</div><div className="text-[11px] text-gray-400" dir="ltr">{pg.path}</div></td>
                  <td className="py-2">{nf.format(pg.views)}</td>
                  <td className="py-2">{pg.visitors == null ? "—" : nf.format(pg.visitors)}</td>
                  <td className="py-2">{pg.avgSec == null ? "—" : dur(pg.avgSec)}</td>
                  <td className="py-2">{nf.format(pg.landings)}</td>
                  <td className="py-2">{nf.format(pg.exits)}</td>
                  <td className="py-2"><Scrolls s={pg.scroll} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!report?.pages.length && <p className="text-sm text-gray-500 py-4 text-center">لا توجد صفحات في هذه الفترة</p>}
        {moreBtn("pg", report?.pages.length || 0, 12)}
      </Panel>
      <div className="grid lg:grid-cols-2 gap-4 my-4">
        <Panel title="صفحات الدخول">{(report?.landings || []).length ? <Bars rows={report!.landings.map((pg) => ({ label: titleOf(pg.path), visitors: pg.landings, views: pg.views, sub: pg.path }))} max={report!.landings[0].landings || 1} value="visitors" /> : <p className="text-sm text-gray-500 text-center py-4">لا بيانات</p>}</Panel>
        <Panel title="صفحات الخروج">{(report?.exits || []).length ? <Bars rows={report!.exits.map((pg) => ({ label: titleOf(pg.path), visitors: pg.exits, views: pg.views, sub: pg.path }))} max={report!.exits[0].exits || 1} value="visitors" /> : <p className="text-sm text-gray-500 text-center py-4">لا بيانات</p>}</Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="مسار التحويل" hint="زيارة ← مشاهدة صفحة خدمة ← نقرة واتساب أو اتصال">
          <Funnel f={report?.funnel || { visits: 0, service: 0, clicks: 0 }} />
        </Panel>
        <ConvTable title="النقرات حسب الصفحة" rows={report?.convPages || []} label={(r) => titleOf(r.key)} />
        <ConvTable title="النقرات حسب المصدر" rows={report?.convSources || []} label={(r) => r.label} />
        <ConvTable title="النقرات حسب المدينة" rows={report?.convCities || []} label={(r) => cityLabel(r.key)} />
      </div>
    </div>
  );
}

function Funnel({ f }: { f: { visits: number; service: number; clicks: number } }) {
  const steps: [string, number][] = [["زيارة", f.visits], ["شاهد صفحة خدمة", f.service], ["نقرة واتساب أو اتصال", f.clicks]];
  const base = f.visits || 1;
  return (
    <div className="space-y-3">
      {steps.map(([label, n], i) => (
        <div key={label}>
          <div className="flex justify-between text-sm mb-1"><span>{label}</span><span className="font-bold">{nf.format(n)} <span className="text-gray-400 font-normal text-xs">{f.visits ? pctText(n / base) : ""}</span></span></div>
          <div className="h-3 rounded bg-gray-100 overflow-hidden"><div className="h-full rounded" style={{ width: `${Math.max(n ? 4 : 0, (n / base) * 100)}%`, background: i === 2 ? "#111" : "linear-gradient(90deg,#8a6d1d,#d4af37)" }} /></div>
        </div>
      ))}
    </div>
  );
}
function ConvTable({ title, rows, label }: { title: string; rows: ConvStat[]; label: (r: ConvStat) => string }) {
  return (
    <Panel title={title}>
      {!rows.length ? <p className="text-sm text-gray-500 text-center py-4">لا نقرات في هذه الفترة</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500"><th className="text-right font-medium pb-2">الاسم</th><th className="font-medium pb-2 w-20">واتساب</th><th className="font-medium pb-2 w-20">اتصال</th></tr></thead>
            <tbody>{rows.slice(0, 12).map((r) => <tr key={r.key} className="border-t"><td className="py-1.5 truncate max-w-[16rem]">{label(r)}</td><td className="text-center">{nf.format(r.wa)}</td><td className="text-center">{nf.format(r.call)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
