"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export default function Tracker() {
  const path = usePathname();
  useEffect(() => {
    if (!path || path.startsWith("/admin552255")) return;
    if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return;
    fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path }), keepalive: true }).catch(() => {});
  }, [path]);
  return null;
}
