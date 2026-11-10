import { describe, expect, it, vi } from 'vitest';

import { createScrollController, type ScrollControllerRuntime } from './scroll-controller';

function createRuntime(maxScroll = 1000) {
  let now = 0;
  let scrollTop = 0;
  let nextFrame = 1;
  const frames = new Map<number, (time: number) => void>();
  const scrollBy = vi.fn((top: number) => {
    scrollTop += top;
  });
  const runtime: ScrollControllerRuntime = {
    now: () => now,
    requestFrame: (callback) => {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    },
    cancelFrame: (frame) => {
      frames.delete(frame);
    },
    getScrollTop: () => scrollTop,
    getMaxScroll: () => maxScroll,
    scrollBy,
  };

  return {
    runtime,
    frames,
    scrollBy,
    advanceTime(time: number) {
      now = time;
    },
    flush(time: number) {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(time));
    },
    getScrollTop: () => scrollTop,
  };
}

describe('scroll controller', () => {
  it('pausa e retoma do ponto atual sem reiniciar a posição', () => {
    const fake = createRuntime();
    const controller = createScrollController(fake.runtime, 42, vi.fn());

    controller.start();
    fake.advanceTime(0);
    fake.flush(80);
    const pausedAt = fake.getScrollTop();
    controller.stop();
    expect(fake.frames.size).toBe(0);

    fake.advanceTime(1000);
    fake.flush(1080);
    expect(fake.getScrollTop()).toBe(pausedAt);

    controller.start();
    fake.flush(1160);
    expect(fake.getScrollTop()).toBeGreaterThan(pausedAt);
  });

  it('aplica a nova velocidade sem criar uma segunda execução', () => {
    const fake = createRuntime();
    const controller = createScrollController(fake.runtime, 20, vi.fn());

    controller.start();
    controller.start();
    expect(fake.frames.size).toBe(1);
    fake.flush(100);
    const firstStep = fake.scrollBy.mock.calls[0]?.[0] ?? 0;

    controller.setSpeed(80);
    fake.flush(200);
    const secondStep = fake.scrollBy.mock.calls[1]?.[0] ?? 0;
    expect(secondStep).toBeGreaterThan(firstStep);
    expect(fake.frames.size).toBe(1);
  });

  it('encerra no fim da página e libera o frame pendente', () => {
    const fake = createRuntime(10);
    const onEnd = vi.fn();
    const controller = createScrollController(fake.runtime, 42, onEnd);

    controller.start();
    [80, 160, 240, 320].forEach((time) => fake.flush(time));

    expect(controller.isRunning()).toBe(false);
    expect(fake.frames.size).toBe(0);
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
