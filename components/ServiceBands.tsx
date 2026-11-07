import type { Content } from "../lib/types";
import { byCategory } from "../lib/services";
import ServiceCards from "./ServiceCards";

export default function ServiceBands({ c }: { c: Content }) {
  const t = c.titles;
  const bands = [
    {
      id: "mining",
      tone: "mining",
      eyebrow: "مجال التعدين",
      title: t.mining || "التعدين",
      intro: t.miningIntro || "تنقيب عن المعادن، دراسات جيولوجية وبيئية، ومتابعة رخص الكشف والاستغلال والاستطلاع.",
      items: byCategory(c.services, "mining"),
    },
    {
      id: "contracting",
      tone: "contracting",
      eyebrow: "المقاولات العامة",
      title: t.contracting || "المقاولات",
      intro: t.contractingIntro || "مقاولات عامة وإنشاءات وبنية تحتية، مع تأجير المعدات الثقيلة وتوفير العمالة المدربة.",
      items: byCategory(c.services, "contracting"),
    },
  ] as const;
  return (
    <>
      {bands.filter((b) => b.items.length > 0).map((b) => (
        <section key={b.id} id={b.id} className={`service-band service-band-${b.tone} scroll-mt-24 py-16 md:py-24 px-4`}>
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14 reveal">
              <span className="eyebrow">{b.eyebrow}</span>
              <h2 className="fluid-h2 font-bold mt-3 mb-4 gold-grad">{b.title}</h2>
              <p className="fluid-lead opacity-85">{b.intro}</p>
            </div>
            <ServiceCards items={b.items} />
          </div>
        </section>
      ))}
    </>
  );
}
