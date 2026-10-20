import { FileText, Ruler, Gem, UserRoundCheck, ShieldCheck, HardHat } from 'lucide-react';
import { Eyebrow } from './media';

const ITEMS = [
  { icon: FileText, title: 'Transparent quotation', body: 'Clear, detailed and item-by-item pricing.' },
  { icon: Ruler, title: 'Expert site measurements', body: 'Accurate measurements for a perfect fit.' },
  { icon: Gem, title: 'Premium materials', body: 'Quality brands and long-lasting finishes.' },
  { icon: UserRoundCheck, title: 'Dedicated project manager', body: 'One point of contact from start to finish.' },
  { icon: ShieldCheck, title: 'Warranty protection', body: 'Coverage as per your chosen package.' },
  { icon: HardHat, title: 'Verified contractors', body: 'Trained and trusted execution partners.' },
];

export default function WhyUs({ companyName = 'INSIDER INDIA LLP' }) {
  return (
    <section aria-labelledby="why-title" className="bg-[#fdf8f7] py-14 sm:py-16">
      <div className="container-x grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Eyebrow>Our advantages</Eyebrow>
          <h2 id="why-title" className="mt-2 text-[clamp(1.9rem,3.2vw,2.6rem)] leading-[1.08]">
            Why choose <span className="ui-title block text-[0.86em] font-bold uppercase tracking-tight">{companyName}</span>
          </h2>
        </div>
        <div className="lg:col-span-8">
          <p className="mb-7 max-w-md text-sm text-graphite">The way we work is designed to remove surprises between the first conversation and the final handover.</p>
          <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
            {ITEMS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-stone bg-paper">
                  <Icon className="size-5 text-wine" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="ui-title text-[0.9rem]">{title}</h3>
                  <p className="mt-0.5 text-[0.8rem] text-graphite">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
