'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Progress from '@/components/ui/Progress';
import Button from '@/components/ui/Button';

export function FunnelShell({ stepKey, stepNumber, total, progressLabel, title, description, children }) {
  const reduce = useReducedMotion();
  return (
    <div className="hero-wash">
    <div className="container-x max-w-3xl pb-14 pt-8 sm:pt-12">
      {total ? <Progress value={stepNumber} total={total} label={progressLabel} /> : null}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stepKey}
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
          transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
          className="soft-card mt-6 p-5 sm:mt-8 sm:p-10"
        >
          <h1 className="text-[clamp(1.8rem,3.6vw,2.7rem)] leading-[1.08]" tabIndex={-1} id="step-title">{title}</h1>
          {description && <p className="mt-3 max-w-xl text-[1.02rem] text-graphite">{description}</p>}
          <div className="mt-7 sm:mt-9">{children}</div>
        </motion.div>
      </AnimatePresence>
    </div>
    </div>
  );
}

// Sticky on mobile so the primary action is always reachable.
export function StepFooter({ onBack, continueLabel = 'Continue', loading, disabled, children }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-10 flex items-center gap-3 border-t border-stone bg-paper/95 px-5 py-4 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
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
