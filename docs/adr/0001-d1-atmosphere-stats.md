# 全站氛围灯用纯 D1，不抄竹知了的 DO+WebSocket

挤地铁要加全站社交证明数字（门厅+车厢指标），参考竹知了计数。竹知了用 Durable Object 内嵌 SQLite + WebSocket，是因为「全球哇数当场跳」和在线人数。挤地铁第一版只要氛围灯展示，不改玩法、不要实时跳动，因此选用 Cloudflare D1 计数器 + Pages Functions REST/`sendBeacon`，不做 DO、不做 WS、不做事件流水。若日后要「此刻有多少人在挤」，再加 DO，而不是一开始双写。
