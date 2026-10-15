import Link from 'next/link';
import Image from 'next/image';
import Swatch from '@/components/ui/Swatch';
import { PROJECT_CATEGORIES } from '@/lib/content';
import { ArrowCircle } from '@/components/landing/media';

const catLabel = (v) => PROJECT_CATEGORIES.find((c) => c.value === v)?.label || '';

export default function ProjectCard({ project, priority = false }) {
  const meta = [catLabel(project.category), project.bhk, project.city].filter(Boolean).join(' · ');
  return (
    <Link href={`/project/${project.slug}`} className="soft-card group block p-2.5 transition-shadow hover:shadow-[0_14px_34px_-14px_rgb(154_12_34/.3)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-blush">
        {project.coverImage
          ? <Image src={project.coverImage} alt={project.title} fill priority={priority} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
          : <Swatch tone="sand" className="absolute inset-0" />}
      </div>
      <div className="flex items-end justify-between gap-3 px-2 pb-2 pt-3">
        <div>
          <h3 className="ui-title text-[1.02rem] group-hover:text-wine">{project.title}</h3>
          {meta && <p className="mt-0.5 text-xs text-graphite">{meta}</p>}
        </div>
        <ArrowCircle />
      </div>
    </Link>
  );
}
