"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import {
  TrendingUp,
  CheckCircle2,
  BarChart3,
  Target,
  Zap,
  Calendar,
  Sparkles,
  ChevronDown,
  Clock,
  RotateCcw
} from "lucide-react"

interface AnalyticsViewProps {
  feed: any[]
  objectives: any[]
}

interface WeekInfo {
  weekStart: string  // YYYY-MM-DD, 周一
  weekEnd: string    // YYYY-MM-DD, 周日
  label: string      // 显示文本: "本周 (3/24-3/30)"
}

// 获取周一日期
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// 获取周日日期
function getSunday(date: Date): Date {
  const monday = getMonday(date)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// 格式化日期为 MM/DD
function formatDateShort(dateStr: string): string {
  const parts = dateStr.split('-')
  return `${parts[1]}/${parts[2]}`
}

// 获取当前周信息
function getCurrentWeek(): WeekInfo {
  const now = new Date()
  const monday = getMonday(now)
  const sunday = getSunday(now)

  return {
    weekStart: formatDate(monday),
    weekEnd: formatDate(sunday),
    label: `本周 (${formatDateShort(formatDate(monday))}-${formatDateShort(formatDate(sunday))})`
  }
}

// 获取所有可用周（基于feed数据）
function getAvailableWeeks(feed: any[]): WeekInfo[] {
  if (!feed.length) return [getCurrentWeek()]

  const weeksMap = new Map<string, WeekInfo>()

  feed.forEach(log => {
    const logDate = new Date(log.created_at || log.date)
    const monday = getMonday(logDate)
    const sunday = getSunday(logDate)

    const weekStart = formatDate(monday)
    const weekEnd = formatDate(sunday)

    if (!weeksMap.has(weekStart)) {
      const isCurrentWeek = weekStart === getCurrentWeek().weekStart
      weeksMap.set(weekStart, {
        weekStart,
        weekEnd,
        label: isCurrentWeek
          ? `本周 (${formatDateShort(weekStart)}-${formatDateShort(weekEnd)})`
          : formatDateShort(weekStart) + '-' + formatDateShort(weekEnd)
      })
    }
  })

  return Array.from(weeksMap.values()).sort((a, b) =>
    b.weekStart.localeCompare(a.weekStart)
  )
}

// 根据周过滤feed
function filterFeedByWeek(feed: any[], weekInfo: WeekInfo): any[] {
  return feed.filter(log => {
    const logDate = (log.created_at || log.date).split('T')[0]
    return logDate >= weekInfo.weekStart && logDate <= weekInfo.weekEnd
  })
}

// 生成周的日期数组
function generateWeekDates(weekStart: string): string[] {
  const start = new Date(weekStart)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return formatDate(d)
  })
}

export function AnalyticsView({ feed, objectives }: AnalyticsViewProps) {
  const { user } = useAuth()

  // 周选择状态
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo>(getCurrentWeek())
  const [availableWeeks, setAvailableWeeks] = useState<WeekInfo[]>([])

  // AI洞察状态
  const [insightVersions, setInsightVersions] = useState<any[]>([])
  const [generatingInsight, setGeneratingInsight] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<any>(null)
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false)

  // 初始化可用周列表
  useEffect(() => {
    setAvailableWeeks(getAvailableWeeks(feed))
  }, [feed])

  // 加载当前周的洞察
  useEffect(() => {
    loadInsight()
  }, [selectedWeek, user])

  // 加载洞察
  async function loadInsight() {
    if (!user?.id) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const resp = await fetch(`/api/weekly-insights?week=${selectedWeek.weekStart}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

      if (resp.ok) {
        const data = await resp.json()
        setSelectedVersion(data)
      } else {
        setSelectedVersion(null)
      }
    } catch (e) {
      console.error("Load insight error:", e)
    }
  }

  // 生成AI洞察
  async function handleGenerateInsight() {
    if (!user?.id || generatingInsight) return

    setGeneratingInsight(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // 获取本周的日志数据
      const weekFeed = filterFeedByWeek(feed, selectedWeek)

      // 计算统计数据
      const weekDates = generateWeekDates(selectedWeek.weekStart)
      const dailyStats = weekDates.map(date => {
        const dayLogs = weekFeed.filter(log =>
          (log.created_at || log.date).startsWith(date)
        )
        const avgScore = dayLogs.length
          ? dayLogs.reduce((sum, l) => sum + (l.score || 0), 0) / dayLogs.length
          : 0
        return { count: dayLogs.length, score: avgScore }
      })

      const totalScore = weekFeed.reduce((sum, l) => sum + (l.score || 0), 0)
      const avgScore = weekFeed.length ? (totalScore / weekFeed.length).toFixed(1) : "0"
      const executionRate = weekFeed.length
        ? Math.round((weekFeed.filter(l => l.score >= 6).length / weekFeed.length) * 100)
        : 0
      const activeDays = dailyStats.filter(d => d.count > 0).length

      const resp = await fetch("/api/weekly-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          week_start: selectedWeek.weekStart,
          week_logs: weekFeed,
          objectives,
          stats: {
            totalLogs: weekFeed.length,
            avgScore,
            executionRate,
            activeDays
          }
        })
      })

      if (resp.ok) {
        const data = await resp.json()
        setSelectedVersion(data)
      } else {
        const error = await resp.json()
        alert(error.error || "生成失败，请重试")
      }
    } catch (e) {
      console.error("Generate insight error:", e)
      alert("生成失败，请重试")
    } finally {
      setGeneratingInsight(false)
    }
  }

  // 加载版本列表
  async function loadVersions() {
    if (!user?.id) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const resp = await fetch(`/api/weekly-insights/versions?week=${selectedWeek.weekStart}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

      if (resp.ok) {
        const data = await resp.json()
        setInsightVersions(data.versions)
        setVersionsDialogOpen(true)
      }
    } catch (e) {
      console.error("Load versions error:", e)
    }
  }

  // 选择版本查看
  function handleSelectVersion(version: any) {
    setSelectedVersion(version)
    setVersionsDialogOpen(false)
  }

  // 周切换
  function handleWeekChange(week: WeekInfo) {
    setSelectedWeek(week)
  }

  // 计算统计数据
  const stats = useMemo(() => {
    const weekFeed = filterFeedByWeek(feed, selectedWeek)
    const weekDates = generateWeekDates(selectedWeek.weekStart)

    // 按日期分组统计
    const dailyStats = weekDates.map(date => {
      const dayLogs = weekFeed.filter(log =>
        (log.created_at || log.date).startsWith(date)
      )
      const avgScore = dayLogs.length
        ? dayLogs.reduce((sum, l) => sum + (l.score || 0), 0) / dayLogs.length
        : 0

      return {
        date: date.split('-').slice(1).join('/'),
        count: dayLogs.length,
        score: Math.round(avgScore * 10) / 10,
        achieved: dayLogs.filter(l => l.score >= 6).length
      }
    })

    // 统计 Objective 分布
    const objDistribution: Record<string, number> = {}
    weekFeed.forEach(log => {
      if (log.topic && log.topic !== "未关联目标") {
        objDistribution[log.topic] = (objDistribution[log.topic] || 0) + 1
      }
    })

    // 计算本周关键指标
    const totalScore = weekFeed.reduce((sum, l) => sum + (l.score || 0), 0)
    const avgScore = weekFeed.length ? (totalScore / weekFeed.length).toFixed(1) : "0"
    const executionRate = weekFeed.length
      ? Math.round((weekFeed.filter(l => l.score >= 6).length / weekFeed.length) * 100)
      : 0

    return { dailyStats, objDistribution, avgScore, executionRate, totalLogs: weekFeed.length }
  }, [feed, selectedWeek])

  // 格式化时间
  function formatTime(dateStr: string): string {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-8 pb-12">
      {/* 页面标题 + 周选择器 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            数据分析
          </h2>
          <p className="text-sm text-muted-foreground mt-1">追踪你的 OKR 执行进度</p>
        </div>

        {/* 周选择器 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[180px]">
              {selectedWeek.label}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <ScrollArea className="h-80">
              <div className="p-1">
                {availableWeeks.map(week => (
                  <button
                    key={week.weekStart}
                    onClick={() => handleWeekChange(week)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedWeek.weekStart === week.weekStart
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {week.label}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-none shadow-sm hover:shadow-md transition-shadow rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">平均执行分</span>
            </div>
            <div className="text-3xl font-bold">{stats.avgScore}</div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 border-none shadow-sm hover:shadow-md transition-shadow rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">实质达成率</span>
            </div>
            <div className="text-3xl font-bold">{stats.executionRate}%</div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-none shadow-sm hover:shadow-md transition-shadow rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">本周动态数</span>
            </div>
            <div className="text-3xl font-bold">{stats.totalLogs}</div>
          </CardContent>
        </Card>

        <Card className="bg-violet-50/50 border-none shadow-sm hover:shadow-md transition-shadow rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-violet-600 mb-2">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">活跃天数</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.dailyStats.filter(d => d.count > 0).length}/7
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 七日趋势图 */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/30">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            近 7 天执行力趋势
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-48 flex items-end justify-between gap-3">
            {stats.dailyStats.map((day, i) => {
              let barColorClass = "bg-muted/30"
              if (day.score > 0) {
                if (day.score < 3) barColorClass = "bg-gradient-to-t from-red-200 to-red-100 border-t border-red-300/50"
                else if (day.score < 6) barColorClass = "bg-gradient-to-t from-amber-200 to-amber-100 border-t border-amber-300/50"
                else if (day.score < 8) barColorClass = "bg-gradient-to-t from-blue-200 to-blue-100 border-t border-blue-300/50"
                else barColorClass = "bg-gradient-to-t from-green-200 to-green-100 border-t border-green-300/50"
              }

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="relative w-full flex flex-col items-center justify-end h-40 bg-muted/10 rounded-t-lg overflow-hidden">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 relative ${barColorClass} group-hover:-translate-y-1 group-hover:shadow-sm`}
                      style={{ height: `${day.score * 10}%`, minHeight: day.score > 0 ? '4px' : '0' }}
                    >
                      {day.score > 0 && (
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center z-20 pointer-events-none drop-shadow-sm">
                          <div className="bg-popover text-popover-foreground text-[11px] font-bold px-2.5 py-1 rounded-md border whitespace-nowrap flex items-center">
                            {day.score} <span className="text-[9px] font-normal text-muted-foreground ml-1">分</span>
                          </div>
                          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-popover -mt-[1px]"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium font-mono uppercase tracking-wider">{day.date}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 战略重心分析 */}
      <Card className="overflow-hidden rounded-xl">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            战略重心分布
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-5">
            {Object.entries(stats.objDistribution).length > 0 ? (
              Object.entries(stats.objDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([title, count], i) => {
                  const percentage = Math.round((count / stats.totalLogs) * 100)
                  const colors = ["bg-primary", "bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500"]
                  const barColor = colors[i % colors.length]
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium truncate max-w-[80%]">{title}</span>
                        <span className="text-muted-foreground text-xs">{count}次 ({percentage}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground italic">
                暂无足够数据进行战略重心分析
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI 执行洞察 */}
      <Card className="overflow-hidden rounded-xl border border-primary/20">
        <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-violet-5">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI 执行洞察
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {!selectedVersion ? (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                点击下方按钮，让AI分析本周执行情况
              </p>
              <Button onClick={handleGenerateInsight} disabled={generatingInsight}>
                {generatingInsight ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    生成 AI 洞察
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 洞察内容 */}
              <div className="space-y-4">
                {selectedVersion.summary && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">本周执行总结</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedVersion.summary}</p>
                  </div>
                )}

                {selectedVersion.okr_progress && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">OKR进度分析</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedVersion.okr_progress}</p>
                  </div>
                )}

                {selectedVersion.next_steps && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">下周行动建议</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{selectedVersion.next_steps}</p>
                  </div>
                )}
              </div>

              {/* 统计快照 */}
              {selectedVersion.total_logs !== undefined && (
                <div className="pt-4 border-t text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>快照: {selectedVersion.total_logs}条日志 · {selectedVersion.avg_score}分 · {selectedVersion.execution_rate}%达成率</span>
                  </div>
                </div>
              )}

              {/* 底部操作 */}
              <div className="pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(selectedVersion.created_at)}</span>
                  {insightVersions.length > 0 && (
                    <span className="text-primary">· v{selectedVersion.version}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={loadVersions}>
                        历史版本
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>历史版本</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        {insightVersions.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => handleSelectVersion(v)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              selectedVersion?.id === v.id ? "bg-primary/10 border-primary" : "hover:bg-muted"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">版本 {v.version}</span>
                              <span className="text-xs text-muted-foreground">{formatTime(v.created_at)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {v.total_logs}条日志 · {v.avg_score}分 · {v.execution_rate}%
                            </div>
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="sm" onClick={handleGenerateInsight} disabled={generatingInsight}>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    重新生成
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
