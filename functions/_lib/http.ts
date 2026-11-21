/** HTTP 小工具：JSON 响应、同源校验、按 IP 限速、读 body */

/** isolate 内存限速；多实例间不共享，只作廉价防刷 */
const ipHits = new Map<string, { t: number; n: number }>()

export function json(data: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  })
}

/** 无 Origin（部分 beacon）放行；有则必须与请求 host 一致 */
export function originOk(req: Request): boolean {
  const o = req.headers.get('Origin')
  if (!o) return true
  try {
    return new URL(o).host === new URL(req.url).host
  } catch {
    return false
  }
}

/** 约 60s 滑动窗口；超限返回 false */
export function rateOk(ip: string, max: number): boolean {
  const now = Date.now()
  const row = ipHits.get(ip)
  if (!row || now - row.t > 60_000) {
    ipHits.set(ip, { t: now, n: 1 })
    return true
  }
  if (row.n >= max) return false
  row.n++
  return true
}

export function clientIp(req: Request): string {
  return req.headers.get('CF-Connecting-IP') || '0'
}

export async function readBody<T>(req: Request): Promise<T | null> {
  try {
    const text = await req.text()
    if (!text) return {} as T
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
