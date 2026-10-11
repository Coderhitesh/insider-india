import { ClipboardList, Calculator, MapPinned, Ruler, FileText, BadgeCheck, Hammer, KeyRound } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Section';
import { PROCESS } from '@/lib/content';

const ICONS = [ClipboardList, Calculator, MapPinned, Ruler, FileText, BadgeCheck, Hammer, KeyRound];

// The full 8-step process as soft cards with icon medallions.
export default function HowItWorks({ compact = false }) {
  return (
    <Section tone="soft" labelledBy="process-title">
      <SectionHeading id="process-title" eyebrow="Our process" title="Eight clear steps" intro="Your estimate is for planning. Your quotation is built from your home's actual measurements." />
      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PROCESS.map((p, i) => {
          const Icon = ICONS[i] || ClipboardList;
          return (
            <li key={p.title} className="soft-card relative p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-14 items-center justify-center rounded-full bg-blush ring-8 ring-blush/40"><Icon className="size-6 text-wine" strokeWidth={1.4} aria-hidden="true" /></span>
                <span className="text-3xl font-semibold text-wine/20">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="ui-title mt-5 text-[1.02rem]">{p.title}</h3>
              {!compact && <p className="mt-1.5 text-sm leading-relaxed text-graphite">{p.body}</p>}
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
