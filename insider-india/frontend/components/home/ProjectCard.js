import Link from 'next/link';
import Image from 'next/image';
import Swatch from '@/components/ui/Swatch';
import { PROJECT_CATEGORIES } from '@/lib/content';

const catLabel = (v) => PROJECT_CATEGORIES.find((c) => c.value === v)?.label || '';

export default function ProjectCard({ project, priority = false }) {
  const meta = [catLabel(project.category), project.bhk, project.city].filter(Boolean).join(', ');
  return (
    <Link href={`/project/${project.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden border-2 border-transparent bg-blush transition-colors group-hover:border-wine">
        {project.coverImage
          ? <Image src={project.coverImage} alt={project.title} fill priority={priority} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          : <Swatch tone="sand" className="absolute inset-0" />}
      </div>
      <h3 className="mt-4 font-sans text-lg font-bold tracking-normal [font-stretch:100%] group-hover:text-wine">{project.title}</h3>
      {meta && <p className="text-sm text-graphite">{meta}</p>}
    </Link>
  );
}
