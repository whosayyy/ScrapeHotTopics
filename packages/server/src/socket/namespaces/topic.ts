import type { Server as SocketIOServer } from "socket.io";
import type { EventEmitter } from "events";
import { SocketEvent, type HotTopicPayload, type PipelineProgressPayload } from "../events.js";
import { AiEvent } from "../../ai-core/index.js";
import logger from "../../lib/logger.js";

const log = logger.child({ module: "SocketTopic" });

export function setupTopicNamespace(io: SocketIOServer, eventBus: EventEmitter): void {
  const topicNS = io.of("/topic");

  topicNS.on("connection", (socket) => {
    log.debug({ id: socket.id }, "topic client connected");

    socket.on("disconnect", () => {
      log.debug({ id: socket.id }, "topic client disconnected");
    });
  });

  eventBus.on(AiEvent.HOT_TOPIC_NEW, (payload: HotTopicPayload) => {
    topicNS.emit(SocketEvent.HOT_TOPIC_NEW, payload);
  });

  // pipeline:progress 也在 /topic 命名空间推送
  eventBus.on(AiEvent.PIPELINE_PROGRESS, (payload: PipelineProgressPayload) => {
    topicNS.emit(SocketEvent.PIPELINE_PROGRESS, payload);
  });

  log.info("topic namespace ready");
}
