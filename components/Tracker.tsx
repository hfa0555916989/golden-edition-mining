"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const TIMEOUT = 30 * 60 * 1000;
type Mem = {
  id: string; last: number; path: string; fresh: boolean; scroll: number; scrollSent: number;
  ref: string; us: string; um: string; uc: string; sw: number; sh: number; lg: string; dv: string;
};
let mem: Mem | null = null;
let lastTick = 0;
let hidden = false;
let lastPathSent = "";
let lastPathAt = 0;
let lastCv = "";
let lastCvAt = 0;

function rid() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function skip(path: string) {
  return !path || path.startsWith("/admin552255") || path.startsWith("/api") || navigator.webdriver === true;
}
function deviceKind() {
  const w = window.innerWidth || screen.width;
  const ua = navigator.userAgent || "";
  const iPad = /iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (iPad) return "tablet";
  if (/Android/.test(ua) && !/Mobile/.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android/.test(ua) || w < 768) return "mobile";
  return "desktop";
}
function capture(landing: boolean) {
  const q = new URLSearchParams(location.search);
  let us = (q.get("utm_source") || "").slice(0, 60);
  let um = (q.get("utm_medium") || "").slice(0, 60);
  let uc = (q.get("utm_campaign") || "").slice(0, 60);
  if (!us && !um && !uc && q.get("gclid")) { us = "google"; um = "cpc"; }
  if (!us && !um && !uc && q.get("fbclid")) { us = "facebook"; um = "paid"; }
  let ref = "";
  if (landing && !us && !um && !uc) {
    try {
      const u = new URL(document.referrer);
      if (u.host && u.host !== location.host) ref = u.host.replace(/^www\./, "").slice(0, 80);
    } catch { /* direct */ }
  }
  return { ref, us, um, uc, sw: screen.width || 0, sh: screen.height || 0, lg: (navigator.language || "").slice(0, 16), dv: deviceKind() };
}
function ensure() {
  const now = Date.now();
  if (!mem || now - mem.last > TIMEOUT) {
    let landing = true;
    try {
      landing = !sessionStorage.getItem("gv_tab");
      sessionStorage.setItem("gv_tab", "1");
    } catch { /* private mode */ }
    mem = { id: rid(), last: now, path: "", fresh: true, scroll: 0, scrollSent: 0, ...capture(landing) };
    lastTick = now;
  }
  return mem;
}
function send(payload: Record<string, unknown>, beacon = false) {
  const body = JSON.stringify(payload);
  try {
    if (beacon && navigator.sendBeacon && navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }))) return;
  } catch { /* fall through */ }
  fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
}
function attrs(s: Mem) {
  return { ref: s.ref, us: s.us, um: s.um, uc: s.uc, sw: s.sw, sh: s.sh, lg: s.lg, dv: s.dv };
}
function depth() {
  const el = document.documentElement;
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 8) return 100;
  const pct = ((window.scrollY || el.scrollTop || 0) / max) * 100;
  if (pct >= 99) return 100;
  if (pct >= 75) return 75;
  if (pct >= 50) return 50;
  if (pct >= 25) return 25;
  return 0;
}
function takeDt() {
  const now = Date.now();
  const dt = Math.round((now - lastTick) / 1000);
  lastTick = now;
  if (dt < 1 || dt > 60) return 0;
  return dt;
}
function beat(beacon: boolean) {
  if (!mem || !mem.path || skip(mem.path)) return;
  const dt = takeDt();
  const sk = mem.scroll > mem.scrollSent ? mem.scroll : 0;
  if (sk) mem.scrollSent = mem.scroll;
  mem.last = Date.now();
  if (!dt && !sk) { send({ t: "hb", sid: mem.id, path: mem.path, dt: 0, sk: 0 }, beacon); return; }
  send({ t: "hb", sid: mem.id, path: mem.path, dt, sk, ns: mem.fresh ? 1 : 0, ...(mem.fresh ? attrs(mem) : {}) }, beacon);
  mem.fresh = false;
}
function onPath(path: string) {
  if (skip(path)) return;
  const now = Date.now();
  if (lastPathSent === path && now - lastPathAt < 800) return;
  lastPathSent = path; lastPathAt = now;
  const prev = mem;
  const expired = !mem || now - mem.last > TIMEOUT;
  if (!expired && mem?.path && mem.path !== path) {
    const dt = takeDt();
    const sk = mem.scroll > mem.scrollSent ? mem.scroll : 0;
    if (dt || sk) send({ t: "hb", sid: mem.id, path: mem.path, dt, sk });
  } else lastTick = now;
  const s = ensure();
  const ns = s.fresh;
  send({
    t: "pv", sid: s.id, path, ns: ns ? 1 : 0, ld: s.path ? 0 : 1,
    ex: s.path && s.path !== path ? s.path : undefined,
    ...(ns ? attrs(s) : {}),
  });
  s.fresh = false;
  s.path = path;
  s.scroll = 0;
  s.scrollSent = 0;
  s.last = Date.now();
  requestAnimationFrame(() => { if (mem && mem.path === path) { const d = depth(); if (d > mem.scroll) mem.scroll = d; } });
}
function onClick(e: MouseEvent) {
  if (skip(location.pathname)) return;
  const start = e.target instanceof Element ? e.target : e.target instanceof Node ? e.target.parentElement : null;
  const el = start?.closest("a[href]") ?? null;
  if (!el) return;
  const href = el.getAttribute("href") || "";
  const k = href.startsWith("tel:") ? "call" : /wa\.me|api\.whatsapp\.com|whatsapp:/i.test(href) ? "wa" : "";
  if (!k) return;
  const path = location.pathname || "/";
  const now = Date.now();
  const sig = k + path;
  if (sig === lastCv && now - lastCvAt < 800) return;
  lastCv = sig; lastCvAt = now;
  const s = ensure();
  send({ t: "cv", sid: s.id, path, k, ns: s.fresh ? 1 : 0, ...(s.fresh ? attrs(s) : {}) }, true);
  s.fresh = false;
  s.last = now;
}

export default function Tracker() {
  const path = usePathname();
  const pathRef = useRef(path);
  useEffect(() => { pathRef.current = path; if (path) onPath(path); }, [path]);
  useEffect(() => {
    const onScroll = () => { if (!mem) return; const d = depth(); if (d > mem.scroll) mem.scroll = d; };
    const onVis = () => {
      if (document.visibilityState === "hidden") { beat(true); hidden = true; }
      else { hidden = false; lastTick = Date.now(); }
    };
    const onHide = () => { beat(true); hidden = true; };
    document.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("click", onClick, true);
    const id = window.setInterval(() => { if (!hidden && pathRef.current && !skip(pathRef.current)) beat(false); }, 15000);
    return () => {
      document.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("click", onClick, true);
      window.clearInterval(id);
    };
  }, []);
  return null;
}
