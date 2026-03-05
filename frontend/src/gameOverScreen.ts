type GameOverScreen = {
  show: (victory: boolean) => void;
  hide: () => void;
  isVisible: () => boolean;
  destroy: () => void;
};

const OVERLAY_Z_INDEX = "100";
const OVERLAY_BG = "rgba(10, 10, 20, 0.85)";
const FADE_DURATION_MS = "300ms";

const TITLE_FONT_SIZE = "48px";
const SUBTITLE_FONT_SIZE = "16px";
const HINT_FONT_SIZE = "14px";

const VICTORY_COLOR = "#D4AA40";
const DEFEAT_COLOR = "#EF4444";
const SUBTITLE_COLOR = "#FFFFFF";
const HINT_COLOR = "#94A3B8";

const FONT_FAMILY = '"Press Start 2P", ui-monospace, monospace';

const VICTORY_TITLE = "VICTORY";
const DEFEAT_TITLE = "DEFEAT";
const VICTORY_SUBTITLE = "All enemies defeated!";
const DEFEAT_SUBTITLE = "Your party was wiped out";
const HINT_TEXT = "Press R to restart";

const TITLE_MARGIN_BOTTOM = "24px";
const SUBTITLE_MARGIN_BOTTOM = "32px";

function createElement(tag: string, styles: Partial<CSSStyleDeclaration>): HTMLElement {
  const el = document.createElement(tag);
  Object.assign(el.style, styles);
  return el;
}

export const createGameOverScreen = (container: HTMLElement): GameOverScreen => {
  const overlay = createElement("div", {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    background: OVERLAY_BG,
    zIndex: OVERLAY_Z_INDEX,
    display: "none",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    opacity: "0",
    transition: `opacity ${FADE_DURATION_MS} ease-in-out`,
  });

  const title = createElement("div", {
    fontSize: TITLE_FONT_SIZE,
    fontFamily: FONT_FAMILY,
    marginBottom: TITLE_MARGIN_BOTTOM,
    textAlign: "center",
  });

  const subtitle = createElement("div", {
    fontSize: SUBTITLE_FONT_SIZE,
    fontFamily: FONT_FAMILY,
    color: SUBTITLE_COLOR,
    marginBottom: SUBTITLE_MARGIN_BOTTOM,
    textAlign: "center",
  });

  const hint = createElement("div", {
    fontSize: HINT_FONT_SIZE,
    fontFamily: FONT_FAMILY,
    color: HINT_COLOR,
    textAlign: "center",
  });

  overlay.appendChild(title);
  overlay.appendChild(subtitle);
  overlay.appendChild(hint);
  container.appendChild(overlay);

  hint.textContent = HINT_TEXT;

  let visible = false;

  const show = (victory: boolean): void => {
    if (victory) {
      title.textContent = VICTORY_TITLE;
      title.style.color = VICTORY_COLOR;
      subtitle.textContent = VICTORY_SUBTITLE;
    } else {
      title.textContent = DEFEAT_TITLE;
      title.style.color = DEFEAT_COLOR;
      subtitle.textContent = DEFEAT_SUBTITLE;
    }

    overlay.style.display = "flex";
    overlay.style.opacity = "0";

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });

    visible = true;
  };

  const hide = (): void => {
    overlay.style.display = "none";
    overlay.style.opacity = "0";
    visible = false;
  };

  const isVisible = (): boolean => {
    return visible;
  };

  const destroy = (): void => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    visible = false;
  };

  return { show, hide, isVisible, destroy };
};
