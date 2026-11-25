import { useEffect, useState } from 'react';
import { useAnimateWhenVisible } from './useAnimateWhenVisible';

interface Props {
  caption: string;
  stages: { label: string; detail: string }[];
}

/** CI/CD stages ticking through to green. Final state is "all passed". */
export default function Pipeline({ caption, stages }: Props) {
  const { ref, inView, animate } = useAnimateWhenVisible<HTMLDivElement>(0.4);
  const [done, setDone] = useState(stages.length);

  useEffect(() => {
    if (!animate || !inView) return;
    setDone(0);
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setDone(n);
      if (n >= stages.length) window.clearInterval(id);
    }, 650);
    return () => window.clearInterval(id);
  }, [animate, inView, stages.length]);

  const allPassed = done >= stages.length;

  return (
    <figure ref={ref}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-mono text-[0.7rem] text-subtle">{caption}</p>
        <span
          className={[
            'rounded-full px-2 py-0.5 font-mono text-[0.65rem] transition-colors',
            allPassed ? 'bg-accent/15 text-accent' : 'bg-amber-400/15 text-amber-400',
          ].join(' ')}
          aria-live="polite"
        >
          {allPassed ? '✓ passed' : '● running'}
        </span>
      </div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stages.map((s, i) => {
          const state = i < done ? 'done' : i === done ? 'running' : 'queued';
          return (
            <li
              key={s.label}
              className={[
                'rounded-[10px] border p-3 transition-colors duration-300',
                state === 'done' ? 'border-accent/40 bg-accent/5' : state === 'running' ? 'border-amber-400/50' : 'border-line',
              ].join(' ')}
            >
              <p className="flex items-center gap-1.5 font-mono text-[0.65rem] text-subtle">
                <span
                  className={[
                    'grid size-4 place-items-center rounded-full text-[0.55rem]',
                    state === 'done' ? 'bg-accent text-accent-fg' : state === 'running' ? 'animate-pulse bg-amber-400 text-black' : 'bg-line',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {state === 'done' ? '✓' : ''}
                </span>
                step {i + 1}
              </p>
              <p className="mt-2 text-[0.8rem] font-medium leading-snug">{s.label}</p>
              <p className="mt-0.5 text-[0.7rem] leading-snug text-muted">{s.detail}</p>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
