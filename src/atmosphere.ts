/** 氛围灯客户端：进页/本局上报、拉数、文案；失败静默（不挡玩法） */

export type AtmosphereStats = {
  visits: number
  uniques: number
  todayActive: number
  wins: number
  fails: number
  pulls: number
  civilWins: number
}

/** 结算时上报的本局增量（非本地累计绝对值） */
type RoundDelta = {
  wins: number
  fails: number
  pulls: number
  civilWins: number
}

const UID_KEY = 'line3-uid'
/** 关页前尚未确认成功的 round，留给 sendBeacon */
let pendingRound: RoundDelta | null = null
/** 同一次文档加载只 POST visit 一次；回线路图只拉 stats */
let visitedThisLoad = false

/** 同源；纯 vite 无 /api 时 fetch 失败 → 不展示 */
function apiBase(): string {
  return ''
}

/** 匿名通勤者：localStorage UUID，非账号 */
export function commuterId(): string {
  let id = localStorage.getItem(UID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(UID_KEY, id)
  }
  return id
}

async function getJson(path: string): Promise<AtmosphereStats | null> {
  try {
    const r = await fetch(`${apiBase()}${path}`)
    if (!r.ok) return null
    return (await r.json()) as AtmosphereStats
  } catch {
    return null
  }
}

async function postJson(path: string, body: unknown): Promise<AtmosphereStats | null> {
  try {
    const r = await fetch(`${apiBase()}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    })
    if (!r.ok) return null
    return (await r.json()) as AtmosphereStats
  } catch {
    return null
  }
}

/** 文档加载计进页；同日同通勤者今日活跃最多 +1 */
export async function reportVisit(): Promise<AtmosphereStats | null> {
  if (visitedThisLoad) return getJson('/api/stats')
  visitedThisLoad = true
  return postJson('/api/visit', { uid: commuterId() })
}

/** 结算上报；先挂 pending，成功再清，失败留给 pagehide beacon */
export function reportRound(delta: RoundDelta): void {
  pendingRound = delta
  void postJson('/api/round', delta).then((s) => {
    if (s) pendingRound = null
  })
}

export async function fetchStats(): Promise<AtmosphereStats | null> {
  return getJson('/api/stats')
}

/** 首页门厅文案 */
export function lobbyLine(s: AtmosphereStats): string {
  return `今日 ${s.todayActive} 人挤过 · 全网进站 ${s.visits} 次 · ${s.uniques} 位通勤者`
}

/** 结算车厢文案 */
export function cabinLine(s: AtmosphereStats): string {
  return `全网成功 ${s.wins} / 失败 ${s.fails} · 文明通关 ${s.civilWins} · 扒拉 ${s.pulls}`
}

/** 写入 #atmosphere；无文案则 hidden（静默降级） */
export function paintAtmosphere(el: Element | null, line: string | null): void {
  if (!(el instanceof HTMLElement)) return
  if (!line) {
    el.hidden = true
    el.textContent = ''
    return
  }
  el.hidden = false
  el.textContent = line
}

/** 关页兜底：把未成功的本局增量 beacon 出去 */
function flushBeacon(): void {
  if (!pendingRound) return
  const blob = new Blob([JSON.stringify(pendingRound)], { type: 'application/json' })
  navigator.sendBeacon('/api/round', blob)
  pendingRound = null
}

window.addEventListener('pagehide', flushBeacon)
