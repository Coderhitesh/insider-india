'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Progress from '@/components/ui/Progress';
import Button from '@/components/ui/Button';

export function FunnelShell({ stepKey, stepNumber, total, progressLabel, title, description, children }) {
  const reduce = useReducedMotion();
  return (
    <div className="container-x max-w-3xl pb-10 pt-8 sm:pt-12">
      {total ? <Progress value={stepNumber} total={total} label={progressLabel} /> : null}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stepKey}
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
          transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
          className="mt-10 sm:mt-14"
        >
          <h1 className="text-d3 sm:text-d2" tabIndex={-1} id="step-title">{title}</h1>
          {description && <p className="mt-3 max-w-xl text-lg text-graphite">{description}</p>}
          <div className="mt-8 sm:mt-10">{children}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Sticky on mobile so the primary action is always reachable.
export function StepFooter({ onBack, continueLabel = 'Continue', loading, disabled, children }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-10 flex items-center gap-3 border-t-2 border-wine bg-paper/95 px-5 py-4 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      {onBack && (
        <Button type="button" variant="ghost" onClick={onBack} className="shrink-0">
          <ArrowLeft className="size-4" />Back
        </Button>
      )}
      {children}
      <Button type="submit" size="lg" loading={loading} disabled={disabled} className="ml-auto min-w-40 flex-1 sm:flex-none">{continueLabel}</Button>
    </div>
  );
}
