import { getContent } from "../lib/store";
import type { Metadata } from "next";
import Counter from "../components/Counter";
import ServiceBands from "../components/ServiceBands";
import Shell, { Head, Img, HexImg, links } from "../components/Shell";
import { WhatsAppIcon } from "../components/Brand";
import { pageMeta } from "../lib/seo";
import Image from "next/image";
import { MapPin, Award, Truck, ShieldCheck, Clock, HardHat, Wrench, Phone, Quote, Star, CheckCircle2, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const WHY_ICONS = [Truck, HardHat, Award, ShieldCheck, Clock, Wrench];

export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  return { ...pageMeta(c, { path: "/", title: c.seo.title, desc: c.seo.description, image: c.seo.ogImage }), keywords: c.seo.keywords.split(/[,،]/).map((s) => s.trim()).filter(Boolean) };
}

export default async function Home() {
  const c = await getContent();
  const t = c.titles, S = c.sections;
  const { wa, tel } = links(c);
  const on = (k: string) => S[k] !== false;
  const points = (c.about.points || "").split("\n").map((s) => s.trim()).filter(Boolean);
  return (
    <Shell c={c}>
      {/* Hero */}
      <section className="relative min-h-[100svh] flex items-end md:items-center overflow-hidden">
        <Img src={c.hero.image} alt={c.hero.title} sizes="100vw" priority />
        <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(10,11,13,.35) 0%, rgba(10,11,13,.75) 55%, rgba(10,11,13,.95) 100%)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto w-full px-4 md:px-6 pt-28 pb-16 md:py-28">
          <div className="max-w-2xl reveal">
            <span className="eyebrow">{c.hero.badge}</span>
            <h1 className="fluid-h1 font-bold mt-4 mb-5">{c.hero.title}</h1>
            <p className="fluid-lead opacity-90 mb-8 max-w-xl">{c.hero.subtitle}</p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <a href={wa} target="_blank" rel="noopener" className="btn sm:w-auto"><WhatsAppIcon size={20} color="#111" />{c.hero.cta}</a>
              <a href={tel} className="btn-ghost sm:w-auto"><Phone size={18} /><span dir="ltr">{c.contact.phone}</span></a>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-8 pe-16 sm:pe-0 text-sm opacity-85">
              {c.stats.slice(0, 3).map((s, i) => <span key={i} className="flex items-center gap-2"><CheckCircle2 size={16} className="gold" />{s.title} {s.desc}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      {on("stats") && c.stats.length > 0 && (
        <section className="relative -mt-10 z-10 px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 reveal">
            {c.stats.map((s, i) => (
              <div key={i} className="card cut p-5 sm:p-6 md:p-8 text-center">
                <div className="display text-3xl md:text-5xl font-bold gold-grad"><Counter value={s.title} /></div>
                <div className="mt-2 text-sm md:text-base opacity-75 leading-6">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* About */}
      {on("about") && c.about.text && (
        <section id="about" className="relative py-16 md:py-28 px-4 overflow-hidden">
          {c.about.image && <div className="absolute inset-0 opacity-[.08]"><Img src={c.about.image} alt="" sizes="100vw" /></div>}
          <div className="absolute inset-0 pattern opacity-60" />
          <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative reveal grid grid-cols-2 gap-3 sm:gap-4 max-w-lg mx-auto w-full">
              <HexImg src={c.about.image} alt={c.about.title || t.about} sizes="(min-width:1024px) 22vw, 45vw" className="col-span-1 mt-8 sm:mt-16" />
              <HexImg src={c.services[1]?.image || c.hero.image} alt={c.services[1]?.title || ""} sizes="(min-width:1024px) 22vw, 45vw" />
              <HexImg src={c.services[2]?.image || c.hero.image} alt={c.services[2]?.title || ""} sizes="(min-width:1024px) 22vw, 45vw" className="-mt-8 sm:-mt-16" />
              <HexImg src={c.services[3]?.image || c.hero.image} alt={c.services[3]?.title || ""} sizes="(min-width:1024px) 22vw, 45vw" />
            </div>
            <div className="reveal">
              <span className="eyebrow">{t.about}</span>
              <h2 className="fluid-h2 font-bold mt-3 mb-5 gold-grad">{c.about.title || t.about}</h2>
              <p className="fluid-lead opacity-85 whitespace-pre-line mb-8">{c.about.text}</p>
              {points.length > 0 && (
                <ul className="grid sm:grid-cols-2 gap-4 mb-9">
                  {points.map((p, i) => <li key={i} className="flex items-start gap-3"><CheckCircle2 className="gold shrink-0 mt-1" size={20} /><span>{p}</span></li>)}
                </ul>
              )}
              <div className="flex flex-wrap gap-3"><a href="/about" className="btn">اقرأ المزيد<ArrowLeft size={18} /></a><a href={wa} target="_blank" rel="noopener" className="btn-ghost"><WhatsAppIcon size={18} color="var(--primary)" />{c.hero.cta}</a></div>
            </div>
          </div>
        </section>
      )}

      {/* Services */}
      {on("services") && c.services.length > 0 && <ServiceBands c={c} />}

      {/* Cities */}
      {on("cities") && c.cities.length > 0 && (
        <section id="cities" className="py-16 md:py-28 px-4 relative">
          <div className="absolute inset-0 pattern opacity-50" />
          <div className="relative max-w-6xl mx-auto">
            <Head title={t.cities} />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {c.cities.map((x, i) => (
                <div key={i} className="card cut p-6 md:p-8 text-center reveal hover:-translate-y-1 transition" style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className="icon-chip mx-auto mb-4"><MapPin size={24} strokeWidth={1.6} /></div>
                  <div className="display text-2xl md:text-3xl font-bold">{x.title}</div>
                  {x.desc && <div className="text-sm md:text-base opacity-75 mt-2">{x.desc}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Projects / أعمالنا */}
      {on("projects") && c.projects.length > 0 && (
        <section id="projects" className="py-16 md:py-28 px-4 scroll-mt-24" style={{ background: "var(--surface)" }}>
          <div className="max-w-7xl mx-auto">
            <Head eyebrow={t.projects} title={t.projects} />
            <div className="grid gap-6 md:grid-cols-3">
              {c.projects.map((p, i) => (
                <article key={i} className={`relative overflow-hidden card cut zoom reveal ${i === 0 ? "md:col-span-2 md:row-span-2 min-h-[18rem] md:min-h-[36rem]" : "min-h-[16rem] md:min-h-0"}`}>
                  <Img src={p.image || c.hero.image} alt={p.title} sizes={i === 0 ? "(min-width:768px) 66vw, 100vw" : "(min-width:768px) 33vw, 100vw"} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-6 md:p-8">
                    <span className="inline-block h-1 w-10 mb-4" style={{ background: "var(--primary)" }} />
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">{p.title}</h3>
                    <p className="text-white/80 leading-7">{p.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why us */}
      {on("why") && c.why.length > 0 && (
        <section id="why" className="py-16 md:py-28 px-4 relative">
          <div className="max-w-7xl mx-auto">
            <Head title={t.why} />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {c.why.map((w, i) => { const Icon = WHY_ICONS[i % WHY_ICONS.length]; return (
                <div key={i} className="card cut p-7 reveal group hover:-translate-y-1 transition" style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className="flex items-center justify-between mb-6"><div className="icon-chip"><Icon size={24} strokeWidth={1.6} /></div><span className="display text-4xl font-bold opacity-15">0{i + 1}</span></div>
                  <h3 className="text-xl font-bold mb-2">{w.title}</h3>
                  <p className="opacity-75 leading-8">{w.desc}</p>
                </div>
              ); })}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {on("gallery") && c.gallery.length > 0 && (
        <section id="gallery" className="py-16 md:py-28 px-4 scroll-mt-24" style={{ background: "var(--surface)" }}>
          <div className="max-w-7xl mx-auto">
            <Head title={t.gallery} />
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [&>figure]:mb-4">
              {c.gallery.map((g, i) => (
                <figure key={i} className="break-inside-avoid relative overflow-hidden card cut zoom group reveal">
                  <Image src={g.url} alt={g.caption || c.seo.title} width={800} height={600} sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw" className="w-full h-auto block" />
                  {g.caption && <figcaption className="absolute bottom-0 inset-x-0 p-3 text-sm text-white bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition">{g.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Videos (hidden when empty) */}
      {on("videos") && c.videos.length > 0 && (
        <section id="videos" className="py-24 md:py-32 px-4">
          <div className="max-w-6xl mx-auto">
            <Head title={t.videos} />
            <div className="grid gap-6 md:grid-cols-2">
              {c.videos.map((v, i) => (
                <figure key={i} className="card cut overflow-hidden reveal">
                  <video src={v.url} controls playsInline preload="metadata" className="w-full h-auto max-h-[80vh] bg-black" />
                  {v.caption && <figcaption className="p-4 text-center">{v.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {on("testimonials") && c.testimonials.length > 0 && (
        <section id="testimonials" className="py-16 md:py-28 px-4 relative">
          <div className="absolute inset-0 pattern opacity-40" />
          <div className="relative max-w-7xl mx-auto">
            <Head title={t.testimonials || "آراء عملائنا"} />
            <div className="grid gap-6 md:grid-cols-3">
              {c.testimonials.map((r, i) => (
                <blockquote key={i} className="card cut p-8 reveal relative" style={{ transitionDelay: `${i * 90}ms` }}>
                  <Quote className="gold opacity-40 mb-4" size={36} />
                  <div className="flex gap-1 mb-4 gold">{[0, 1, 2, 3, 4].map((k) => <Star key={k} size={16} fill="currentColor" />)}</div>
                  <p className="leading-8 opacity-90 mb-6">{r.desc}</p>
                  <footer className="font-bold gold">{r.title}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA band */}
      {c.cta.title && (
        <section className="relative py-16 md:py-28 px-4 overflow-hidden">
          <Img src={c.cta.image || c.hero.image} alt="" sizes="100vw" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--bg) 92%, transparent), color-mix(in srgb, var(--bg) 70%, transparent))" }} />
          <div className="relative max-w-3xl mx-auto text-center reveal">
            <h2 className="fluid-h2 font-bold mb-5">{c.cta.title}</h2>
            <p className="fluid-lead opacity-85 mb-8">{c.cta.text}</p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
              <a href={wa} target="_blank" rel="noopener" className="btn"><WhatsAppIcon size={20} color="#111" />{c.hero.cta}</a>
              <a href={tel} className="btn-ghost"><Phone size={18} />{t.callNow || "اتصل الآن"}</a>
            </div>
          </div>
        </section>
      )}

      <section id="contact" className="py-16 md:py-24 px-4 text-center scroll-mt-24" style={{ background: "var(--surface)" }}>
        <Head title={t.contact} />
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 reveal">
          <a href={tel} className="btn"><Phone size={18} /><span dir="ltr">{c.contact.phone}</span></a>
          <a href={wa} target="_blank" rel="noopener" className="btn-ghost"><WhatsAppIcon size={18} color="var(--primary)" />واتساب</a>
          <a href="/contact" className="btn-ghost">صفحة التواصل<ArrowLeft size={18} /></a>
        </div>
      </section>
    </Shell>
  );
}
