'use client';

import Button from '@/components/ui/Button';

export default function Error({ reset }) {
  return (
    <div className="container-x min-h-[60vh] py-20">
      <h1 className="text-d2">This page didn&apos;t load</h1>
      <p className="mt-4 max-w-md text-lg text-graphite">Something went wrong on our side. Your saved progress is safe. Try again, or come back in a few minutes.</p>
      <div className="mt-8 flex gap-3">
        <Button onClick={() => reset()} size="lg">Try again</Button>
        <Button href="/" size="lg" variant="secondary">Go to home page</Button>
      </div>
    </div>
  );
}
