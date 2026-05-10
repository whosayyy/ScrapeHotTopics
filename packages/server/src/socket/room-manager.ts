/**
 * 房间命名规范：
 * - keyword:<关键词> — 按关键词订阅
 * - geo:<地区代码>   — 按地理围栏订阅
 * - user:<userId>   — 按用户订阅（预留）
 */
export const RoomPattern = {
  KEYWORD: (kw: string) => `keyword:${kw.toLowerCase().trim()}`,
  GEO: (geo: string) => `geo:${geo.toLowerCase()}`,
  USER: (uid: string) => `user:${uid}`,
} as const;
