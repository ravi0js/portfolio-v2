import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useInView, useReducedMotion } from 'motion/react';

const noopSubscribe = () => () => {};
const motionEnabled = () => document.documentElement.classList.contains('js-motion');

/**
 * Returns a ref plus whether animation should run.
 * Server render and reduced-motion users get `animate = false`, so components
 * must render their final, fully-informative state in that case.
 */
export function useAnimateWhenVisible<T extends Element>(amount = 0.35) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { amount });
  const reduced = useReducedMotion();
  const allowed = useSyncExternalStore(noopSubscribe, motionEnabled, () => false);
  return { ref, inView, animate: allowed && !reduced };
}

/**
 * Steps an index 0..steps on an interval while `run` is true.
 * Returns null until it starts, so callers can show their final state by default.
 * State is only set from timer callbacks (never synchronously in the effect).
 */
export function useStepper(
  run: boolean,
  steps: number,
  intervalMs: number,
  opts: { loop?: boolean; restartKey?: unknown } = {},
) {
  const [step, setStep] = useState<number | null>(null);
  const { loop = false, restartKey } = opts;

  useEffect(() => {
    if (!run) return;
    let s = 0;
    const start = window.setTimeout(() => setStep(0), 0);
    const id = window.setInterval(() => {
      s += 1;
      if (s > steps) {
        if (!loop) return window.clearInterval(id);
        s = 0;
      }
      setStep(s);
    }, intervalMs);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, [run, steps, intervalMs, loop, restartKey]);

  return step;
}
