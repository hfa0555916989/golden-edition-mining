import type { Metadata } from "next";
import { getContent } from "../../lib/store";
import { pageMeta, crumbsLd, ld } from "../../lib/seo";
import Shell, { PageHero } from "../../components/Shell";
import ServiceBands from "../../components/ServiceBands";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  return pageMeta(c, { path: "/services", title: `${c.titles.services || "خدماتنا"} | ${c.hero.badge}`, desc: `خدمات ${c.hero.badge}: ${c.services.map((s) => s.title).join("، ")}.` });
}
export default async function ServicesPage() {
  const c = await getContent();
  const crumbs: [string, string][] = [["الرئيسية", "/"], [c.titles.services || "خدماتنا", "/services"]];
  return (
    <Shell c={c}>
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(crumbsLd(crumbs))} />
      <PageHero title={c.titles.services || "خدماتنا"} subtitle={c.hero.subtitle} image={c.services[0]?.image || c.hero.image} crumbs={crumbs} />
      <ServiceBands c={c} />
    </Shell>
  );
}
