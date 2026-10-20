import PageHeader from './PageHeader';
import { Section } from '@/components/ui/Section';

export default function LegalPage({ title, path, custom, children }) {
  return (
    <>
      <PageHeader eyebrow="Legal" title={title} crumbs={[{ name: title, path }]} />
      <Section>
        <div className="soft-card mx-auto max-w-3xl space-y-5 p-6 text-[1rem] leading-relaxed text-graphite sm:p-10 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:text-charcoal [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {custom ? <div className="whitespace-pre-line">{custom}</div> : children}
        </div>
      </Section>
    </>
  );
}
