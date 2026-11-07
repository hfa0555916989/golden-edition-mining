"use client";
import { useState } from "react";
import { Menu, X, Phone } from "lucide-react";
export default function MobileNav({ links, tel, callLabel }: { links: [string, string][]; tel: string; callLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="xl:hidden">
      <button aria-label="القائمة" aria-expanded={open} onClick={() => setOpen(!open)} className="icon-chip !w-11 !h-11">{open ? <X size={22} /> : <Menu size={22} />}</button>
      {open && (
        <div className="fixed inset-x-0 z-[60] overflow-y-auto border-t px-5 py-4 space-y-1 shadow-2xl" style={{ top: "var(--header-h)", height: "calc(100dvh - var(--header-h))", background: "var(--bg)", borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
          {links.map(([k, v]) => <a key={k} href={k} onClick={() => setOpen(false)} className="block py-3 text-lg border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>{v}</a>)}
          <a href={tel} className="btn mt-4 w-full justify-center"><Phone size={18} />{callLabel}</a>
        </div>
      )}
    </div>
  );
}
