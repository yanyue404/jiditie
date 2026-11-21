/** D1 访问：建表兜底、按日键、meta 累加、读氛围灯 JSON。表结构见 docs/d1-atmosphere.md */

export type Env = { DB: D1Database }

/** 与 migrations/0001_init.sql 对齐；本地/漏迁时 CREATE IF NOT EXISTS 兜底 */
const TABLES = [
  `CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS daily (
    day TEXT PRIMARY KEY,
    active INTEGER NOT NULL DEFAULT 0,
    visits INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    fails INTEGER NOT NULL DEFAULT 0,
    pulls INTEGER NOT NULL DEFAULT 0,
    civil_wins INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS visitors (uid TEXT PRIMARY KEY, first_ts INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS daily_active (
    day TEXT NOT NULL,
    uid TEXT NOT NULL,
    PRIMARY KEY (day, uid)
  )`,
]

let ready: Promise<void> | null = null

/** 每个 isolate 只跑一轮建表 */
export function ensureSchema(db: D1Database): Promise<void> {
  if (!ready) {
    ready = (async () => {
      for (const sql of TABLES) await db.prepare(sql).run()
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

/** 日历日 YYYY-MM-DD，UTC+8 */
export function dayKey(ms = Date.now()): string {
  return new Date(ms + 8 * 3600_000).toISOString().slice(0, 10)
}

/** meta 计数器 += n（k 不存在则插入） */
export async function bumpMeta(db: D1Database, key: string, n: number): Promise<void> {
  if (n <= 0) return
  await db
    .prepare(
      `INSERT INTO meta(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v = v + excluded.v`,
    )
    .bind(key, n)
    .run()
}

/** 前端氛围灯用的聚合字段（camelCase） */
export type StatsJson = {
  visits: number
  uniques: number
  todayActive: number
  wins: number
  fails: number
  pulls: number
  civilWins: number
}

/** 全局 meta + 当日 daily.active → API 响应 */
export async function readStats(db: D1Database): Promise<StatsJson> {
  const day = dayKey()
  const meta = await db.prepare(`SELECT k, v FROM meta`).all<{ k: string; v: number }>()
  const map = Object.fromEntries((meta.results || []).map((r) => [r.k, r.v]))
  const daily = await db
    .prepare(`SELECT active FROM daily WHERE day = ?`)
    .bind(day)
    .first<{ active: number }>()
  return {
    visits: map.visits || 0,
    uniques: map.uniques || 0,
    todayActive: daily?.active || 0,
    wins: map.wins || 0,
    fails: map.fails || 0,
    pulls: map.pulls || 0,
    civilWins: map.civil_wins || 0,
  }
}
