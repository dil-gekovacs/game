const FIXED_STEP_MS = 1000 / 60;
const MAX_ACCUMULATED_MS = 250;

type LoopCallbacks = {
  onRender: (alpha: number) => void;
  onUpdate: (deltaMs: number) => void;
};

type GameLoop = {
  start: () => void;
  stop: () => void;
};

export const createGameLoop = ({ onRender, onUpdate }: LoopCallbacks): GameLoop => {
  let accumulatedMs = 0;
  let frameId: number | null = null;
  let previousTime = 0;

  const runFrame = (currentTime: number) => {
    if (previousTime === 0) {
      previousTime = currentTime;
    }

    const frameDelta = Math.min(currentTime - previousTime, MAX_ACCUMULATED_MS);
    previousTime = currentTime;
    accumulatedMs += frameDelta;

    while (accumulatedMs >= FIXED_STEP_MS) {
      onUpdate(FIXED_STEP_MS);
      accumulatedMs -= FIXED_STEP_MS;
    }

    const alpha = accumulatedMs / FIXED_STEP_MS;
    onRender(alpha);
    frameId = window.requestAnimationFrame(runFrame);
  };

  const start = () => {
    if (frameId !== null) {
      return;
    }

    previousTime = 0;
    frameId = window.requestAnimationFrame(runFrame);
  };

  const stop = () => {
    if (frameId === null) {
      return;
    }

    window.cancelAnimationFrame(frameId);
    frameId = null;
  };

  return { start, stop };
};
