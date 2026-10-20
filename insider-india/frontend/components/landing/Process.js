import { ClipboardList, Calculator, MapPinned, PencilRuler, Hammer, ChevronRight } from 'lucide-react';
import { LandingHeading } from './media';

const STEPS = [
  { icon: ClipboardList, title: 'Tell us your requirements', body: 'Share your ideas, budget and preferences.' },
  { icon: Calculator, title: 'Get an indicative estimate', body: 'See a ballpark range based on your needs.' },
  { icon: MapPinned, title: 'Book a site visit', body: 'Our expert visits and measures your home.' },
  { icon: PencilRuler, title: 'Design & quotation', body: 'A room-by-room quotation, reviewed by our team.' },
  { icon: Hammer, title: 'Approve & we build', body: 'Once you approve, we start execution and handover.' },
];

export default function Process() {
  return (
    <section aria-labelledby="process-title" className="py-14 sm:py-16">
      <div className="container-x">
        <LandingHeading id="process-title" eyebrow="Our process" title="How it works"
          intro="Your dream space, designed in a simple and transparent process — from understanding your needs to final handover."
          link={{ href: '/how-it-works', label: 'View detailed process' }} />
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="relative flex gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-blush ring-8 ring-blush/40">
                <Icon className="size-7 text-wine" strokeWidth={1.4} aria-hidden="true" />
              </span>
              <div className="pr-4">
                <p className="text-xl font-semibold text-wine">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="ui-title mt-0.5 text-[0.9rem]">{title}</h3>
                <p className="mt-1 text-[0.8rem] leading-snug text-graphite">{body}</p>
              </div>
              {i < STEPS.length - 1 && <ChevronRight aria-hidden="true" className="absolute right-0 top-6 hidden size-4 text-mist lg:block" />}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
