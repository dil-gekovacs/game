export type InputSnapshot = {
  mouseLeft: boolean;
  mouseRight: boolean;
  moveX: number;
  moveY: number;
  pointerX: number;
  pointerY: number;
};

type InputController = {
  destroy: () => void;
  getSnapshot: () => InputSnapshot;
};

const clampAxis = (axisValue: number): number => {
  if (axisValue > 1) {
    return 1;
  }

  if (axisValue < -1) {
    return -1;
  }

  return axisValue;
};

export const createInputController = (targetElement: HTMLElement): InputController => {
  const pressedKeys = new Set<string>();
  let mouseLeft = false;
  let mouseRight = false;
  let pointerX = 0;
  let pointerY = 0;

  const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
    pressedKeys.add(keyboardEvent.code);
  };

  const handleKeyUp = (keyboardEvent: KeyboardEvent) => {
    pressedKeys.delete(keyboardEvent.code);
  };

  const handleMouseDown = (mouseEvent: MouseEvent) => {
    if (mouseEvent.button === 0) {
      mouseLeft = true;
      return;
    }

    if (mouseEvent.button === 2) {
      mouseRight = true;
    }
  };

  const handleMouseUp = (mouseEvent: MouseEvent) => {
    if (mouseEvent.button === 0) {
      mouseLeft = false;
      return;
    }

    if (mouseEvent.button === 2) {
      mouseRight = false;
    }
  };

  const handlePointerDown = (pointerEvent: PointerEvent) => {
    pointerEvent.preventDefault();
    if (pointerEvent.button === 0) {
      mouseLeft = true;
    } else if (pointerEvent.button === 2) {
      mouseRight = true;
    }
  };

  const handlePointerUp = (pointerEvent: PointerEvent) => {
    if (pointerEvent.button === 0) {
      mouseLeft = false;
    } else if (pointerEvent.button === 2) {
      mouseRight = false;
    }
  };

  const handlePointerMove = (pointerEvent: PointerEvent) => {
    const rect = targetElement.getBoundingClientRect();
    pointerX = pointerEvent.clientX - rect.left;
    pointerY = pointerEvent.clientY - rect.top;
  };

  const handleContextMenu = (mouseEvent: MouseEvent) => {
    mouseEvent.preventDefault();
  };

  const getSnapshot = (): InputSnapshot => {
    const horizontalAxis = Number(pressedKeys.has("KeyD")) - Number(pressedKeys.has("KeyA"));
    const verticalAxis = Number(pressedKeys.has("KeyS")) - Number(pressedKeys.has("KeyW"));

    return {
      mouseLeft: mouseLeft || pressedKeys.has("Space"),
      mouseRight: mouseRight || pressedKeys.has("KeyE"),
      moveX: clampAxis(horizontalAxis),
      moveY: clampAxis(verticalAxis),
      pointerX,
      pointerY,
    };
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  targetElement.addEventListener("contextmenu", handleContextMenu);
  window.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mouseup", handleMouseUp);
  targetElement.addEventListener("pointerdown", handlePointerDown);
  targetElement.addEventListener("pointerup", handlePointerUp);
  targetElement.addEventListener("pointermove", handlePointerMove);

  const destroy = () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    targetElement.removeEventListener("contextmenu", handleContextMenu);
    window.removeEventListener("mousedown", handleMouseDown);
    window.removeEventListener("mouseup", handleMouseUp);
    targetElement.removeEventListener("pointerdown", handlePointerDown);
    targetElement.removeEventListener("pointerup", handlePointerUp);
    targetElement.removeEventListener("pointermove", handlePointerMove);
  };

  return { destroy, getSnapshot };
};
