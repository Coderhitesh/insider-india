import { Section, SectionHeading } from '@/components/ui/Section';
import { PROCESS } from '@/lib/content';

// The process laid out along a measuring tape: numbered because it is a real sequence.
export default function HowItWorks({ compact = false }) {
  return (
    <Section tone="blush" labelledBy="process-title">
      <SectionHeading id="process-title" title="How it works" intro="Your estimate is for planning. Your quotation is built from your home's actual measurements." />
      <div className="relative">
        <div aria-hidden="true" className="ruler absolute inset-x-0 top-0 hidden h-3.5 text-wine/60 lg:block" />
        <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:pt-8">
          {PROCESS.map((p, i) => (
            <li key={p.title} className="relative border-l-2 border-wine pl-5">
              <span className="tabular font-display text-4xl text-wine">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 font-sans text-lg font-bold tracking-normal [font-stretch:100%]">{p.title}</h3>
              {!compact && <p className="mt-2 text-graphite">{p.body}</p>}
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
