import { Plus } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Section';
import JsonLd from '@/components/ui/JsonLd';
import { faqLd } from '@/lib/seo';

export default function Faq({ items, title = 'Questions, answered' }) {
  if (!items.length) return null;
  return (
    <Section labelledBy="faq-title">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4"><SectionHeading id="faq-title" title={title} className="!mb-0 lg:!grid-cols-1" /></div>
        <div className="divide-y divide-stone-deep border-y-2 border-wine lg:col-span-8">
          {items.map((f) => (
            <details key={f.id} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold hover:text-wine [&::-webkit-details-marker]:hidden">
                {f.question}
                <span className="flex size-7 shrink-0 items-center justify-center bg-wine text-paper"><Plus className="size-4 transition-transform duration-300 group-open:rotate-45" aria-hidden="true" /></span>
              </summary>
              <p className="measure mt-3 whitespace-pre-line text-graphite">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
      <JsonLd data={faqLd(items)} />
    </Section>
  );
}
