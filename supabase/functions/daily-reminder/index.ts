import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const CRON_SECRET = Deno.env.get("CRON_SECRET")!

interface UserSettings {
  user_id: string
  reminder_webhook_url: string
  reminder_time: string
}

// 检查当前时间是否在用户设定时间的 ±30 分钟内
function isWithinReminderWindow(reminderTime: string): boolean {
  // 获取当前北京时间 (UTC+8)
  const now = new Date()
  const beijingOffset = 8 * 60 // 分钟
  const utcOffset = now.getTimezoneOffset()
  const beijingTime = new Date(now.getTime() + (utcOffset + beijingOffset) * 60 * 1000)

  const currentHour = beijingTime.getHours()
  const currentMinute = beijingTime.getMinutes()
  const currentTotalMinutes = currentHour * 60 + currentMinute

  // 解析用户设定时间 (格式: "HH:MM")
  const [targetHour, targetMinute] = reminderTime.split(":").map(Number)
  const targetTotalMinutes = targetHour * 60 + targetMinute

  // 检查是否在前后30分钟内
  const diff = Math.abs(currentTotalMinutes - targetTotalMinutes)
  return diff <= 30
}

serve(async (req: Request) => {
  // 1. 验证请求来源
  const authHeader = req.headers.get("Authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })

  try {
    // 2. 获取当前日期
    const today = new Date().toISOString().split("T")[0]

    // 3. 查询所有启用提醒的用户
    const { data: usersWithReminder, error: fetchError } = await supabase
      .from("user_settings")
      .select("user_id, reminder_webhook_url, reminder_time")
      .eq("reminder_enabled", true)
      .not("reminder_webhook_url", "is", null)

    if (fetchError) throw fetchError

    console.log(`Found ${usersWithReminder?.length || 0} users with reminders enabled`)

    // 4. 检查每个用户今天是否有日志
    const results = []

    for (const user of usersWithReminder as UserSettings[]) {
      // 检查当前时间是否在用户设定的提醒时间窗口内
      if (!isWithinReminderWindow(user.reminder_time)) {
        console.log(`Skipping user ${user.user_id}: outside reminder window (${user.reminder_time})`)
        continue
      }

      // 检查今天是否已发送提醒
      const { data: alreadySent } = await supabase
        .from("user_settings")
        .select("last_reminder_sent_at")
        .eq("user_id", user.user_id)
        .single()

      if (alreadySent?.last_reminder_sent_at) {
        const lastSent = new Date(alreadySent.last_reminder_sent_at)
        const now = new Date()
        if (lastSent.toDateString() === now.toDateString()) {
          console.log(`Skipping user ${user.user_id}: already reminded today`)
          continue
        }
      }

      // 检查今天是否有日志
      const { data: todayLogs, error: logsError } = await supabase
        .from("logs")
        .select("id")
        .eq("user_id", user.user_id)
        .gte("created_at", `${today}T00:00:00Z`)
        .lte("created_at", `${today}T23:59:59Z`)
        .limit(1)

      if (logsError) {
        console.error(`Error checking logs for user ${user.user_id}:`, logsError)
        continue
      }

      // 5. 如果没有日志，发送提醒
      if (!todayLogs || todayLogs.length === 0) {
        console.log(`Sending reminder to user ${user.user_id}`)

        try {
          // 企业微信 markdown_v2 格式
          const message = "🎯 GapMaster 提醒\n\n今天还没有记录日志，记得打卡哦！\n\n<a href=\"https://gapmaster.eiden.top/\">👉 点击前往打卡</a>"
          const webhookResponse = await fetch(user.reminder_webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              msgtype: "markdown_v2",
              markdown_v2: {
                content: message
              }
            })
          })

          if (webhookResponse.ok) {
            // 更新最后提醒时间
            await supabase
              .from("user_settings")
              .update({ last_reminder_sent_at: new Date().toISOString() })
              .eq("user_id", user.user_id)

            results.push({ user_id: user.user_id, status: "sent" })
          } else {
            console.error(`Webhook failed for user ${user.user_id}:`, webhookResponse.status)
            results.push({ user_id: user.user_id, status: "failed", error: webhookResponse.status })
          }
        } catch (webhookError) {
          console.error(`Webhook error for user ${user.user_id}:`, webhookError)
          results.push({ user_id: user.user_id, status: "error", error: String(webhookError) })
        }
      } else {
        results.push({ user_id: user.user_id, status: "skipped_has_log" })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      date: today,
      processed: results.length,
      results
    }), {
      headers: { "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Edge function error:", error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})