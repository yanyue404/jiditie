-- 0001_init：氛围灯计数器账本（非事件流水）
-- day 字段语义为 UTC+8 的 YYYY-MM-DD，见 functions/_lib/db.ts dayKey()

-- 全站累计：k = visits|uniques|wins|fails|pulls|civil_wins
CREATE TABLE IF NOT EXISTS meta (
  k TEXT PRIMARY KEY,
  v INTEGER NOT NULL
);

-- 按日累计；active 由 daily_active 插入驱动
CREATE TABLE IF NOT EXISTS daily (
  day TEXT PRIMARY KEY,
  active INTEGER NOT NULL DEFAULT 0,
  visits INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  fails INTEGER NOT NULL DEFAULT 0,
  pulls INTEGER NOT NULL DEFAULT 0,
  civil_wins INTEGER NOT NULL DEFAULT 0
);

-- 终身唯一通勤者（浏览器 line3-uid）
CREATE TABLE IF NOT EXISTS visitors (
  uid TEXT PRIMARY KEY,
  first_ts INTEGER NOT NULL
);

-- 日 × uid 去重，支撑「今日活跃」
CREATE TABLE IF NOT EXISTS daily_active (
  day TEXT NOT NULL,
  uid TEXT NOT NULL,
  PRIMARY KEY (day, uid)
);
