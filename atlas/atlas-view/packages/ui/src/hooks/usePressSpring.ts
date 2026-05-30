import { useCallback, useEffect, useRef } from 'react';
import {
  DEFAULT_SPRING,
  isSettled,
  prefersReducedMotion,
  springStep,
  type SpringConfig,
  type SpringState,
} from '../lib/spring';
import { playClick } from '../lib/clickSound';

export interface PressSpringOptions {
  /** scale at full press (default 0.94 — a 6% squash) */
  pressedScale?: number;
  /** spring tuning (default {@link DEFAULT_SPRING}) */
  config?: SpringConfig;
  /** play the procedural click on press-down (still gated by the global pref) */
  sound?: boolean;
}

export interface PressSpringBindings<T extends HTMLElement = HTMLButtonElement> {
  ref: React.RefObject<T | null>;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
}

/**
 * Spring-physics press feedback for a button (or any element).
 *
 * The animation is written **straight to `element.style.transform` via rAF** —
 * it never calls setState, so it doesn't re-render the component or touch the
 * React reconciler on the hot path (the same bypass-the-reconciler discipline
 * the 3D scene uses). The rAF loop runs only while the spring is in motion and
 * stops itself the moment it settles, so an idle toolbar costs nothing.
 *
 * Honors `prefers-reduced-motion`: when set, the scale animation is skipped
 * entirely (the click sound, being non-motion feedback, still plays if enabled).
 *
 * Pass a STABLE `config` (module constant or memoized) — a fresh object each
 * render rebuilds the callbacks.
 */
export function usePressSpring<T extends HTMLElement = HTMLButtonElement>(
  options: PressSpringOptions = {},
): PressSpringBindings<T> {
  const { pressedScale = 0.94, config = DEFAULT_SPRING, sound = true } = options;

  const ref = useRef<T | null>(null);
  const state = useRef<SpringState>({ x: 1, v: 0 });
  const target = useRef(1);
  const raf = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const reduced = useRef(prefersReducedMotion());

  const write = useCallback((scale: number) => {
    const el = ref.current;
    if (!el) return;
    // empty string at rest so we don't leave a stale identity transform behind
    el.style.transform = scale === 1 ? '' : `scale(${scale})`;
  }, []);

  const tick = useCallback(
    (now: number) => {
      if (lastTime.current == null) lastTime.current = now;
      const dt = (now - lastTime.current) / 1000;
      lastTime.current = now;

      state.current = springStep(state.current, target.current, config, dt);

      if (isSettled(state.current, target.current)) {
        state.current = { x: target.current, v: 0 };
        write(target.current);
        raf.current = null;
        lastTime.current = null;
        return;
      }
      write(state.current.x);
      raf.current = requestAnimationFrame(tick);
    },
    [config, write],
  );

  const setTarget = useCallback(
    (value: number) => {
      target.current = value;
      if (reduced.current) return; // reduced motion → no scale animation
      if (raf.current == null) {
        lastTime.current = null;
        raf.current = requestAnimationFrame(tick);
      }
    },
    [tick],
  );

  const onPointerDown = useCallback(() => {
    if (sound) playClick();
    setTarget(pressedScale);
  }, [sound, pressedScale, setTarget]);

  const release = useCallback(() => setTarget(1), [setTarget]);

  useEffect(
    () => () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  return {
    ref,
    onPointerDown,
    onPointerUp: release,
    onPointerLeave: release,
    onPointerCancel: release,
  };
}
