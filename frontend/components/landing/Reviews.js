import Image from 'next/image';
import Link from 'next/link';
import { Star, Quote } from 'lucide-react';
import ConsultationForm from '@/components/home/ConsultationForm';
import { HOME_IMG, Eyebrow, Arrow } from './media';

function Review({ t }) {
  const initials = t.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <figure className="soft-card flex h-full flex-col p-5">
      <Quote className="size-6 fill-wine text-wine" aria-hidden="true" />
      <blockquote className="mt-2 flex-1 text-[0.85rem] leading-relaxed text-graphite">{t.quote}</blockquote>
      {t.rating > 0 && (
        <p className="mt-3 flex gap-0.5" aria-label={`${t.rating} out of 5`}>
          {Array.from({ length: 5 }, (_, i) => <Star key={i} aria-hidden="true" className={`size-3.5 ${i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-deep'}`} />)}
        </p>
      )}
      <figcaption className="mt-4 flex items-center gap-3">
        {t.photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={t.photo} alt="" className="size-10 rounded-full object-cover" />
          : <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-blush text-sm font-semibold text-wine">{initials}</span>}
        <span>
          <span className="block text-sm font-semibold">{t.name}</span>
          {t.city && <span className="block text-xs text-graphite">{t.city}</span>}
        </span>
      </figcaption>
    </figure>
  );
}

// Published testimonials from Admin (never invented), beside the consultation card.
export default function Reviews({ items = [] }) {
  const two = items.slice(0, 2);
  return (
    <section aria-labelledby="reviews-title" className="py-14 sm:py-16">
      <div className="container-x grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>{two.length ? 'What our clients say' : 'Your home, our care'}</Eyebrow>
              <h2 id="reviews-title" className="mt-2 text-[clamp(1.7rem,2.6vw,2.2rem)] leading-tight">{two.length ? 'Happy homes, happier people' : 'Measured on site, priced item by item'}</h2>
            </div>
            {two.length > 0 && <Link href="/projects" className="inline-flex items-center gap-1.5 border-b border-wine pb-0.5 text-sm font-medium text-wine">View our work <Arrow className="size-3.5" /></Link>}
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
            {two[0] ? <Review t={two[0]} /> : (
              <div className="soft-card flex flex-col justify-center p-5 text-sm text-graphite">
                <p>Every quotation is built from measurements taken at your home, reviewed by our team, and shared in your dashboard — room by room, item by item.</p>
                <Link href="/how-it-works" className="mt-4 inline-flex items-center gap-1.5 font-medium text-wine">See how it works <Arrow className="size-3.5" /></Link>
              </div>
            )}
            <div className="relative min-h-48 overflow-hidden rounded-xl">
              <Image src={HOME_IMG.review} alt="" fill sizes="(min-width:768px) 22vw, 92vw" className="object-cover" />
            </div>
            {two[1] ? <Review t={two[1]} /> : (
              <div className="soft-card flex flex-col justify-center p-5 text-sm text-graphite">
                <p>Prefer to start with numbers? Get an indicative range for your home in a few minutes.</p>
                <Link href="/estimate" className="mt-4 inline-flex items-center gap-1.5 font-medium text-wine">Get free estimate <Arrow className="size-3.5" /></Link>
              </div>
            )}
          </div>
        </div>
        <aside aria-labelledby="talk-title" className="rounded-xl border-2 border-wine/70 bg-paper p-6 lg:col-span-4 lg:self-start">
          <h2 id="talk-title" className="text-[1.75rem] leading-tight">Talk to a designer</h2>
          <p className="mb-5 mt-1.5 text-sm text-graphite">Tell us about your space and get expert guidance from our design team.</p>
          <ConsultationForm id="home-talk" variant="card" />
        </aside>
      </div>
    </section>
  );
}
