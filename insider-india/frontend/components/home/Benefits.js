import { Section, SectionHeading } from '@/components/ui/Section';
import { BENEFITS } from '@/lib/content';

export default function Benefits() {
  return (
    <Section labelledBy="why-title">
      <SectionHeading id="why-title" title="Why INSIDER INDIA LLP" intro="The way we work is designed to remove surprises between the first conversation and handover." />
      <dl className="grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((b) => (
          <div key={b.title} className="border-t-2 border-wine py-6">
            <dt className="flex items-center gap-3 text-lg font-bold"><span aria-hidden="true" className="size-2.5 bg-wine" />{b.title}</dt>
            <dd className="mt-2 text-graphite">{b.body}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
