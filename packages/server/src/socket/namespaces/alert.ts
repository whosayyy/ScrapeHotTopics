import type { Server as SocketIOServer } from "socket.io";
import type { EventEmitter } from "events";
import { SocketEvent, type BreakingAlertPayload } from "../events.js";
import { AiEvent } from "../../ai-core/index.js";
import logger from "../../lib/logger.js";

const log = logger.child({ module: "SocketAlert" });

export function setupAlertNamespace(io: SocketIOServer, eventBus: EventEmitter): void {
  const alertNS = io.of("/alert");

  alertNS.on("connection", (socket) => {
    log.debug({ id: socket.id }, "alert client connected");

    socket.on("disconnect", () => {
      log.debug({ id: socket.id }, "alert client disconnected");
    });
  });

  eventBus.on(AiEvent.BREAKING_ALERT, (payload: BreakingAlertPayload) => {
    alertNS.emit(SocketEvent.BREAKING_ALERT, payload);
  });

  log.info("alert namespace ready");
}
