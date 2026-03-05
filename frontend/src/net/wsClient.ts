import { MSG } from "../../../shared/protocol/messages";
import type { ClientMessage, ServerMessage } from "../../../shared/protocol/messages";

type WsClientConfig = {
  wsUrl: string;
  onClose: () => void;
  onError: (errorEvent: Event) => void;
  onMessage: (message: ServerMessage) => void;
  onOpen: () => void;
};

type WsClient = {
  close: () => void;
  sendMessage: (message: ClientMessage) => void;
};

const serverMessageTypes = new Set<string>([
  MSG.EVENT,
  MSG.GAME_OVER,
  MSG.GAME_START,
  MSG.PLAYER_JOINED,
  MSG.PLAYER_LEFT,
  MSG.PONG,
  MSG.WORLD_SNAPSHOT,
]);

const isRecord = (unknownValue: unknown): unknownValue is Record<string, unknown> => {
  return typeof unknownValue === "object" && unknownValue !== null;
};

const isServerMessage = (unknownValue: unknown): unknownValue is ServerMessage => {
  if (!isRecord(unknownValue)) {
    return false;
  }

  const messageType = unknownValue.type;
  if (typeof messageType !== "string") {
    return false;
  }

  return serverMessageTypes.has(messageType);
};

export const createWsClient = ({ onClose, onError, onMessage, onOpen, wsUrl }: WsClientConfig): WsClient => {
  const socket = new WebSocket(wsUrl);

  socket.addEventListener("open", onOpen);
  socket.addEventListener("close", onClose);
  socket.addEventListener("error", onError);
  socket.addEventListener("message", (messageEvent) => {
    if (typeof messageEvent.data !== "string") {
      return;
    }

    let parsedMessage: unknown;
    try {
      parsedMessage = JSON.parse(messageEvent.data) as unknown;
    } catch {
      return;
    }

    if (!isServerMessage(parsedMessage)) {
      return;
    }

    onMessage(parsedMessage);
  });

  const sendMessage = (message: ClientMessage) => {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(message));
  };

  const close = () => {
    socket.close();
  };

  return { close, sendMessage };
};
