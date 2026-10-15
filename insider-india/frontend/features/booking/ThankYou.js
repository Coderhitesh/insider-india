import { CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import BudgetCard from '@/components/ui/BudgetCard';

export default function ThankYou({ booking, budget }) {
  const l = booking.labels || {};
  const fp = booking.floorPlan || {};
  const rows = [
    ['Booking ID', booking.bookingNumber],
    ['Name', booking.customerName],
    ['Property location', [booking.address?.formattedAddress, booking.address?.pincode].filter(Boolean).join(', ')],
    ['Requirement', l.requirementType],
    ['Property type', l.propertyType],
    ['Configuration', l.bhk],
    ['Services', booking.services?.join(', ')],
    ['Possession', l.possession],
    ['Floor plan', fp.hasFloorPlan ? `${fp.files} file${fp.files === 1 ? '' : 's'} uploaded` : fp.measurementAssistance?.opted ? 'Expert measurement assistance requested' : 'Not provided'],
  ].filter(([, v]) => v);

  return (
    <div className="hero-wash">
    <div className="container-x max-w-3xl py-14 sm:py-20">
      <span className="flex size-16 items-center justify-center rounded-full bg-wine text-paper ring-8 ring-blush"><CheckCircle2 className="size-8" strokeWidth={1.8} aria-hidden="true" /></span>
      <h1 className="mt-7 text-[clamp(2rem,4vw,3rem)] leading-[1.06]" tabIndex={-1}>Thank you! Your interior consultation request has been received.</h1>
      <p className="mt-4 text-lg text-graphite">Our team will review your request and assign an expert. We will contact you on WhatsApp to schedule your site visit.</p>
      {budget && <div className="mt-10"><BudgetCard budget={budget} title="Your approximate interior budget" showPackages /></div>}
      <dl className="soft-card mt-10 divide-y divide-stone px-5">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-3.5 sm:grid-cols-3">
            <dt className="text-graphite">{k}</dt>
            <dd className={k === 'Booking ID' ? 'tabular font-semibold sm:col-span-2' : 'sm:col-span-2'}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button href="/account/dashboard" size="lg" className="h-13 px-7">Go to dashboard →</Button>
        <Button href="/projects" size="lg" variant="secondary" className="h-13 border-[1.5px] bg-paper px-7">Explore our projects</Button>
      </div>
    </div>
    </div>
  );
}
