# migrations/ — D1 SQL 迁移

Wrangler 按文件名顺序把 SQL 应用到库 `jiditie-stats`。已应用记录写在库内 `d1_migrations` 表，**不要改已上线文件内容**；要改 schema 请新增 `0002_xxx.sql`。

| 文件 | 说明 |
| --- | --- |
| `0001_init.sql` | 初始四表：`meta` / `daily` / `visitors` / `daily_active` |

表含义见 [docs/d1-atmosphere.md](../docs/d1-atmosphere.md)。

## 命令

```bash
npm run d1:migrate:local   # 本地 .wrangler 库
npm run d1:migrate         # 远端生产库
```

仅当本目录有**新**迁移文件时才需要对远端再跑 migrate；日常发版只 `build` + `pages deploy`。
