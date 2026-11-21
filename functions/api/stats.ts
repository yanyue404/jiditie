/** GET /api/stats — 氛围灯只读 */

import { ensureSchema, readStats, type Env } from '../_lib/db'
import { json } from '../_lib/http'

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    if (!ctx.env.DB) return json({ error: 'no-db' }, 503)
    await ensureSchema(ctx.env.DB)
    return json(await readStats(ctx.env.DB))
  } catch {
    return json({ error: 'unavailable' }, 503)
  }
}
