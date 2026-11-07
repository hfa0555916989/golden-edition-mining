import Image from "next/image";
import type { Content } from "../lib/types";
import { byCategory } from "../lib/services";
import { intl } from "../lib/url";
import { orgLd, ld } from "../lib/seo";
import Reveal from "./Reveal";
import MobileNav from "./MobileNav";
import Logo from "./Logo";
import { WhatsAppIcon, Divider } from "./Brand";
import { Phone, Mail, MapPin, Globe, AtSign, Camera, Music2, Share2, ChevronLeft } from "lucide-react";

const SOCIAL_ICONS: Record<string, typeof Globe> = { instagram: Camera, x: AtSign, snapchat: Share2, tiktok: Music2, facebook: Globe };
export const links = (c: Content) => {
  const wa = `https://wa.me/${intl(c.contact.whatsapp || c.contact.phone)}`;
  const tel = `tel:+${intl(c.contact.phone)}`;
  return { wa, tel };
};

export function Head({ eyebrow, title, light }: { eyebrow?: string; title: string; light?: boolean }) {
  return (
    <div className="text-center mb-12 md:mb-16 reveal">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className={`fluid-h2 font-bold mt-3 ${light ? "" : "gold-grad"}`}>{title}</h2>
      <Divider variant="golden" />
    </div>
  );
}
export function Img({ src, alt, className, sizes, priority }: { src: string; alt: string; className?: string; sizes: string; priority?: boolean }) {
  if (!src) return null;
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className ?? "object-cover"} />;
}
export function HexImg({ src, alt, sizes, className = "" }: { src: string; alt: string; sizes: string; className?: string }) {
  return (
    <div className={`hex hex-frame ${className}`}>
      <div className="hex hex-in"><Img src={src} alt={alt} sizes={sizes} /></div>
    </div>
  );
}
export function BrandMark({ c, className = "" }: { c: Content; className?: string }) {
  return c.identity.logo ? <img src={c.identity.logo} alt={c.hero.badge} className={`logo ${className}`} /> : <Logo className={className} />;
}

export function Crumbs({ items }: { items: [string, string][] }) {
  return (
    <nav aria-label="مسار التنقل" className="text-sm opacity-80 flex flex-wrap items-center gap-1.5">
      {items.map(([n, h], i) => (
        <span key={h} className="flex items-center gap-1.5">
          {i < items.length - 1 ? <a href={h} className="hover:text-[var(--primary)]">{n}</a> : <span className="gold">{n}</span>}
          {i < items.length - 1 && <ChevronLeft size={14} className="opacity-60" />}
        </span>
      ))}
    </nav>
  );
}

export function PageHero({ title, subtitle, image, crumbs }: { title: string; subtitle?: string; image: string; crumbs: [string, string][] }) {
  return (
    <section className="relative pt-28 md:pt-40 pb-16 md:pb-24 px-4 overflow-hidden">
      <Img src={image} alt={title} sizes="100vw" priority />
      <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(10,11,13,.55) 0%, rgba(10,11,13,.82) 55%, rgba(10,11,13,.96) 100%)" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent" />
      <div className="relative max-w-7xl mx-auto">
        <Crumbs items={crumbs} />
        <h1 className="fluid-h1 font-bold mt-4 mb-4 max-w-3xl">{title}</h1>
        {subtitle && <p className="fluid-lead opacity-90 max-w-2xl">{subtitle}</p>}
      </div>
    </section>
  );
}

export default function Shell({ c, children }: { c: Content; children: React.ReactNode }) {
  const t = c.titles;
  const { wa, tel } = links(c);
  const socials = Object.entries(c.social).filter(([, v]) => v);
  const nav: [string, string][] = [
    ["/", "الرئيسية"],
    ["/#mining", t.mining || "التعدين"],
    ["/#contracting", t.contracting || "المقاولات"],
    ["/about", t.about || "من نحن"],
    ["/#projects", t.projects || "مجالات أعمالنا"],
    ["/#gallery", t.gallery || "المعرض"],
    ["/contact", t.contact || "تواصل معنا"],
  ];
  const mobileLinks = nav;
  return (
    <div className="v-golden">
      <Reveal />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(orgLd(c))} />
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b" style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)", height: "var(--header-h)" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center justify-between gap-3">
          <a href="/" className="flex items-center min-w-0 max-w-[68%] sm:max-w-[52%] xl:max-w-[240px] 2xl:max-w-[320px]" aria-label={c.hero.badge}><BrandMark c={c} /></a>
          <nav className="hidden xl:flex items-center gap-4 2xl:gap-6 text-sm 2xl:text-[15px] font-medium" aria-label="القائمة الرئيسية">
            {nav.map(([h, v]) => <a key={h} href={h} className="opacity-85 hover:opacity-100 hover:text-[var(--primary)] transition whitespace-nowrap py-2">{v}</a>)}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <a href={tel} className="btn !py-2 !px-4 text-sm !hidden md:!inline-flex whitespace-nowrap"><Phone size={16} />{t.callNow || "اتصل الآن"}</a>
            <MobileNav links={mobileLinks} tel={tel} callLabel={t.callNow || "اتصل الآن"} />
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="pt-14 pb-32 md:pb-28 px-4 border-t hex-bg" style={{ borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)" }}>
        <div className="max-w-7xl mx-auto grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2 xl:col-span-2">
            <div className="mb-5 max-w-xs"><BrandMark c={c} /></div>
            <p className="opacity-70 leading-8 max-w-md">{c.seo.description}</p>
            {socials.length > 0 && <div className="flex flex-wrap gap-3 mt-5">{socials.map(([k, v]) => { const I = SOCIAL_ICONS[k] || Globe; return <a key={k} href={v} target="_blank" rel="noopener" aria-label={k} className="icon-chip !w-10 !h-10"><I size={18} /></a>; })}</div>}
          </div>
          <div>
            <h2 className="display font-bold text-lg mb-3 gold"><a href="/#mining" className="hover:opacity-80">{t.mining || "التعدين"}</a></h2>
            <ul className="space-y-2 opacity-80 mb-6">{byCategory(c.services, "mining").map((s) => <li key={s.slug}><a href={`/services/${s.slug}`} className="hover:text-[var(--primary)]">{s.title}</a></li>)}</ul>
            <h2 className="display font-bold text-lg mb-3 gold"><a href="/#contracting" className="hover:opacity-80">{t.contracting || "المقاولات"}</a></h2>
            <ul className="space-y-2 opacity-80">{byCategory(c.services, "contracting").map((s) => <li key={s.slug}><a href={`/services/${s.slug}`} className="hover:text-[var(--primary)]">{s.title}</a></li>)}</ul>
          </div>
          <div>
            <h2 className="display font-bold text-lg mb-4 gold">{t.contact}</h2>
            <ul className="space-y-3 opacity-85">
              <li><a href={tel} className="flex items-center gap-2"><Phone size={16} className="gold" /><span dir="ltr">{c.contact.phone}</span></a></li>
              <li><a href={wa} className="flex items-center gap-2"><WhatsAppIcon size={16} color="var(--primary)" /><span dir="ltr">{c.contact.whatsapp || c.contact.phone}</span></a></li>
              {c.contact.email && <li><a href={`mailto:${c.contact.email}`} className="flex items-center gap-2"><Mail size={16} className="gold" />{c.contact.email}</a></li>}
              <li className="flex items-start gap-2"><MapPin size={16} className="gold mt-1 shrink-0" />{c.contact.address}</li>
              <li className="pt-2 flex gap-4 text-sm"><a href="/about" className="hover:text-[var(--primary)]">{t.about}</a><a href="/contact" className="hover:text-[var(--primary)]">{t.contact}</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t text-center text-sm opacity-60" style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>{c.footer.text}</div>
      </footer>

      <div className="fab-stack">
        <a href={wa} aria-label="تواصل عبر واتساب" target="_blank" rel="noopener" className="wa-pulse rounded-full grid place-items-center shadow-[0_10px_25px_rgba(0,0,0,.35)] hover:scale-105 transition" style={{ background: "#25D366" }}>
          <WhatsAppIcon size={28} />
        </a>
        <a href={tel} aria-label="اتصال" className="rounded-full grid place-items-center shadow-[0_10px_25px_rgba(0,0,0,.35)] hover:scale-105 transition border-2" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 80%, #fff), var(--primary))", borderColor: "rgba(255,255,255,.25)" }}>
          <Phone size={22} color="#111" fill="#111" strokeWidth={1.5} />
        </a>
      </div>
    </div>
  );
}
