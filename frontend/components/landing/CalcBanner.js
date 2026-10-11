import Image from 'next/image';
import Link from 'next/link';
import { Calculator } from 'lucide-react';
import { HOME_IMG, Arrow } from './media';

export default function CalcBanner() {
  return (
    <section aria-labelledby="calc-title" className="container-x py-6">
      <div className="red-panel relative grid overflow-hidden rounded-2xl text-paper md:grid-cols-[1fr_auto]">
        <div className="relative z-10 flex flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center sm:px-10 lg:gap-8">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 sm:size-20">
            <Calculator className="size-8 sm:size-9" strokeWidth={1.3} aria-hidden="true" />
          </span>
          <div className="flex-1">
            <h2 id="calc-title" className="text-[clamp(1.6rem,2.6vw,2.2rem)] leading-tight">Calculate my interior budget</h2>
            <p className="mt-1 text-sm text-paper/85">Get an instant estimate range for your home. It&rsquo;s quick, easy and free.</p>
          </div>
          <Link href="/estimate" className="btn inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start bg-paper px-6 text-sm font-semibold text-wine transition-colors hover:bg-blush sm:self-center">
            Start the calculator <Arrow className="size-3.5" />
          </Link>
        </div>
        <div className="relative hidden w-[300px] md:block lg:w-[380px]">
          <Image src={HOME_IMG.calc} alt="" fill sizes="380px" className="object-cover" />
          <svg aria-hidden="true" viewBox="0 0 100 200" preserveAspectRatio="none" className="absolute inset-y-0 -left-px h-full w-20 text-[#a50c25]">
            <path fill="currentColor" d="M0 0h70c-40 40-40 70-10 100s30 70-10 100H0z" />
          </svg>
        </div>
      </div>
    </section>
  );
}
