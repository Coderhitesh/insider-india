import PageHeader from './PageHeader';
import { Section } from '@/components/ui/Section';

export default function LegalPage({ title, path, custom, children }) {
  return (
    <>
      <PageHeader title={title} crumbs={[{ name: title, path }]} />
      <Section>
        <div className="measure space-y-5 text-[1.05rem] [&_h2]:mt-10 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-normal [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {custom ? <div className="whitespace-pre-line">{custom}</div> : children}
        </div>
      </Section>
    </>
  );
}
