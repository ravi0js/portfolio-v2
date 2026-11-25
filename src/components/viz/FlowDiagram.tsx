import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAnimateWhenVisible } from './useAnimateWhenVisible';

type Kind = 'external' | 'service' | 'store' | 'user' | 'decision';
interface Step {
  label: string;
  detail: string;
  kind: Kind;
}
interface Props {
  steps: Step[];
  caption: string;
}

const KIND_LABEL: Record<Kind, string> = {
  external: 'external',
  service: 'service',
  store: 'data',
  user: 'actor',
  decision: 'decision',
};

function KindGlyph({ kind }: { kind: Kind }) {
  const common = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (kind) {
    case 'store':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
        </svg>
      );
    case 'external':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case 'decision':
      return (
        <svg {...common}>
          <path d="M12 2 22 12 12 22 2 12z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 9l3 3-3 3M13 15h4" />
        </svg>
      );
  }
}

export default function FlowDiagram({ steps, caption }: Props) {
  const { ref, inView, animate } = useAnimateWhenVisible<HTMLDivElement>();
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (!animate || !inView) return;
    let i = 0;
    setActive(0);
    const id = window.setInterval(() => {
      i = (i + 1) % (steps.length + 2); // short pause at the end of each cycle
      setActive(i < steps.length ? i : -1);
    }, 900);
    return () => window.clearInterval(id);
  }, [animate, inView, steps.length]);

  return (
    <figure ref={ref} className="@container w-full">
      <ol className="flow flex flex-col items-stretch @3xl:flex-row" aria-label={caption}>
        {steps.map((s, i) => {
          const on = active === i;
          const passed = active > i;
          return (
            <li key={s.label} className="flex flex-col items-stretch @3xl:flex-1 @3xl:flex-row">
              <div
                className={[
                  'relative grid min-w-0 flex-1 grid-cols-[7rem_1fr] items-center gap-x-3 rounded-[10px] border px-3 py-2.5 transition-[border-color,background-color] duration-300 @3xl:block',
                  on ? 'border-accent bg-accent/10' : 'border-line bg-raised',
                  s.kind === 'decision' ? 'border-dashed' : '',
                ].join(' ')}
              >
                <p className={['flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider', on || passed ? 'text-accent' : 'text-subtle'].join(' ')}>
                  <KindGlyph kind={s.kind} />
                  {KIND_LABEL[s.kind]}
                </p>
                <div className="min-w-0 @3xl:mt-1">
                  <p className="text-[0.8rem] leading-snug font-medium">{s.label}</p>
                  <p className="mt-0.5 text-[0.7rem] leading-snug text-muted">{s.detail}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="flow-link relative ml-[3.6rem] h-4 w-px shrink-0 bg-line @3xl:mx-0 @3xl:h-px @3xl:w-5 @3xl:self-center" aria-hidden="true">
                  {animate && on && <span key={`dot-${i}-${active}`} className="flow-dot" />}
                  {animate && passed && (
                    <motion.span
                      className="absolute inset-0 bg-accent/60"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <figcaption className="mt-3 font-mono text-[0.7rem] text-subtle">{caption}</figcaption>
    </figure>
  );
}
