import type { Service } from "../lib/types";
import { HexImg } from "./Shell";
import { ArrowLeft } from "lucide-react";
export default function ServiceCards({ items }: { items: Service[] }) {
  return (
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s, i) => (
        <a key={s.slug} href={`/services/${s.slug}`} className="group text-center reveal block" style={{ transitionDelay: `${(i % 3) * 90}ms` }}>
          <HexImg src={s.image || s.images[0] || ""} alt={s.title} sizes="(min-width:1024px) 22vw, (min-width:640px) 40vw, 70vw" className="w-[58%] max-w-64 sm:w-[70%] sm:max-w-none mx-auto" />
          <h3 className="text-xl md:text-2xl font-bold mt-6 mb-2 group-hover:text-[var(--primary)] transition">{s.title}</h3>
          {s.highlight && <div className="inline-block text-sm font-bold px-3 py-1 mb-3 rounded" style={{ background: "color-mix(in srgb, var(--primary) 16%, transparent)", color: "var(--primary)" }}>{s.highlight}</div>}
          <p className="opacity-75 leading-8 max-w-sm mx-auto">{s.desc}</p>
          <span className="inline-flex items-center gap-1.5 mt-3 gold font-semibold text-sm">التفاصيل<ArrowLeft size={16} className="group-hover:-translate-x-1 transition" /></span>
        </a>
      ))}
    </div>
  );
}
