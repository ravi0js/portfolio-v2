import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';

const noopSubscribe = () => () => {};
const motionEnabled = () => document.documentElement.classList.contains('js-motion');

const REDUCED = '(prefers-reduced-motion: reduce)';
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const getReduced = () => window.matchMedia(REDUCED).matches;

/** True while at least `amount` (0–1) of the element is in the viewport. */
function useInView(ref: RefObject<Element | null>, amount: number) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: amount });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, amount]);
  return inView;
}

/**
 * Returns a ref plus whether animation should run.
 * Server render and reduced-motion users get `animate = false`, so components
 * must render their final, fully-informative state in that case.
 * (Plain IntersectionObserver + matchMedia: no animation library needed.)
 */
export function useAnimateWhenVisible<T extends Element>(amount = 0.35) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, amount);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, () => true);
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
