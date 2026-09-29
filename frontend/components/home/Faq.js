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
        <div className="divide-y divide-stone border-y border-stone lg:col-span-8">
          {items.map((f) => (
            <details key={f.id} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-medium [&::-webkit-details-marker]:hidden">
                {f.question}
                <Plus className="mt-1 size-5 shrink-0 transition-transform duration-300 group-open:rotate-45" aria-hidden="true" />
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
