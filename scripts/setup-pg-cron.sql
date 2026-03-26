-- =====================================================
-- 配置 pg_cron 定时任务
-- 请在 Supabase Dashboard -> SQL Editor 中执行
-- =====================================================

-- 1. 启用 pg_cron 扩展（如果尚未启用）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 启用 pg_net 扩展（用于 HTTP 请求）
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. 先取消旧的定时任务（如果存在）
SELECT cron.unschedule('daily-reminder-job');

-- 4. 创建新的定时任务：每小时执行一次
-- Edge Function 会检查每个用户的 reminder_time，只在设定时间窗口内发送

SELECT cron.schedule(
  'daily-reminder-job',
  '0 * * * *',  -- 每小时整点执行
  $$
  SELECT
    net.http_post(
      url := 'https://enbkjyuaulisiatdygkv.supabase.co/functions/v1/daily-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer /NNeBHnLFEtAYIw1H4butjXxXsmLEKBL+n9svONGE/Q='
      ),
      body := '{}'::jsonb
    );
  $$
);

-- 5. 验证任务已创建
SELECT jobid, schedule, command FROM cron.job WHERE jobname = 'daily-reminder-job';

-- 6. 查看任务执行历史
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;