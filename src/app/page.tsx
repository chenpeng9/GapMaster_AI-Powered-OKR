"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Target, LogOut, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { DashboardView } from "@/components/DashboardView"
import { OKRStrategyView } from "@/components/OKRStrategyView"
import { AnalyticsView } from "@/components/AnalyticsView"

type OkrDeleteType = { type: "objective" | "kr"; id: number }

export default function GapYearPilotDashboard() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()

  // --- 登录状态检查 ---
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // --- 基础状态 ---
  const [capture, setCapture] = useState("")
  const [feed, setFeed] = useState<any[]>([])
  const [judging, setJudging] = useState(false)
  const [loadingFeed, setLoadingFeed] = useState(true)
  const [objectives, setObjectives] = useState<any[]>([])

  // --- 分页状态 ---
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [feedFilter, setFeedFilter] = useState<{ type: "O" | "KR" | null; id: number | null }>({ type: null, id: null })
  
  // --- OKR 管理状态 ---
  const [okrLoading, setOkrLoading] = useState(false)
  const [okrError, setOkrError] = useState<string | null>(null)
  const [creatingObjective, setCreatingObjective] = useState(false)
  const [newObjectiveTitle, setNewObjectiveTitle] = useState("")
  const [newObjectiveQuarter, setNewObjectiveQuarter] = useState("")
  const [keyResultTitle, setKeyResultTitle] = useState("")
  const [keyResultTarget, setKeyResultTarget] = useState("")
  const [keyResultUnit, setKeyResultUnit] = useState("")
  const [krForObjectiveId, setKrForObjectiveId] = useState<number | null>(null)
  const [addingKeyResult, setAddingKeyResult] = useState(false)
  const [okrDeleteDialog, setOkrDeleteDialog] = useState<OkrDeleteType | null>(null)
  const [okrDeletingId, setOkrDeletingId] = useState<number | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // --- 修改密码状态 ---
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // --- MiniMax API Key 状态 ---
  const [minimaxApiKey, setMinimaxApiKey] = useState("")
  const [minimaxBaseUrl, setMinimaxBaseUrl] = useState("https://api.minimax.chat")
  const [minimaxApiKeyLoading, setMinimaxApiKeyLoading] = useState(false)
  const [minimaxApiKeySuccess, setMinimaxApiKeySuccess] = useState(false)
  const [minimaxApiKeyError, setMinimaxApiKeyError] = useState("")

  // --- 定时提醒状态 ---
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderWebhookUrl, setReminderWebhookUrl] = useState("")
  const [reminderTime, setReminderTime] = useState("21:00")
  const [reminderLoading, setReminderLoading] = useState(false)
  const [reminderSuccess, setReminderSuccess] = useState(false)
  const [reminderError, setReminderError] = useState("")

  // --- 数据初始化 ---
  useEffect(() => {
    if (user?.id) {
      fetchFeed(true);
      fetchObjectivesFull();
    }
  }, [user?.id])

  async function fetchFeed(isInitialLoad = false) {
    // 确保用户已登录
    if (!user?.id) return

    const currentPage = isInitialLoad ? 1 : page
    const from = (currentPage - 1) * 10
    const to = from + 9

    // 只在初始加载时设置 loadingFeed，加载更多时不设置
    if (isInitialLoad) {
      setLoadingFeed(true)
    }

    let query = supabase
      .from("logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to)

    // 如果有过滤条件，添加过滤
    if (feedFilter.type === "KR" && feedFilter.id) {
      query = query.eq("kr_id", feedFilter.id)
    } else if (feedFilter.type === "O" && feedFilter.id) {
      // 获取该 Objective 下的所有 KR ID
      const obj = objectives.find(o => o.id === feedFilter.id)
      if (obj && Array.isArray(obj.key_results)) {
        const krIds = obj.key_results.map((kr: any) => kr.id)
        query = query.in("kr_id", krIds)
      }
    }

    const { data } = await query

    if (isInitialLoad) {
      setFeed(data || [])
      setPage(2)
      setLoadingFeed(false)
    } else {
      setFeed(prev => [...prev, ...(data || [])])
      setPage(prev => prev + 1)
    }
    setHasMore(data?.length === 10)
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    await fetchFeed(false)
    setLoadingMore(false)
  }

  // 过滤变化时重置并重新查询
  function handleFilterChange(filter: { type: "O" | "KR" | null; id: number | null }) {
    setFeedFilter(filter)
    fetchFeed(true)
  }

  async function fetchObjectivesFull() {
    // 确保用户已登录
    if (!user?.id) return

    setOkrLoading(true)
    try {
      const { data, error } = await supabase
        .from("objectives")
        .select(`*, key_results (*)`)
        .eq("user_id", user.id)
        .order("id", { ascending: true }) // 升序排列，确保序号 1, 2, 3 稳定
      if (error) throw error
      setObjectives(data || [])
    } catch (e: any) {
      setOkrError(e?.message || "OKR 加载失败")
    } finally {
      setOkrLoading(false)
    }
  }

  // --- 同步公众号状态 ---
  const [wechatDialogOpen, setWechatDialogOpen] = useState(false)
  const [wechatContent, setWechatContent] = useState<{
    title: string
    content: string
    coverPrompt: string
  } | null>(null)
  const [wechatLoading, setWechatLoading] = useState(false)
  const [wechatError, setWechatError] = useState("")
  const [selectedLogForWechat, setSelectedLogForWechat] = useState<any>(null)

  // --- 同步公众号函数 ---
  async function handleSyncToWechat(log: any) {
    setSelectedLogForWechat(log)
    setWechatDialogOpen(true)
    setWechatContent(null)
    setWechatError("")

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setWechatError("请先登录")
      return
    }

    setWechatLoading(true)
    try {
      const resp = await fetch("/api/wechat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          logContent: log.content,
          logDate: log.created_at ? new Date(log.created_at).toLocaleDateString("zh-CN") : null
        }),
      })

      const data = await resp.json()
      console.log("WeChat API response:", resp.status, data)

      if (!resp.ok) {
        throw new Error(data.message || data.error || `请求失败 (${resp.status})`)
      }

      setWechatContent(data)
    } catch (err: any) {
      console.error("WeChat sync error:", err)
      setWechatError(err.message || "生成失败，请重试")
    } finally {
      setWechatLoading(false)
    }
  }

  async function copyWechatContent() {
    if (!wechatContent) return
    const text = `# ${wechatContent.title}\n\n${wechatContent.content}\n\n---\n\n封面提示词：\n${wechatContent.coverPrompt}`
    await navigator.clipboard.writeText(text)
  }

  // --- 核心逻辑：AI 审计与提交 ---
  async function handleSubmit() {
    if (!capture.trim() || judging) return

    // 获取 session token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push("/login")
      return
    }

    setJudging(true)
    try {
      const resp = await fetch("/api/judge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ content: capture.trim(), objectives }),
      })
      
      const data = await resp.json()
      
      // 1. 自动溯源 Objective (用于 UI 标签和颜色)
      let mappedObjectiveTitle = "未关联目标";
      const primaryKrId = data.primary_kr_id;
      
      if (primaryKrId && objectives.length > 0) {
        const objIndex = objectives.findIndex(obj => 
          obj.key_results?.some((kr: any) => kr.id === primaryKrId)
        );
        if (objIndex !== -1) {
          mappedObjectiveTitle = `Objective ${objIndex + 1}: ${objectives[objIndex].title}`;
        }
      }

      // 2. 写入日志（使用 AI 净化后的 analysis 作为理由）
      const { data: insertedRows, error } = await supabase
        .from("logs")
        .insert([{
          content: capture.trim(),
          score: data.score,
          category: data.category,
          reason: data.analysis,
          topic: mappedObjectiveTitle,
          kr_id: primaryKrId,
          user_id: user?.id,
        }])
        .select()

      if (!error && insertedRows && insertedRows.length) {
        setFeed((prev) => [insertedRows[0], ...prev])

        // 3. 严格审计加分：只有出现在 achieved_kr_ids 中的 KR 才执行进度 +1
        if (data.achieved_kr_ids && data.achieved_kr_ids.length > 0) {
          let hasRealProgress = false;
          for (const targetKrId of data.achieved_kr_ids) {
            const { data: krRows } = await supabase
              .from("key_results")
              .select("current_value")
              .eq("id", targetKrId)
              .maybeSingle();

            if (krRows) {
              await supabase
                .from("key_results")
                .update({ current_value: (krRows.current_value || 0) + 1 })
                .eq("id", targetKrId);
              hasRealProgress = true;
            }
          }
          if (hasRealProgress) await fetchObjectivesFull(); // 仅在有变动时刷新 Dashboard
        }
      }
      setCapture("")
    } catch (e) {
      console.error("Submission error:", e);
    } finally {
      setJudging(false)
    }
  }

  // --- 辅助管理函数 ---
  async function handleDelete() {
    if (deletingId || itemToDelete == null) return
    setDeletingId(itemToDelete)
    try {
      const { error } = await supabase.from("logs").delete().eq("id", itemToDelete).eq("user_id", user?.id)
      if (!error) setFeed((prev) => prev.filter((entry) => entry.id !== itemToDelete))
    } finally {
      setDeletingId(null); setItemToDelete(null);
    }
  }

  async function handleDeleteObjectiveConfirmed(id: number) {
    setOkrDeletingId(id)
    try {
      await supabase.from("objectives").delete().eq("id", id).eq("user_id", user?.id);
      await fetchObjectivesFull();
    } finally { setOkrDeleteDialog(null); setOkrDeletingId(null); }
  }

  async function handleDeleteKRConfirmed(id: number) {
    setOkrDeletingId(id)
    try {
      // 先获取该KR的objective_id，确保属于当前用户
      const { data: kr } = await supabase.from("key_results").select("objective_id").eq("id", id).maybeSingle()
      if (kr) {
        // 验证objective属于当前用户
        await supabase.from("objectives").delete().eq("id", kr.objective_id).eq("user_id", user?.id);
      }
      await fetchObjectivesFull();
    } finally { setOkrDeleteDialog(null); setOkrDeletingId(null); }
  }

  // --- 修改密码函数 ---
  async function handleChangePassword() {
    setPasswordError("")

    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的密码不一致")
      return
    }

    if (newPassword.length < 6) {
      setPasswordError("密码长度至少为 6 位")
      return
    }

    setPasswordLoading(true)

    try {
      // 验证当前密码
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      })

      if (signInError) {
        setPasswordError("当前密码不正确")
        setPasswordLoading(false)
        return
      }

      // 更新密码
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      setPasswordSuccess(true)
      setTimeout(() => {
        setPasswordDialogOpen(false)
        setPasswordSuccess(false)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }, 2000)
    } catch (err: any) {
      setPasswordError(err.message || "修改失败，请重试")
    } finally {
      setPasswordLoading(false)
    }
  }

  // --- MiniMax API Key 函数 ---
  async function fetchMinimaxApiKey() {
    if (!user) return
    const { data } = await supabase
      .from("user_settings")
      .select("minimax_api_key, minimax_base_url, reminder_enabled, reminder_webhook_url, reminder_time")
      .eq("user_id", user.id)
      .single()
    if (data?.minimax_api_key) {
      setMinimaxApiKey(data.minimax_api_key)
    }
    if (data?.minimax_base_url) {
      setMinimaxBaseUrl(data.minimax_base_url)
    }
    // 提醒设置
    setReminderEnabled(data?.reminder_enabled || false)
    setReminderWebhookUrl(data?.reminder_webhook_url || "")
    setReminderTime(data?.reminder_time || "21:00")
  }

  async function handleSaveMinimaxApiKey() {
    if (!user) {
      setMinimaxApiKeyError("用户未登录，请刷新页面")
      return
    }
    setMinimaxApiKeyError("")
    setMinimaxApiKeyLoading(true)

    console.log("Saving MiniMax API Key for user:", user.id)

    try {
      // 先尝试更新
      const { error: updateError } = await supabase
        .from("user_settings")
        .update({
          minimax_api_key: minimaxApiKey,
          minimax_base_url: minimaxBaseUrl,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)

      console.log("Update result:", updateError)

      // 如果没有记录需要更新，则插入
      if (updateError) {
        const { error: insertError } = await supabase
          .from("user_settings")
          .insert({
            user_id: user.id,
            minimax_api_key: minimaxApiKey,
            minimax_base_url: minimaxBaseUrl
          })

        console.log("Insert result:", insertError)

        if (insertError) {
          throw insertError
        }
      }

      setMinimaxApiKeySuccess(true)
      setTimeout(() => setMinimaxApiKeySuccess(false), 2000)
    } catch (err: any) {
      console.error("Save error:", err)
      setMinimaxApiKeyError(err.message || "保存失败，请重试")
    } finally {
      setMinimaxApiKeyLoading(false)
    }
  }

  // --- 定时提醒函数 ---
  async function handleSaveReminderSettings() {
    if (!user) {
      setReminderError("用户未登录，请刷新页面")
      return
    }

    // 验证 webhook URL
    if (reminderEnabled && !reminderWebhookUrl.trim()) {
      setReminderError("请填写 Webhook 地址")
      return
    }

    if (reminderEnabled && !isValidUrl(reminderWebhookUrl)) {
      setReminderError("请输入有效的 Webhook URL")
      return
    }

    setReminderError("")
    setReminderLoading(true)

    try {
      const { error: updateError } = await supabase
        .from("user_settings")
        .update({
          reminder_enabled: reminderEnabled,
          reminder_webhook_url: reminderEnabled ? reminderWebhookUrl.trim() : null,
          reminder_time: reminderTime,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)

      if (updateError) {
        // 尝试插入新记录
        const { error: insertError } = await supabase
          .from("user_settings")
          .insert({
            user_id: user.id,
            reminder_enabled: reminderEnabled,
            reminder_webhook_url: reminderEnabled ? reminderWebhookUrl.trim() : null,
            reminder_time: reminderTime
          })

        if (insertError) throw insertError
      }

      setReminderSuccess(true)
      setTimeout(() => setReminderSuccess(false), 2000)
    } catch (err: any) {
      setReminderError(err.message || "保存失败，请重试")
    } finally {
      setReminderLoading(false)
    }
  }

  function isValidUrl(string: string): boolean {
    try {
      new URL(string)
      return true
    } catch {
      return false
    }
  }

  function openEditObjective(obj: any) {
    setEditData({ id: obj.id, type: "O", title: obj.title || "" });
    setEditDialogOpen(true);
  }

  function openEditKR(kr: any) {
    setEditData({ id: kr.id, type: "KR", title: kr.title || "", target_value: Number(kr.target_value) });
    setEditDialogOpen(true);
  }

  async function handleEditDialogSave() {
    if (!editData) return
    setEditSaving(true)
    try {
      const table = editData.type === "O" ? "objectives" : "key_results"
      const payload: any = { title: editData.title.trim() }
      if (editData.type === "KR") payload.target_value = editData.target_value
      await supabase.from(table).update(payload).eq("id", editData.id)
      setEditDialogOpen(false); await fetchObjectivesFull();
    } finally { setEditSaving(false); }
  }

  async function handleCreateObjective(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setCreatingObjective(true);
    try {
      await supabase.from("objectives").insert([{ title: newObjectiveTitle.trim(), quarter: newObjectiveQuarter.trim(), user_id: user?.id }]);
      setNewObjectiveTitle(""); setNewObjectiveQuarter(""); await fetchObjectivesFull();
    } finally { setCreatingObjective(false); }
  }

  async function handleAddKeyResult(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setAddingKeyResult(true);
    try {
      await supabase.from("key_results").insert([{ objective_id: krForObjectiveId, title: keyResultTitle.trim(), target_value: Number(keyResultTarget), unit: keyResultUnit.trim() }]);
      setKeyResultTitle(""); setKeyResultTarget(""); setKeyResultUnit(""); setKrForObjectiveId(null); await fetchObjectivesFull();
    } finally { setAddingKeyResult(false); }
  }

  return (
    <main className="min-h-screen bg-background relative">
      {/* 精致的背景装饰 */}
      <div className="fixed inset-0 gradient-subtle pointer-events-none" />
      <div className="fixed inset-0 gradient-radial pointer-events-none" />

      <div className="mx-auto max-w-3xl px-4 py-12 relative">
        <header className="mb-10 flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shadow-glow">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">GapMaster</h1>
              <p className="text-xs text-muted-foreground mt-0.5">AI-Powered OKR Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{user?.email}</span>

            {/* 设置按钮 - 修改密码 */}
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={fetchMinimaxApiKey}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>个人设置</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  {/* MiniMax API 配置 */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">MiniMax API Key</label>
                      <p className="text-xs text-muted-foreground">
                        用于公众号内容同步功能
                      </p>
                      <Input
                        type="password"
                        value={minimaxApiKey}
                        onChange={(e) => setMinimaxApiKey(e.target.value)}
                        placeholder="输入你的 MiniMax API Key"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">MiniMax API 地址</label>
                      <p className="text-xs text-muted-foreground">
                        使用中转服务时填写，如留空则使用官方地址
                      </p>
                      <Input
                        value={minimaxBaseUrl}
                        onChange={(e) => setMinimaxBaseUrl(e.target.value)}
                        placeholder="https://api.minimax.chat"
                        className="mt-1"
                      />
                    </div>
                    {minimaxApiKeyError && (
                      <div className="p-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-lg">
                        {minimaxApiKeyError}
                      </div>
                    )}
                    {minimaxApiKeySuccess && (
                      <div className="p-2 text-sm text-green-500 bg-green-50 dark:bg-green-950/50 rounded-lg">
                        保存成功！
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={handleSaveMinimaxApiKey}
                      disabled={minimaxApiKeyLoading || !minimaxApiKey}
                    >
                      {minimaxApiKeyLoading ? "保存中..." : "保存 API 配置"}
                    </Button>
                  </div>

                  <hr className="border-muted" />

                  {/* 定时提醒配置 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">每日提醒</label>
                        <p className="text-xs text-muted-foreground">
                          如果当天没有记录日志，将自动推送提醒
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={reminderEnabled}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          reminderEnabled ? "bg-primary" : "bg-muted"
                        }`}
                        onClick={() => setReminderEnabled(!reminderEnabled)}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            reminderEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {reminderEnabled && (
                      <>
                        <div>
                          <label className="text-sm font-medium">Webhook 地址</label>
                          <p className="text-xs text-muted-foreground">
                            支持企业微信、钉钉、飞书等机器人 Webhook
                          </p>
                          <Input
                            type="url"
                            value={reminderWebhookUrl}
                            onChange={(e) => setReminderWebhookUrl(e.target.value)}
                            placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">提醒时间</label>
                          <select
                            value={reminderTime}
                            onChange={(e) => setReminderTime(e.target.value)}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="20:00">20:00</option>
                            <option value="21:00">21:00</option>
                            <option value="22:00">22:00</option>
                            <option value="23:00">23:00</option>
                          </select>
                        </div>
                      </>
                    )}

                    {reminderError && (
                      <div className="p-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-lg">
                        {reminderError}
                      </div>
                    )}
                    {reminderSuccess && (
                      <div className="p-2 text-sm text-green-500 bg-green-50 dark:bg-green-950/50 rounded-lg">
                        保存成功！
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={handleSaveReminderSettings}
                      disabled={reminderLoading}
                    >
                      {reminderLoading ? "保存中..." : "保存提醒设置"}
                    </Button>
                  </div>

                  <hr className="border-muted" />

                  {/* 修改密码 */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">修改密码</h3>
                    {passwordError && (
                      <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-lg mb-3">
                        {passwordError}
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="p-3 text-sm text-green-500 bg-green-50 dark:bg-green-950/50 rounded-lg mb-3">
                        密码修改成功！
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">当前密码</label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="输入当前密码"
                      />
                    </div>
                    <div className="space-y-2 mt-2">
                      <label className="text-sm font-medium">新密码</label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="至少 6 位"
                      />
                    </div>
                    <div className="space-y-2 mt-2">
                      <label className="text-sm font-medium">确认新密码</label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="再次输入新密码"
                      />
                    </div>
                    <Button
                      className="w-full mt-3"
                      onClick={handleChangePassword}
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? "修改中..." : "确认修改"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* 退出登录按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut()
                router.push("/login")
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-8 grid grid-cols-3 gap-2 p-1.5 bg-muted/50 rounded-xl">
            <TabsTrigger value="dashboard" className="tab-elegant data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </span>
            </TabsTrigger>
            <TabsTrigger value="okr" className="tab-elegant data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                OKR
              </span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="tab-elegant data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardView
              objectivesList={objectives} // 传入最新的 objectives 列表
              objectives={objectives}
              feed={feed}
              loadingFeed={loadingFeed}
              capture={capture}
              onCaptureChange={setCapture}
              judging={judging}
              onSubmit={handleSubmit}
              itemToDelete={itemToDelete}
              onItemToDeleteChange={setItemToDelete}
              deletingId={deletingId}
              onDelete={handleDelete}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              feedFilter={feedFilter}
              onFilterChange={handleFilterChange}
              onSyncToWechat={handleSyncToWechat}
            />
          </TabsContent>

          <TabsContent value="okr">
            <OKRStrategyView
              objectivesList={objectives}
              okrLoading={okrLoading}
              okrError={okrError}
              creatingObjective={creatingObjective}
              newObjectiveTitle={newObjectiveTitle}
              onNewObjectiveTitleChange={setNewObjectiveTitle}
              newObjectiveQuarter={newObjectiveQuarter}
              onNewObjectiveQuarterChange={setNewObjectiveQuarter}
              onCreateObjective={handleCreateObjective}
              keyResultTitle={keyResultTitle}
              onKeyResultTitleChange={setKeyResultTitle}
              keyResultTarget={keyResultTarget}
              onKeyResultTargetChange={setKeyResultTarget}
              keyResultUnit={keyResultUnit}
              onKeyResultUnitChange={setKeyResultUnit}
              krForObjectiveId={krForObjectiveId}
              onKrForObjectiveIdChange={setKrForObjectiveId}
              addingKeyResult={addingKeyResult}
              onAddKeyResult={handleAddKeyResult}
              okrDeleteDialog={okrDeleteDialog}
              onOkrDeleteDialogChange={setOkrDeleteDialog}
              okrDeletingId={okrDeletingId}
              onDeleteObjectiveConfirmed={handleDeleteObjectiveConfirmed}
              onDeleteKRConfirmed={handleDeleteKRConfirmed}
              editDialogOpen={editDialogOpen}
              onEditDialogOpenChange={setEditDialogOpen}
              editData={editData}
              onEditDataChange={setEditData}
              editSaving={editSaving}
              onEditSave={handleEditDialogSave}
              onOpenEditObjective={openEditObjective}
              onOpenEditKR={openEditKR}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsView feed={feed} objectives={objectives} />
          </TabsContent>
        </Tabs>

        {/* 同步公众号 Dialog */}
        <Dialog open={wechatDialogOpen} onOpenChange={setWechatDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>同步到公众号</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {wechatLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-muted-foreground">AI 生成中...</span>
                </div>
              )}

              {wechatError && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-lg">
                  {wechatError}
                </div>
              )}

              {wechatContent && !wechatLoading && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">标题</label>
                    <div className="mt-1 p-3 bg-muted/50 rounded-lg">{wechatContent.title}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">正文</label>
                    <div className="mt-1 p-3 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm">{wechatContent.content}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">封面提示词</label>
                    <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm font-mono">{wechatContent.coverPrompt}</div>
                  </div>
                  <Button className="w-full" onClick={copyWechatContent}>
                    一键复制全部内容
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}