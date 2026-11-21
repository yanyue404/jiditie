# functions/ — Pages Functions（氛围灯 API）

Cloudflare Pages 会把本目录编成边缘函数，与 `dist/` 静态资源同域部署。  
binding：`env.DB` → D1 `jiditie-stats`（见根目录 `wrangler.toml`）。

详细表结构：[docs/d1-atmosphere.md](../docs/d1-atmosphere.md)

## 路由

| 文件 | 方法 | 路径 | 作用 |
| --- | --- | --- | --- |
| `api/stats.ts` | GET | `/api/stats` | 读氛围灯数字 |
| `api/visit.ts` | POST | `/api/visit` | 进页：visits / uniques / 今日活跃 |
| `api/round.ts` | POST | `/api/round` | 本局增量：胜负 / 扒拉 / 文明通关 |

`_` 前缀目录不是路由：`_lib/` 为共享逻辑，`env.d.ts` 为本地类型桩。

## 本地

```bash
npm run d1:migrate:local
npm run pages    # http://localhost:8788
```

纯 `npm run dev`（Vite）没有本目录，氛围灯会静默不显示。
