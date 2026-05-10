import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "./types.js";
import logger from "../lib/logger.js";

const log = logger.child({ module: "CrawlerEngine" });

interface CrawlerTask {
  adapter: CrawlerAdapter;
  interval: number;
  keywords: CrawlerKeywords;
  timer?: ReturnType<typeof setInterval>;
  isRunning: boolean;
}

export class CrawlerEngine {
  private tasks: Map<string, CrawlerTask> = new Map();
  private onData: (items: RawNews[]) => void;

  constructor(onData: (items: RawNews[]) => void) {
    this.onData = onData;
  }

  register(adapter: CrawlerAdapter, keywords: CrawlerKeywords): void {
    if (this.tasks.has(adapter.sourceId)) {
      log.warn({ sourceId: adapter.sourceId }, "adapter already registered, skipping");
      return;
    }

    const task: CrawlerTask = {
      adapter,
      interval: adapter.defaultInterval,
      keywords,
      isRunning: false,
    };

    this.tasks.set(adapter.sourceId, task);
    log.info({ sourceId: adapter.sourceId, interval: task.interval }, "adapter registered");
  }

  start(): void {
    for (const [id, task] of this.tasks) {
      this.executeTask(task);
      task.timer = setInterval(() => this.executeTask(task), task.interval);
      log.info({ sourceId: id }, "adapter started");
    }
    log.info({ total: this.tasks.size }, "crawler engine started");
  }

  stop(): void {
    for (const [id, task] of this.tasks) {
      if (task.timer) {
        clearInterval(task.timer);
        task.timer = undefined;
      }
      log.info({ sourceId: id }, "adapter stopped");
    }
    log.info("crawler engine stopped");
  }

  updateKeywords(sourceId: string, keywords: CrawlerKeywords): void {
    const task = this.tasks.get(sourceId);
    if (task) {
      task.keywords = keywords;
      log.info({ sourceId }, "keywords updated");
    }
  }

  /** 同步所有适配器的关键词（从数据库批量加载后调用） */
  updateAllKeywords(keywords: CrawlerKeywords): void {
    for (const [id, task] of this.tasks) {
      task.keywords = keywords;
    }
    log.info({ count: this.tasks.size }, "all adapter keywords updated");
  }

  private async executeTask(task: CrawlerTask): Promise<void> {
    if (task.isRunning) {
      log.warn({ sourceId: task.adapter.sourceId }, "previous fetch still in progress, skip");
      return;
    }

    task.isRunning = true;
    const start = performance.now();

    try {
      const items = await task.adapter.fetch(task.keywords);
      const elapsed = (performance.now() - start).toFixed(0);

      if (items.length > 0) {
        log.info({ sourceId: task.adapter.sourceId, count: items.length, elapsed }, "fetch completed");
        this.onData(items);
      } else {
        log.debug({ sourceId: task.adapter.sourceId, elapsed }, "fetch returned 0 items");
      }
    } catch (err) {
      log.error({ sourceId: task.adapter.sourceId, err }, "fetch failed");
    } finally {
      task.isRunning = false;
    }
  }
}
