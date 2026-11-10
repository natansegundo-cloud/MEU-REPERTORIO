export interface ScrollControllerRuntime {
  readonly now: () => number;
  readonly requestFrame: (callback: (time: number) => void) => number;
  readonly cancelFrame: (frame: number) => void;
  readonly getScrollTop: () => number;
  readonly getMaxScroll: () => number;
  readonly scrollBy: (top: number) => void;
}

export interface ScrollController {
  readonly start: () => void;
  readonly stop: () => void;
  readonly setSpeed: (speed: number) => void;
  readonly isRunning: () => boolean;
}

export function createScrollController(
  runtime: ScrollControllerRuntime,
  initialSpeed: number,
  onEnd: () => void,
): ScrollController {
  let speed = initialSpeed;
  let frame: number | null = null;
  let running = false;
  let previous = 0;

  function stop(): void {
    running = false;
    if (frame !== null) {
      runtime.cancelFrame(frame);
      frame = null;
    }
  }

  function tick(now: number): void {
    if (!running) return;

    const delta = Math.min(80, now - previous);
    previous = now;
    const maxScroll = runtime.getMaxScroll();
    if (runtime.getScrollTop() >= maxScroll - 2) {
      stop();
      onEnd();
      return;
    }

    runtime.scrollBy((speed * delta) / 1000);
    frame = runtime.requestFrame(tick);
  }

  return {
    start() {
      if (running) return;
      running = true;
      previous = runtime.now();
      frame = runtime.requestFrame(tick);
    },
    stop,
    setSpeed(nextSpeed) {
      speed = nextSpeed;
    },
    isRunning() {
      return running;
    },
  };
}
