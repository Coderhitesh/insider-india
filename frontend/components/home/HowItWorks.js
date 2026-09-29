import { Section, SectionHeading } from '@/components/ui/Section';
import { PROCESS } from '@/lib/content';

export default function HowItWorks({ compact = false }) {
  return (
    <Section tone="paper" labelledBy="process-title">
      <SectionHeading id="process-title" title="How it works" intro="Your estimate is for planning. Your quotation is built from your home's actual measurements." />
      <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {PROCESS.map((p, i) => (
          <li key={p.title} className="border-t border-charcoal pt-5">
            <span className="tabular font-display text-4xl text-wine">{i + 1}</span>
            <h3 className="mt-3 font-sans text-lg font-semibold tracking-normal">{p.title}</h3>
            {!compact && <p className="mt-2 text-graphite">{p.body}</p>}
          </li>
        ))}
      </ol>
    </Section>
  );
}
