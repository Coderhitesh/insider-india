'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function HeroSlider({ slides, interval = 4000, className = '', priority = false }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), interval);
    return () => clearInterval(t);
  }, [slides.length, interval]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {slides.map((s, n) => (
        <Image
          key={n}
          src={s.src}
          alt={s.alt}
          fill
          priority={priority && n === 0}
          quality={90}
          sizes="(min-width:1024px) 54vw, 100vw"
          className={`object-cover transition-opacity duration-1000 ${n === i ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
    </div>
  );
}