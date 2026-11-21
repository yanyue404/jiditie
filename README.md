# 挤上 3 号线！

一款以广州地铁 3 号线早高峰为主题的轻量 2D 网页游戏。玩家需要观察上下车人流、寻找空隙，并通过“扒拉”改变局部人群结构，在车门关闭前成功进入车厢。

按 [`docs/prd.md`](./docs/prd.md) 开发：**无需登录、玩法纯前端可单机**。可选 Cloudflare D1「氛围灯」全站聚合统计（进页 / 唯一通勤者 / 胜负等）；API 不可用时静默降级，不影响开局。文档索引见 [`docs/README.md`](./docs/README.md)。

## 游戏特色

- 广州地铁 3 号线完整 34 站通勤战役
- 每站独立客流、NPC 配比、车门时间和特色机制
- 随关卡进度逐渐提高的人数、速度、拥挤度和时间压力
- 单车门上下车人流竞争
- 圆形碰撞、重量差异、局部排斥与连锁挤压
- 即时“扒拉”技能，可随机从左向右或从右向左拨开人群
- 通勤时间、体力、文明度、效率和星级评价
- 随机客流事件、冲刺客和换乘站 Boss
- 成就、动态称号、最佳成绩与本地存档
- 可选全站氛围灯（首页门厅指标、结算车厢指标）
- PC、手机竖屏、刘海屏及横屏布局适配
- 基于 Web Audio API 的程序化音效

## NPC 类型

游戏包含普通乘客、手机党、行李游客、地铁老手、大块头、老人、冲刺客、学生、快递员和游客。不同 NPC 拥有不同的移动速度、碰撞半径、重量和扒拉抗性。

## 操作方式

### PC

| 操作 | 按键 |
| --- | --- |
| 移动 | `WASD` 或方向键 |
| 扒拉 | `空格` |
| 暂停 | `Esc` |

每次按下空格会立即扒拉一次。扒拉方向在左→右和右→左之间随机选择。

### 移动端

- 左下角虚拟摇杆控制移动
- 右下角“扒拉！”按钮执行扒拉
- 支持竖屏、横屏和底部安全区

## 线路与关卡

线路包含海傍、番禺广场、汉溪长隆、客村、广州塔、珠江新城、体育西路、广州东站、嘉禾望岗、机场南、机场北，以及石牌桥至天河客运站支线等共 34 座车站。

关卡越往后将逐步出现：

- 更多站台、车内及下车乘客
- 更短的开门时间
- 更快的人群移动速度
- 更慢的体力恢复
- 更强的人群阻力
- 更多同时出现的冲刺客
- 换乘大站阶段性难度峰值

## 随机事件

每站会随机触发客流增大、大量乘客下车、行李箱封路、幸运空门、列车晚点或校园放学潮等事件。事件会实际改变上车人数、下车人数及车门开放时间。

## 通勤时间

- 出发时间：08:10
- 目标时间：09:00
- 成功通过车站会推进 1–2 分钟
- 错过列车会增加 3 分钟等待时间
- 最终站根据到达时间判定准时或迟到

## 技术栈

- Vite + TypeScript + Canvas 2D + Web Audio API
- 自研人群 AI 与空间哈希碰撞
- `localStorage` 个人存档（与全站统计各算各的）
- 可选：Cloudflare Pages Functions + D1（REST / `sendBeacon`，无 Durable Object / WebSocket）

## 环境要求

- Node.js 20 或更高版本
- npm 10 或更高版本
- Chrome、Edge、Safari 或 Android Chrome 等现代浏览器
- 本地联调氛围灯时需要 Wrangler（已在 `devDependencies`）

## 安装依赖

项目已通过 `.npmrc` 配置国内 npm 镜像：

```text
https://registry.npmmirror.com
```

```bash
npm install
```

## 本地开发

### 只玩前端（无氛围灯）

```bash
npm run dev
```

```text
http://localhost:5173
```

无 `/api`，氛围灯数字不会出现（静默）。

### 带 D1 氛围灯

```bash
npm run d1:migrate:local   # 首次或迁移变更后
npm run pages              # build + wrangler pages dev
```

```text
http://localhost:8788
```

首页「开始上班」上方会出现门厅指标；结算页显示车厢全局数。

## 生产构建与部署

正式域名：[https://jiditie.pages.dev](https://jiditie.pages.dev)（哈希子域是某次部署快照，分享用正式域名即可）。

**只需做一次（已完成可跳过）：**

```bash
npx wrangler d1 create jiditie-stats   # 把 database_id 写入 wrangler.toml
npm run d1:migrate                     # 远端建表；仅当 migrations/ 有新文件时再跑
```

Dashboard 确认 Pages 绑定：`DB` → `jiditie-stats`。

**以后每次发版（改了前端或 `functions/`）：**

```bash
npm run build
npx wrangler pages deploy dist
```

没改 SQL 迁移就不用再 `d1:migrate`；没改库绑定就不用再 create。

## API（氛围灯）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/stats` | 全局 + 今日活跃 |
| `POST` | `/api/visit` | `{ uid }` 进页；同日同 uid 今日活跃最多 +1 |
| `POST` | `/api/round` | 本局增量 `{ wins, fails, pulls, civilWins }`；关页可 beacon |

防刷：同源 Origin 校验 + 按 IP 滑动窗口限速。个人成就仍只信本地 `line3-save`。

## 项目结构

```text
.
├─ src/
│  ├─ main.ts           # 游戏主逻辑
│  ├─ atmosphere.ts     # 氛围灯客户端（visit / round / 展示）
│  ├─ style.css
│  ├─ campaign.css
│  └─ mobile.css
├─ functions/           # Pages Functions（见 functions/README.md）
├─ migrations/          # D1 迁移（见 migrations/README.md）
├─ docs/                # PRD / glossary / D1 说明 / ADR
├─ wrangler.toml
├─ index.html
└─ package.json
```

## 本地存档

游戏使用 `localStorage` 保存：

- 已解锁车站、各站最佳成绩
- 累计成功与失败、扒拉与文明通关
- 成就与当前称号
- 氛围灯用的匿名通勤者 `line3-uid`（非账号）

清除浏览器站点数据即可重置进度与设备 uid。

## 开源说明

项目中的角色、界面和音效均由程序化方式生成，不使用真实地铁录音或受版权保护的角色素材。本项目为游戏化创作，与广州地铁官方无隶属关系。
