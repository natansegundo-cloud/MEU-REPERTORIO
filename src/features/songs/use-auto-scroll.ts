import { useEffect, useRef, useState } from 'react';

import { getPreference, setPreference } from '@/services';

import { createScrollController, type ScrollController } from './scroll-controller';

/** Chave compartilhada entre a leitura normal e o modo show. */
export const SCROLL_SPEED_KEY = 'show.scrollSpeed';
export const SCROLL_SPEED_MIN = 5;
export const SCROLL_SPEED_MAX = 100;
export const SCROLL_SPEED_STEP = 5;
export const DEFAULT_SCROLL_SPEED = 40;

export function clampScrollSpeed(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SCROLL_SPEED;
  const clamped = Math.max(SCROLL_SPEED_MIN, Math.min(SCROLL_SPEED_MAX, value));
  return Math.round(clamped / SCROLL_SPEED_STEP) * SCROLL_SPEED_STEP;
}

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, label, [role="button"], [role="slider"], [contenteditable="true"], [data-no-swipe="true"]';

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
}

export interface AutoScrollState {
  readonly speed: number;
  readonly running: boolean;
  readonly setRunning: (running: boolean) => void;
  readonly setSpeed: (speed: number) => void;
  readonly changeSpeed: (direction: -1 | 1) => void;
  readonly stop: () => void;
}

/**
 * Controla a rolagem automática da janela. A velocidade é persistida e
 * compartilhada entre a tela normal da música e o modo show.
 */
export function useAutoScroll(): AutoScrollState {
  const [speed, setSpeedState] = useState(DEFAULT_SCROLL_SPEED);
  const [running, setRunning] = useState(false);
  const controllerRef = useRef<ScrollController | null>(null);
  const programmaticUntil = useRef(0);

  useEffect(() => {
    const controller = createScrollController(
      {
        now: () => performance.now(),
        requestFrame: (callback) => window.requestAnimationFrame(callback),
        cancelFrame: (frame) => window.cancelAnimationFrame(frame),
        getScrollTop: () => window.scrollY,
        getMaxScroll: () => document.documentElement.scrollHeight - window.innerHeight,
        scrollBy: (top) => {
          // Ignora o evento de scroll gerado pelo próprio controlador.
          programmaticUntil.current = performance.now() + 180;
          window.scrollBy(0, top);
        },
      },
      DEFAULT_SCROLL_SPEED,
      () => setRunning(false),
    );
    controllerRef.current = controller;

    return () => {
      controller.stop();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void getPreference<number>(SCROLL_SPEED_KEY, DEFAULT_SCROLL_SPEED)
      .then((value) => {
        if (active) setSpeedState(clampScrollSpeed(value));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    controller.setSpeed(speed);
    if (running) controller.start();
    else controller.stop();
  }, [running, speed]);

  useEffect(() => {
    function pauseForManualScroll(): void {
      if (performance.now() > programmaticUntil.current) setRunning(false);
    }
    function pauseForManualTouch(event: TouchEvent): void {
      if (isInteractiveTarget(event.target)) return;
      setRunning(false);
    }
    // Não usamos touchstart: tocar em controles não deve pausar a rolagem.
    // O scroll cobre roda, teclado e barra; o touchmove cobre o arrasto manual,
    // que não pode ser distinguido pelo scroll durante a rolagem programática.
    window.addEventListener('wheel', pauseForManualScroll, { passive: true });
    window.addEventListener('scroll', pauseForManualScroll, { passive: true });
    window.addEventListener('touchmove', pauseForManualTouch, { passive: true });
    return () => {
      window.removeEventListener('wheel', pauseForManualScroll);
      window.removeEventListener('scroll', pauseForManualScroll);
      window.removeEventListener('touchmove', pauseForManualTouch);
    };
  }, []);

  function setSpeed(value: number): void {
    const next = clampScrollSpeed(value);
    setSpeedState(next);
    void setPreference(SCROLL_SPEED_KEY, next);
  }

  function changeSpeed(direction: -1 | 1): void {
    setSpeed(speed + direction * SCROLL_SPEED_STEP);
  }

  function stop(): void {
    controllerRef.current?.stop();
    setRunning(false);
  }

  return { speed, running, setRunning, setSpeed, changeSpeed, stop };
}
