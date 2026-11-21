/** 本地类型桩：避免为 Pages Functions 单独装 @cloudflare/workers-types */

interface D1Meta {
  changes?: number
}

interface D1Result<T = unknown> {
  results?: T[]
  meta?: D1Meta
  success?: boolean
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  run(): Promise<D1Result>
  all<T = unknown>(): Promise<D1Result<T>>
}

interface D1Database {
  prepare(query: string): D1PreparedStatement
  exec(query: string): Promise<unknown>
}

interface EventContext<Env, P, Data> {
  request: Request
  env: Env
  params: P
  data: Data
  waitUntil(promise: Promise<unknown>): void
  next(): Promise<Response>
}

type PagesFunction<
  Env = unknown,
  P extends string = any,
  Data extends Record<string, unknown> = Record<string, unknown>,
> = (context: EventContext<Env, P, Data>) => Response | Promise<Response>
