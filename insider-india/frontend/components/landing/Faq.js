import { Plus } from 'lucide-react';
import JsonLd from '@/components/ui/JsonLd';
import { faqLd } from '@/lib/seo';
import { Eyebrow } from './media';

export default function Faq({ items = [] }) {
  // console.log("items",items)
  if (!items.length) return null;
  return (
    <section aria-labelledby="faq-title" className="bg-[#fdf8f7] py-14 sm:py-16">
      <div className="container-x grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Eyebrow>Good to know</Eyebrow>
          <h2 id="faq-title" className="mt-2 text-[clamp(1.7rem,2.6vw,2.2rem)] leading-tight">Questions, answered</h2>
        </div>
        <div className="space-y-3 lg:col-span-8">
          {items.slice(0, 6).map((f) => (
            <details key={f.id} className="soft-card group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-medium hover:text-wine [&::-webkit-details-marker]:hidden">
                {f.question}
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blush text-wine"><Plus className="size-3.5 transition-transform duration-300 group-open:rotate-45" aria-hidden="true" /></span>
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm text-graphite">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
      <JsonLd data={faqLd(items)} />
    </section>
  );
}
