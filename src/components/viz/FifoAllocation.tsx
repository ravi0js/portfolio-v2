import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useAnimateWhenVisible } from './useAnimateWhenVisible';

interface Props {
  caption: string;
  receipt: number;
  currency: string;
  milestones: { label: string; due: number }[];
}

const fmt = (n: number, c: string) => `${c}${n.toLocaleString('en-IN')}`;

/** Visualises FIFO allocation of one receipt across milestones, oldest first. */
export default function FifoAllocation({ caption, receipt, currency, milestones }: Props) {
  const { ref, inView, animate } = useAnimateWhenVisible<HTMLDivElement>(0.4);

  const allocations = useMemo(() => {
    let left = receipt;
    return milestones.map((m) => {
      const take = Math.min(m.due, left);
      left -= take;
      return { ...m, allocated: take, remainingReceipt: left };
    });
  }, [receipt, milestones]);

  // `step` = how many milestones have been processed. Final state by default (SSR / reduced motion).
  const [step, setStep] = useState(milestones.length);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!animate || !inView) return;
    setStep(0);
    let s = 0;
    const id = window.setInterval(() => {
      s += 1;
      setStep(s);
      if (s >= milestones.length) window.clearInterval(id);
    }, 750);
    return () => window.clearInterval(id);
  }, [animate, inView, milestones.length, run]);

  const remaining = step === 0 ? receipt : allocations[Math.min(step, allocations.length) - 1].remainingReceipt;

  return (
    <figure ref={ref} className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line bg-raised px-3 py-2.5">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-subtle">receipt to allocate</p>
          <p className="font-mono text-sm">
            <span className="text-accent">{fmt(remaining, currency)}</span>
            <span className="text-subtle"> / {fmt(receipt, currency)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-line px-2 py-1 font-mono text-[0.65rem] text-muted">
            {step >= milestones.length ? 'COMMIT' : 'FOR UPDATE'}
          </span>
          {animate && (
            <button
              type="button"
              onClick={() => setRun((r) => r + 1)}
              className="rounded-md border border-line px-2 py-1 font-mono text-[0.65rem] text-muted transition-colors hover:border-accent hover:text-fg"
            >
              replay
            </button>
          )}
        </div>
      </div>

      <ol className="space-y-3" aria-label={caption}>
        {allocations.map((m, i) => {
          const done = step > i;
          const pct = done ? (m.allocated / m.due) * 100 : 0;
          const status = !done ? 'pending' : m.allocated === m.due ? 'paid' : m.allocated > 0 ? 'partial' : 'due';
          return (
            <li key={m.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-[0.75rem]">
                <span className="font-medium">
                  <span className="mr-1.5 font-mono text-subtle">{String(i + 1).padStart(2, '0')}</span>
                  {m.label}
                </span>
                <span className="font-mono text-muted">
                  {done ? fmt(m.allocated, currency) : '—'} <span className="text-subtle">/ {fmt(m.due, currency)}</span>
                  <span
                    className={[
                      'ml-2 rounded px-1.5 py-0.5 text-[0.6rem] uppercase',
                      status === 'paid' ? 'bg-accent/15 text-accent' : status === 'partial' ? 'bg-amber-400/15 text-amber-400' : 'bg-line text-subtle',
                    ].join(' ')}
                  >
                    {status}
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <motion.div
                  className={['h-full rounded-full', status === 'partial' ? 'bg-amber-400' : 'bg-accent'].join(' ')}
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: animate ? 0.6 : 0, ease: 'easeOut' }}
                />
              </div>
            </li>
          );
        })}
      </ol>
      <figcaption className="mt-3 font-mono text-[0.7rem] text-subtle">{caption}</figcaption>
    </figure>
  );
}
