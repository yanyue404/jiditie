/** POST /api/round — 本局车厢增量；支持 pagehide sendBeacon */

import { bumpMeta, dayKey, ensureSchema, readStats, type Env } from '../_lib/db'
import { clientIp, json, originOk, rateOk, readBody } from '../_lib/http'

const PULL_MAX = 20

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!originOk(ctx.request)) return json({ error: 'origin' }, 403)
  const ip = clientIp(ctx.request)
  if (!rateOk(`r:${ip}`, 60)) return json({ error: 'rate' }, 429)

  const body = await readBody<{
    wins?: number
    fails?: number
    pulls?: number
    civilWins?: number
  }>(ctx.request)
  if (!body) return json({ error: 'body' }, 400)

  const wins = clamp01(body.wins)
  const fails = clamp01(body.fails)
  const civilWins = clamp01(body.civilWins)
  const pulls = Math.max(0, Math.min(PULL_MAX, Math.floor(Number(body.pulls) || 0)))
  // 一局只能胜或负其一
  if (wins + fails > 1) return json({ error: 'round' }, 400)
  if (!(wins || fails || pulls || civilWins)) return json({ ok: true })

  try {
    const db = ctx.env.DB
    await ensureSchema(db)
    const day = dayKey()

    await bumpMeta(db, 'wins', wins)
    await bumpMeta(db, 'fails', fails)
    await bumpMeta(db, 'pulls', pulls)
    await bumpMeta(db, 'civil_wins', civilWins)

    await db
      .prepare(
        `INSERT INTO daily(day, wins, fails, pulls, civil_wins) VALUES(?, ?, ?, ?, ?)
         ON CONFLICT(day) DO UPDATE SET
           wins = wins + excluded.wins,
           fails = fails + excluded.fails,
           pulls = pulls + excluded.pulls,
           civil_wins = civil_wins + excluded.civil_wins`,
      )
      .bind(day, wins, fails, pulls, civilWins)
      .run()

    return json(await readStats(db))
  } catch {
    return json({ error: 'unavailable' }, 503)
  }
}

/** 胜/负/文明通关：压成 0 或 1 */
function clamp01(n: unknown): number {
  const v = Math.floor(Number(n) || 0)
  return v <= 0 ? 0 : 1
}
