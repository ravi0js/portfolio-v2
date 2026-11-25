import type React from 'react';
import { useAnimateWhenVisible, useStepper } from './useAnimateWhenVisible';

interface Props {
  caption: string;
  stages: { label: string; detail: string }[];
}

/** CI/CD stages ticking through to green. Final state is "all passed". */
export default function Pipeline({ caption, stages }: Props) {
  const { ref, inView, animate } = useAnimateWhenVisible<HTMLDivElement>(0.4);
  const ticking = useStepper(animate && inView, stages.length, 650);
  const done = ticking ?? stages.length;

  const allPassed = done >= stages.length;

  return (
    <figure ref={ref}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-mono text-micro text-subtle">{caption}</p>
        <span
          className={[
            'shrink-0 rounded-full px-2 py-0.5 font-mono text-micro whitespace-nowrap transition-colors',
            allPassed ? 'bg-accent/15 text-accent' : 'bg-warn/15 text-warn',
          ].join(' ')}
          aria-live="polite"
        >
          {allPassed ? '✓ passed' : '● running'}
        </span>
      </div>
      <ol
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]"
        style={{ '--n': stages.length } as React.CSSProperties}
      >
        {stages.map((s, i) => {
          const state = i < done ? 'done' : i === done ? 'running' : 'queued';
          return (
            <li
              key={s.label}
              className={[
                'rounded-md border p-3 transition-colors duration-300',
                state === 'done'
                  ? 'border-accent/40 bg-accent/5'
                  : state === 'running'
                    ? 'border-warn/50'
                    : 'border-line',
              ].join(' ')}
            >
              <p className="flex items-center gap-1.5 font-mono text-micro text-subtle">
                <span
                  className={[
                    'grid size-4 place-items-center rounded-full text-[0.55rem]',
                    state === 'done'
                      ? 'bg-accent text-accent-fg'
                      : state === 'running'
                        ? 'animate-pulse bg-warn text-bg'
                        : 'bg-line',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {state === 'done' ? '✓' : ''}
                </span>
                step {i + 1}
              </p>
              <p className="mt-2 text-[0.8rem] leading-snug font-medium">{s.label}</p>
              <p className="mt-0.5 text-micro leading-snug text-muted">{s.detail}</p>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
