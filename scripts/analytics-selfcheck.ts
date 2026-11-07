import {
  applyInc, buildReport, classify, cleanPath, emptyAgg, emptySess, mergeInc, pageviews, parseUA, prevWindow, sessionsFromParts, type DayAgg, type Inc, type Sess,
} from "../lib/analyticsModel";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}
function eq(a: unknown, b: unknown, msg: string) {
  if (a !== b) throw new Error(`${msg}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}

const direct = classify("", "", "", "");
eq(direct.ch, "direct", "direct");
const organic = classify("www.google.com", "", "", "");
eq(organic.ch, "organic", "google channel");
eq(organic.eng, "Google", "google engine");
const social = classify("l.instagram.com", "", "", "");
eq(social.ch, "social", "instagram");
eq(social.soc, "Instagram", "ig name");
eq(classify("about.co", "", "", "").ch, "referral", "t.co does not swallow about.co");
const camp = classify("google.com", "newsletter", "email", "spring");
eq(camp.ch, "campaign", "utm wins");
eq(camp.us, "newsletter", "utm source");
eq(cleanPath("/admin552255/x"), "", "admin blocked");
eq(cleanPath("/services/mining/?q=1"), "/services/mining", "strip query");
eq(parseUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1").dv, "mobile", "iphone");
eq(parseUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36").br, "Chrome", "chrome not googlebot");

const a: Inc = { id: "s1", vid: "v1", nv: 1, h0: 10, cc: "SA", rg: "01", ci: "Riyadh", dv: "mobile", os: "iOS", br: "Safari", ch: "direct", pv: [["/", 10, 1]], ld: "/", ex: [["/", 1]], tm: [["/", 12, 10]], sk: [["/", 50]] };
const b: Inc = { id: "s1", vid: "v1", pv: [["/about", 10, 1]], ex: [["/", -1], ["/about", 1]], tm: [["/about", 20, 10]], sk: [["/about", 100]] };
const merged = mergeInc(a, b);
const viaMerge = applyInc(emptySess("s1", "v1"), merged);
const viaEach = applyInc(applyInc(emptySess("s1", "v1"), a), b);
eq(pageviews(viaMerge), pageviews(viaEach), "merge order views");
eq(viaMerge.ex["/"], 0, "left home");
eq(viaMerge.ex["/about"], 1, "exit about");
eq(viaMerge.ld, "/", "landing");
eq(viaMerge.pg["/"].sk, 50, "scroll home");
eq(viaMerge.pg["/about"].sk, 100, "scroll about");
eq(viaMerge.pg["/"].sec + viaMerge.pg["/about"].sec, 32, "duration");

const bounce: Inc = { id: "s2", vid: "v2", nv: 0, h0: 11, cc: "SA", rg: "01", ci: "Jeddah", dv: "desktop", os: "Windows", br: "Chrome", ch: "organic", eng: "Google", ref: "google.com", pv: [["/services/mining", 11, 1]], ld: "/services/mining", ex: [["/services/mining", 1]], cv: [["wa", "/services/mining", 1]] };
const call: Inc = { id: "s3", vid: "v3", nv: 1, h0: 12, cc: "EG", rg: "C", ci: "Cairo", dv: "mobile", ch: "campaign", us: "fb", um: "paid", uc: "eid", pv: [["/contact", 12, 1]], ld: "/contact", ex: [["/contact", 1]], cv: [["call", "/contact", 2]] };

function bundle(d: string, incs: Inc[], legacy: DayAgg | null = null) {
  const sessions: Sess[] = [];
  for (const inc of incs) {
    let s = sessions.find((x) => x.id === inc.id);
    if (!s) { s = emptySess(inc.id, inc.vid); sessions.push(s); }
    applyInc(s, inc);
  }
  return { d, legacy, sessions };
}
const legacy = emptyAgg("2026-11-01");
legacy.v = 4; legacy.pv = 10;
legacy.c.SA = { v: 3, pv: 7 }; legacy.c.EG = { v: 1, pv: 3 };
legacy.r["SA|01"] = { v: 3, pv: 7 };
legacy.ci["SA|Riyadh"] = { v: 2, pv: 5 };
legacy.p["/"] = 6; legacy.p["/about"] = 4;

const days = [bundle("2026-11-01", [], legacy), bundle("2026-11-02", [a, b, bounce, call])];
const report = buildReport({ from: "2026-11-01", to: "2026-11-02", prevFrom: "2026-10-30", prevTo: "2026-10-31", days, prevDays: [], filter: { country: "", city: "", source: "", device: "" } });
eq(report.kpi.visitors, 7, "visitors legacy+v2");
eq(report.kpi.views, 14, "views 10 legacy + 4 v2");
eq(report.kpi.sessions, 3, "sessions");
eq(report.kpi.bounces, 0, "a click is not a bounce");
eq(report.kpi.wa, 1, "wa");
eq(report.kpi.call, 2, "calls");
eq(report.kpi.convSessions, 2, "converting sessions");
eq(report.funnel.visits, 3, "funnel visits");
eq(report.funnel.service, 1, "funnel service");
eq(report.funnel.clicks, 2, "funnel clicks");
eq(report.kpi.newV, 2, "new visitors");
eq(report.kpi.retV, 1, "returning");
const about = report.pages.find((p) => p.path === "/about");
assert(about, "about page");
eq(about!.views, 5, "about views legacy+new");
eq(about!.exits, 1, "about exits");
eq(about!.avgSec, 20, "about time");
const home = report.landings.find((p) => p.path === "/");
eq(home?.landings, 1, "home landing");
eq(report.channels.some((c) => c.label.includes("Google")), true, "google channel");
eq(report.hours[10].views >= 2, true, "hour 10 views");
eq(report.countries.find((c) => c.key === "SA")!.visitors, 5, "SA visitors 3 legacy + 2");

const filtered = buildReport({ ...{ from: "2026-11-01", to: "2026-11-02", prevFrom: "2026-10-30", prevTo: "2026-10-31", days, prevDays: [] }, filter: { country: "", city: "", source: "", device: "mobile" } });
eq(filtered.kpi.visitors, 2, "mobile drops legacy and desktop");
eq(filtered.kpi.sessions, 2, "two mobile sessions");
eq(filtered.pages.some((p) => p.path === "/about" && p.views === 4), false, "legacy pages hidden when device filter cannot see them");

const city = buildReport({ from: "2026-11-01", to: "2026-11-02", prevFrom: "2026-10-30", prevTo: "2026-10-31", days, prevDays: [], filter: { country: "SA", city: "SA|Riyadh", source: "", device: "" } });
eq(city.kpi.visitors, 3, "riyadh legacy 2 + v2 home");
assert(!city.pages.some((p) => p.views === 6), "unscoped legacy page counts excluded");

const lone = bundle("2026-11-03", [{ id: "sx", vid: "vx", nv: 1, h0: 8, cc: "SA", rg: "01", ci: "Riyadh", dv: "mobile", ch: "direct", pv: [["/", 8, 1]], ld: "/", ex: [["/", 1]] }]);
const oneDay = buildReport({ from: "2026-11-03", to: "2026-11-03", prevFrom: "2026-11-02", prevTo: "2026-11-02", days: [lone], prevDays: [], filter: { country: "", city: "", source: "", device: "" } });
eq(oneDay.kpi.bounces, 1, "single page without a click bounces");
eq(oneDay.seriesHourly, true, "one day uses hours");
eq(oneDay.series.length, 24, "24 hour series");
const [pf, pt] = prevWindow("2026-11-01", "2026-11-07");
eq(pf, "2026-10-25", "prev from");
eq(pt, "2026-10-31", "prev to");

const roll = sessionsFromParts([
  { k: "v2", roll: 1, d: "2026-11-02", seq: 1, uids: ["aa"], sessions: [] },
  { k: "v2", d: "2026-11-02", uid: "aa", s: [a] },
  { k: "v2", d: "2026-11-02", uid: "bb", s: [b] },
]);
eq(pageviews(roll.sessions[0]), 1, "delta already in the roll is not applied twice");
eq(roll.uids.includes("aa") && roll.uids.includes("bb"), true, "uids kept");

console.log("analytics self-check ok");
