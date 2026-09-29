import { Section, SectionHeading } from '@/components/ui/Section';

export default function Testimonials({ items }) {
  if (!items.length) return null;
  return (
    <Section tone="paper" labelledBy="testimonials-title">
      <SectionHeading id="testimonials-title" title="From our clients" />
      <ul className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 6).map((t) => (
          <li key={t.id}>
            <figure className="flex h-full flex-col border-l-2 border-brass pl-6">
              <blockquote className="flex-1 font-display text-xl leading-snug">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-5 text-sm text-graphite">{t.name}{t.city ? `, ${t.city}` : ''}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  );
}
