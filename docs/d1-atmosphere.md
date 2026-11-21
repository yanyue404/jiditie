# D1 氛围灯数据库说明

库名：`jiditie-stats`（binding：`DB`）。  
定位：**全站计数器账本**，不是事件流水、不是玩家账号库。玩法与个人成就仍在浏览器 `localStorage`（`line3-save`），两边不对账。

术语见 [GLOSSARY.md](./GLOSSARY.md)；为何用纯 D1 见 [adr/0001-d1-atmosphere-stats.md](./adr/0001-d1-atmosphere-stats.md)。  
迁移文件：[../migrations/0001_init.sql](../migrations/0001_init.sql)。

## 设计一句话

| 产品概念 | 落库方式 |
| --- | --- |
| 门厅：进页 / 唯一通勤者 / 今日活跃 | `meta` + `visitors` + `daily_active` + `daily` |
| 车厢：成功 / 失败 / 扒拉 / 文明通关 | `meta` + `daily` 累加本局增量 |
| 日历日 | `YYYY-MM-DD`，按 **UTC+8** |

没有按站表、没有在线人数、没有 WebSocket。

## 表一览

```text
visitors          通勤者首次出现（终身去重 → uniques）
daily_active      某日哪些 uid 活跃过（日 × uid 去重 → todayActive）
meta              全站累计计数（k → v）
daily             按日累计计数（含当日 active / visits / 车厢字段）
d1_migrations     Wrangler 迁移记录（系统表，勿手改）
```

关系（逻辑上）：

```text
通勤者 uid ──┬── visitors（首次）
             └── daily_active(day, uid) ──→ 驱动 daily.active += 1（同日仅一次）

进页 / 结算增量 ──→ meta.* += n
                └── daily[day].* += n
```

Studio 里你看到的 `daily_active` 多行（同一天多个不同 `uid`）= **今日活跃通勤者名单**；行数应约等于当天 `daily.active` / API 里的 `todayActive`。

---

## `visitors` — 唯一通勤者

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `uid` | TEXT PK | 浏览器 `localStorage` 的 `line3-uid`（UUID） |
| `first_ts` | INTEGER | 首次进页时间戳（ms） |

- **何时写**：`POST /api/visit`，若该 `uid` 尚不存在则插入，同时 `meta.uniques += 1`。
- **不删、不更新**（第一版）。刷新、换站、再玩都不会再涨 `uniques`。

---

## `daily_active` — 今日活跃去重集合

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `day` | TEXT | `YYYY-MM-DD`（UTC+8） |
| `uid` | TEXT | 通勤者 |
| PK | `(day, uid)` | 同一天同一人只有一行 |

- **何时写**：`POST /api/visit`，若当天该 uid 尚无记录则插入，同时 `daily.active += 1`。
- **用途**：保证「今日活跃」不会因多次刷新虚高；Studio 里可点开核对有哪些设备。

---

## `meta` — 全站累计计数器

键值表：一行一个指标。

| `k` | 含义 | 写入来源 |
| --- | --- | --- |
| `visits` | 进页总次数（每次文档加载 +1） | `/api/visit` |
| `uniques` | 历史唯一通勤者数 | `/api/visit`（首次 uid） |
| `wins` | 成功挤上总次数 | `/api/round` |
| `fails` | 没挤上总次数 | `/api/round` |
| `pulls` | 扒拉总次数 | `/api/round` |
| `civil_wins` | 文明通关总次数（文明度 ≥ 90） | `/api/round` |

读 API 时拼成：

```json
{
  "visits": 0,
  "uniques": 0,
  "todayActive": 0,
  "wins": 0,
  "fails": 0,
  "pulls": 0,
  "civilWins": 0
}
```

其中 `todayActive` **不来自 meta**，而来自当天 `daily.active`。

---

## `daily` — 按日累计

| 列 | 说明 |
| --- | --- |
| `day` | PK，`YYYY-MM-DD`（UTC+8） |
| `active` | 当日唯一活跃通勤者数（由 `daily_active` 插入驱动） |
| `visits` | 当日进页次数 |
| `wins` / `fails` / `pulls` / `civil_wins` | 当日车厢增量合计 |

- 进页：`visits += 1`；若当日该 uid 首次活跃则 `active += 1`。
- 结算：`wins/fails/pulls/civil_wins` 按本局增量累加（`pulls` 单次封顶 20；胜负互斥 0/1）。

第一版氛围灯 UI **只读「全局 meta + 今日 active」**；`daily` 其它列留给以后做趋势，Studio 里可直接查。

---

## 写入路径（对照代码）

```text
文档加载
  └─ POST /api/visit { uid }
       ├─ meta.visits += 1
       ├─ daily[day].visits += 1
       ├─ 新 uid → visitors + meta.uniques += 1
       └─ 当日新 uid → daily_active + daily[day].active += 1

对局结束（或 pagehide beacon）
  └─ POST /api/round { wins, fails, pulls, civilWins }
       ├─ meta 对应键 += 增量
       └─ daily[day] 对应列 += 增量

展示
  ├─ 首页：visits / uniques / todayActive（门厅）
  └─ 结算：wins / fails / pulls / civilWins（车厢）
```

客户端：`src/atmosphere.ts`。服务端：`functions/api/*`、`functions/_lib/db.ts`。

## 故意不做的事

- 不存每一局明细、不存车站 id（按站热度第二期）
- 不存昵称 / 排行榜
- 不以 D1 回写 `line3-save`
- 本地 `wrangler pages dev` 与远端 `jiditie-stats` 是**两套数据**，Studio 只看远端

## 运维速查

```bash
npx wrangler d1 list
npm run d1:migrate:local    # 本地
npm run d1:migrate          # 远端
npx wrangler d1 execute jiditie-stats --remote --command "SELECT * FROM meta"
```
