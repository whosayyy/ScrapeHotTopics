import type { Server as SocketIOServer } from "socket.io";
import type { EventEmitter } from "events";
import { SocketEvent, type RankingUpdatePayload } from "../events.js";
import { AiEvent } from "../../ai-core/index.js";
import logger from "../../lib/logger.js";

const log = logger.child({ module: "SocketRanking" });

export function setupRankingNamespace(io: SocketIOServer, eventBus: EventEmitter): void {
  const rankingNS = io.of("/ranking");

  rankingNS.on("connection", (socket) => {
    log.debug({ id: socket.id }, "ranking client connected");

    socket.on("disconnect", () => {
      log.debug({ id: socket.id }, "ranking client disconnected");
    });
  });

  eventBus.on(AiEvent.RANKING_UPDATE, (payload: RankingUpdatePayload) => {
    rankingNS.emit(SocketEvent.RANKING_UPDATE, payload);
  });

  log.info("ranking namespace ready");
}
