-- =====================================================
-- 添加定时提醒功能支持
-- 请在 Supabase Dashboard -> SQL Editor 中执行
-- =====================================================

-- 新增提醒相关字段
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS reminder_time TEXT DEFAULT '21:00',
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- 创建索引加速查询（只索引启用提醒的用户）
CREATE INDEX IF NOT EXISTS idx_user_settings_reminder_enabled
ON user_settings(reminder_enabled)
WHERE reminder_enabled = TRUE;