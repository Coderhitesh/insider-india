import { UserPlus, Send, ShieldCheck, Ruler, FileSignature, Wallet, Gift } from 'lucide-react';
import PageHeader from '@/components/pages/PageHeader';
import Button from '@/components/ui/Button';
import { Arrow } from '@/components/landing/media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { getReferralProgram } from '@/lib/server-api';
import { IMAGES } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { formatINR } from '@/lib/format';

export const revalidate = 60;
export const metadata = pageMetadata({ title: 'Refer & Earn', description: 'Refer friends and family for interior design, renovation or modular kitchens and earn a reward when their project is confirmed.', path: '/refer-and-earn' });

const STEPS = [
  { icon: UserPlus, title: 'Join', body: 'Log in with your mobile number and get your Referral ID in seconds.' },
  { icon: Send, title: 'Refer', body: 'Share your link, or submit your friend’s name and number with their permission.' },
  { icon: ShieldCheck, title: 'We verify', body: 'We check the referral is genuine and new to us, then call them.' },
  { icon: Ruler, title: 'Consultation & site visit', body: 'Our expert meets them, measures the home and prepares a quotation.' },
  { icon: FileSignature, title: 'Project confirmed', body: 'They accept the quotation and pay the qualifying advance.' },
  { icon: Wallet, title: 'Credit in your wallet', body: 'Your reward is added to your wallet as credit. Use it on your own next project — it’s deducted from the amount, you pay the rest.' },
];
const ORDINAL = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];

export default async function ReferPage() {
  const p = await getReferralProgram();
  const on = Boolean(p?.enabled);
  const levels = p ? Math.max(...p.slabs.map((s) => s.rewards.length)) : 0;
  const top = p ? Math.max(...p.slabs.flatMap((s) => s.rewards)) : 0;
  return (
    <>
      <PageHeader eyebrow="Refer & Earn" title={<>Refer a friend, <span className="text-wine">earn up to {top ? formatINR(top) : 'a reward'} credit</span></>}
        lede="Know someone planning their interiors? Introduce them to us. When their project is confirmed, you earn credit for your own next project with us — and every next referral earns more."
        crumbs={[{ name: 'Refer & Earn', path: '/refer-and-earn' }]} image={IMAGES.hero} imageAlt="Living room designed by INSIDER INDIA LLP">
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {on ? <Button href="/account/referrals" size="lg" className="h-13 px-7">Join & start referring <Arrow /></Button>
            : <span className="rounded-lg bg-blush px-5 py-3 text-sm font-medium text-wine">Launching soon — check back shortly.</span>}
        </div>
      </PageHeader>

      <Section labelledBy="how-title">
        <SectionHeading id="how-title" eyebrow="How it works" title="Six simple steps" />
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="soft-card p-6">
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-full bg-blush"><Icon className="size-5 text-wine" aria-hidden="true" /></span>
                <span className="text-3xl font-semibold text-wine/20">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="ui-title mt-4 text-lg">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-graphite">{body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {p && (
        <Section tone="soft" labelledBy="rewards-title">
          <SectionHeading id="rewards-title" eyebrow="Rewards" title="The more you refer, the more you earn" intro={`Wallet credit per successful referral, based on the final project value${p.valueBasis === 'EXCL_GST' ? ' (excluding GST)' : ''}. Each successful referral moves you to the next level.`} />
          <div className="soft-card overflow-x-auto p-2 sm:p-4">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Reward by referral level and project value</caption>
              <thead>
                <tr className="border-b-2 border-wine">
                  <th scope="col" className="py-3 pr-4 font-medium text-graphite">Referral</th>
                  {p.slabs.map((s) => <th key={s.key} scope="col" className="py-3 pr-4 font-display text-lg font-normal">Project {s.label.charAt(0).toLowerCase() + s.label.slice(1)}</th>)}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: levels }, (_, i) => (
                  <tr key={i} className="border-b border-stone last:border-0">
                    <th scope="row" className="py-3.5 pr-4 font-medium">{ORDINAL[i] || `#${i + 1}`} successful referral{i === levels - 1 && p.afterLastLevel === 'REPEAT_LAST' ? ' & after' : ''}</th>
                    {p.slabs.map((s) => <td key={s.key} className="price py-3.5 pr-4 text-[1.05rem] text-wine">{formatINR(s.rewards[i] ?? s.rewards[s.rewards.length - 1])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-graphite"><Gift className="size-4 text-wine" aria-hidden="true" />Rewards are wallet credit, not cash — use them against your own next project and pay only the balance{p.countingPeriod === 'FINANCIAL_YEAR' ? '. Levels reset every financial year (April–March).' : p.countingPeriod === 'CALENDAR_YEAR' ? '. Levels reset every calendar year.' : '.'}</p>
        </Section>
      )}

      {p?.terms && (
        <Section labelledBy="terms-title">
          <SectionHeading id="terms-title" eyebrow="Terms" title="Programme terms" />
          <ol className="soft-card max-w-4xl list-decimal space-y-2.5 p-6 pl-10 text-sm leading-relaxed text-graphite sm:p-8 sm:pl-12">
            {p.terms.split('\n').filter((t) => t.trim()).map((t) => <li key={t}>{t}</li>)}
          </ol>
          {on && <Button href="/account/referrals" size="lg" className="mt-8 h-13 px-7">Join & start referring <Arrow /></Button>}
        </Section>
      )}
    </>
  );
}
