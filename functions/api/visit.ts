/** POST /api/visit — 进页：visits++、唯一通勤者、今日活跃（日×uid 去重） */

import { bumpMeta, dayKey, ensureSchema, readStats, type Env } from '../_lib/db'
import { clientIp, json, originOk, rateOk, readBody } from '../_lib/http'

const UID_RE = /^[0-9a-f-]{36}$/i

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!originOk(ctx.request)) return json({ error: 'origin' }, 403)
  const ip = clientIp(ctx.request)
  if (!rateOk(`v:${ip}`, 40)) return json({ error: 'rate' }, 429)

  const body = await readBody<{ uid?: string }>(ctx.request)
  const uid = body?.uid?.trim() || ''
  if (!UID_RE.test(uid)) return json({ error: 'uid' }, 400)

  try {
    const db = ctx.env.DB
    await ensureSchema(db)
    const day = dayKey()
    const now = Date.now()

    // 每次文档加载都计进页
    await bumpMeta(db, 'visits', 1)
    await db
      .prepare(
        `INSERT INTO daily(day, visits) VALUES(?, 1)
         ON CONFLICT(day) DO UPDATE SET visits = visits + 1`,
      )
      .bind(day)
      .run()

    // 终身唯一通勤者
    const known = await db.prepare(`SELECT 1 AS x FROM visitors WHERE uid = ?`).bind(uid).first()
    if (!known) {
      await db.prepare(`INSERT INTO visitors(uid, first_ts) VALUES(?, ?)`).bind(uid, now).run()
      await bumpMeta(db, 'uniques', 1)
    }

    // 当日活跃：同 uid 只加一次
    const activeToday = await db
      .prepare(`SELECT 1 AS x FROM daily_active WHERE day = ? AND uid = ?`)
      .bind(day, uid)
      .first()
    if (!activeToday) {
      await db.prepare(`INSERT INTO daily_active(day, uid) VALUES(?, ?)`).bind(day, uid).run()
      await db
        .prepare(
          `INSERT INTO daily(day, active) VALUES(?, 1)
           ON CONFLICT(day) DO UPDATE SET active = active + 1`,
        )
        .bind(day)
        .run()
    }

    return json(await readStats(db))
  } catch {
    return json({ error: 'unavailable' }, 503)
  }
}
