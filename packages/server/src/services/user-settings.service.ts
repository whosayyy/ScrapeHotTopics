import prisma from "../lib/prisma.js";
import logger from "../lib/logger.js";
import { UpdateUserSettingsSchema } from "./types.js";
import type { UpdateUserSettingsInput } from "./types.js";

const log = logger.child({ service: "UserSettingsService" });

const DEFAULT_ID = "default";

export class UserSettingsService {
  /** 获取用户设置（不存在则惰性创建） */
  async get() {
    let settings = await prisma.userSettings.findUnique({ where: { id: DEFAULT_ID } });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { id: DEFAULT_ID },
      });
      log.info("default user settings created");
    }

    return settings;
  }

  /** 更新用户设置 */
  async update(input: UpdateUserSettingsInput) {
    const data = UpdateUserSettingsSchema.parse(input);

    // 确保记录存在
    await this.get();

    const settings = await prisma.userSettings.update({
      where: { id: DEFAULT_ID },
      data,
    });
    log.info("user settings updated");
    return settings;
  }

  /** 重置为默认值 */
  async reset() {
    const settings = await prisma.userSettings.upsert({
      where: { id: DEFAULT_ID },
      update: { email: null, alertSound: true },
      create: { id: DEFAULT_ID },
    });
    log.info("user settings reset to defaults");
    return settings;
  }
}

export const userSettingsService = new UserSettingsService();
