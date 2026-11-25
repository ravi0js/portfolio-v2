import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';

/**
 * Returns a ref plus whether animation should run.
 * Server render and reduced-motion users get `animate = false`, so components
 * must render their final, fully-informative state in that case.
 */
export function useAnimateWhenVisible<T extends Element>(amount = 0.35) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { amount });
  const reduced = useReducedMotion();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(document.documentElement.classList.contains('js-motion'));
  }, []);

  return { ref, inView, animate: allowed && !reduced, mounted: allowed || reduced !== null };
}
