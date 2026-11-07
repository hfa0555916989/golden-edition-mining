import type { Service, ServiceCategory } from "./types";

const MINING_HINT = /mining|quarry|geolog|mineral|explor|تعدين|تنقيب|جيولوج|محجر|معادن|استكشاف/;

export function inferCategory(s: { slug?: string; title?: string; category?: string }): ServiceCategory {
  if (s.category === "mining" || s.category === "contracting") return s.category;
  return MINING_HINT.test(`${s.slug || ""} ${s.title || ""}`) ? "mining" : "contracting";
}

const extra = (slug: string, title: string, desc: string, image: string, points: string[], images: string[], seoTitle: string, seoDesc: string): Service => ({
  slug, title, desc, image, points: points.join("\n"), images, highlight: "", seoTitle, seoDesc, ogImage: "", category: "mining",
});

/** Added when a saved site still has only the original single mining card. */
export const EXTRA_MINING: Service[] = [
  extra(
    "mineral-exploration",
    "التنقيب عن المعادن",
    "أعمال التنقيب والاستكشاف عن الخامات المعدنية بمختلف أنواعها، من المسح الميداني حتى تجهيز مواقع الاستخراج.",
    "/images/aerial.webp",
    ["المسح والاستكشاف الميداني", "التنقيب عن الخامات المعدنية بمختلف أنواعها", "تجهيز مواقع الاستخراج والمحاجر", "تشغيل المعدات الثقيلة في مواقع التعدين"],
    ["/images/aerial.webp", "/images/quarry.webp", "/images/excavator.webp", "/images/loader.webp"],
    "التنقيب عن المعادن واستكشاف الخامات | الإصدار الذهبي",
    "التنقيب والاستكشاف عن الخامات المعدنية في السعودية: مسح ميداني، تجهيز مواقع الاستخراج، وتشغيل المعدات الثقيلة.",
  ),
  extra(
    "mining-licenses",
    "رخص التعدين والدراسات",
    "دراسات جيولوجية وبيئية ومتابعة إجراءات وزارة الثروة المعدنية لاستخراج رخص الكشف والاستغلال والاستطلاع.",
    "/images/geology.webp",
    ["الدراسات الجيولوجية", "الدراسات البيئية", "رخص الكشف", "رخص الاستغلال والاستطلاع", "استشارات جيولوجية وبيئية"],
    ["/images/geology.webp", "/images/aerial.webp", "/images/quarry.webp", "/images/site.webp"],
    "رخص التعدين والدراسات الجيولوجية | الإصدار الذهبي",
    "دراسات جيولوجية وبيئية ومتابعة رخص الكشف والاستغلال والاستطلاع لدى وزارة الثروة المعدنية.",
  ),
];

export function normalizeServices(raw: Partial<Service>[]): Service[] {
  const legacy = raw.length > 0 && raw.every((s) => s.category !== "mining" && s.category !== "contracting");
  const list: Service[] = raw.map((s, i) => ({
    slug: s.slug || `service-${i + 1}`,
    title: s.title || "",
    desc: s.desc || "",
    image: s.image || "",
    points: s.points || "",
    images: Array.isArray(s.images) ? s.images : [],
    highlight: s.highlight || "",
    seoTitle: s.seoTitle || "",
    seoDesc: s.seoDesc || "",
    ogImage: s.ogImage || "",
    category: inferCategory(s),
  }));
  if (!legacy) return list;
  const have = new Set(list.map((s) => s.slug));
  if (list.filter((s) => s.category === "mining").length < 2) {
    for (const extraService of EXTRA_MINING) if (!have.has(extraService.slug)) list.push({ ...extraService });
  }
  return list;
}

export const byCategory = (services: Service[], category: ServiceCategory) => services.filter((s) => inferCategory(s) === category);
