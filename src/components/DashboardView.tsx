"use client"

import { useState, useMemo, useEffect, useRef, memo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Send,
  FileText,
  Monitor,
  Trophy,
  CalendarDays,
  Trash2,
  CheckCircle,
  Target,
  Mic,
  MicOff,
  ChevronRight,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  formatDate,
  getScoreColor,
  getKRTitleById,
  actionBtnBaseClass,
  deleteBtnStates,
} from "@/lib/okr-helpers"

function FancyLoader({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <svg className="animate-spin h-7 w-7 text-blue-500 mb-2" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-30"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-80"
          fill="currentColor"
          d="M22 12c0-5.523-4.477-10-10-10v4a6 6 0 0 1 6 6h4z"
        />
      </svg>
      <span className="text-muted-foreground text-sm">{text}</span>
    </div>
  )
}

export type OkrFilterType = { type: "O" | "KR" | null; id: number | null }

export interface DashboardViewProps {
  objectivesList: any[]
  objectives: any[]
  feed: any[]
  loadingFeed: boolean
  capture: string
  onCaptureChange: (v: string) => void
  judging: boolean
  onSubmit: () => void
  itemToDelete: number | null
  onItemToDeleteChange: (id: number | null) => void
  deletingId: number | null
  onDelete: () => void
  // 分页相关 props
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  // 过滤相关 props
  feedFilter?: { type: "O" | "KR" | null; id: number | null }
  onFilterChange?: (filter: { type: "O" | "KR" | null; id: number | null }) => void
  // 同步公众号
  onSyncToWechat?: (log: any) => void
}

export const DashboardView = memo(function DashboardView({
  objectivesList,
  objectives,
  feed,
  loadingFeed,
  capture,
  onCaptureChange,
  judging,
  onSubmit,
  itemToDelete,
  onItemToDeleteChange,
  deletingId,
  onDelete,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  feedFilter,
  onFilterChange,
  onSyncToWechat,
}: DashboardViewProps) {
  // 使用父组件传入的过滤条件，如果没有则使用本地状态
  const [localOkrFilter, setLocalOkrFilter] = useState<OkrFilterType>({ type: null, id: null })

  // 优先使用父组件传入的过滤条件
  const okrFilter = feedFilter !== undefined ? feedFilter : localOkrFilter

  const setOkrFilter = (filter: OkrFilterType) => {
    if (onFilterChange) {
      onFilterChange(filter)
    } else {
      setLocalOkrFilter(filter)
    }
  }

  // 处理 Objective 点击 - 使用 useCallback 优化
  const handleObjectiveClick = useCallback((objId: number, isObjectiveSelected: boolean) => {
    if (isObjectiveSelected) {
      setOkrFilter({ type: null, id: null })
    } else {
      setOkrFilter({ type: "O", id: objId })
    }
  }, [setOkrFilter])

  // 处理 KR 点击 - 使用 useCallback 优化
  const handleKRClick = useCallback((krId: number, isKRSelected: boolean) => {
    if (isKRSelected) {
      setOkrFilter({ type: null, id: null })
    } else {
      setOkrFilter({ type: "KR", id: krId })
    }
  }, [setOkrFilter])

  // --- 语音识别状态与逻辑 ---
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(false)
  const [showScoringLegend, setShowScoringLegend] = useState(false) // 评分说明默认折叠
  const isManuallyStoppedRef = useRef(false)

  useEffect(() => {
    // 确保在浏览器环境下运行
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        setSpeechRecognitionAvailable(true)
        const recognitionInstance = new SpeechRecognition()
        recognitionInstance.lang = 'zh-CN' // 设定为中文
        recognitionInstance.interimResults = true // 允许中间结果，实时显示
        recognitionInstance.continuous = true // 持续录音，不自动停止

        recognitionInstance.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('')
          // 如果当前输入框有内容，则加个空格追加；如果为空，直接填入
          onCaptureChange(capture ? `${capture} ${transcript}` : transcript)
        }

        recognitionInstance.onerror = (event: any) => {
          console.error("语音识别错误:", event.error)
          // 忽略 'no-speech' 错误，这是正常的静音检测
          if (event.error !== 'no-speech') {
            setIsListening(false)
            isManuallyStoppedRef.current = true
          }
          // 其他错误（如网络问题、权限拒绝）会停止录音
        }

        recognitionInstance.onend = () => {
          // 如果是手动停止的，或者用户主动点击停止，不再重启
          if (isManuallyStoppedRef.current) {
            setIsListening(false)
          } else {
            // 自动重启，保持持续录音
            try {
              recognitionInstance.start()
            } catch (e) {
              console.error("重启语音识别失败:", e)
              setIsListening(false)
            }
          }
        }

        setRecognition(recognitionInstance)
      } else {
        setSpeechRecognitionAvailable(false)
        console.warn('浏览器不支持 Web Speech API')
      }
    }
  }, [onCaptureChange])

  const toggleListening = () => {
    if (isListening) {
      // 手动停止
      recognition?.stop()
      isManuallyStoppedRef.current = true
      setIsListening(false)
    } else {
      // 启动前先检查浏览器支持
      if (!speechRecognitionAvailable) {
        alert('您的浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器。')
        return
      }
      
      if (!recognition) {
        alert('语音识别未初始化，请刷新页面重试。')
        return
      }
      
      // 重置手动停止标志
      isManuallyStoppedRef.current = false
      
      // 移动端需要 HTTPS
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.warn('语音识别在移动端需要 HTTPS 环境')
      }
      
      try {
        recognition.start()
        setIsListening(true)
      } catch (error: any) {
        console.error('启动语音识别失败:', error)
        // 更详细的错误提示
        if (error.message?.includes('permission')) {
          alert('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问。')
        } else if (error.message?.includes('not-allowed')) {
          alert('麦克风权限被拒绝，请允许后重试。')
        } else {
          alert(`启动失败：${error.message || error}`)
        }
        setIsListening(false)
      }
    }
  }
  // --- 语音逻辑结束 ---

  // 当父组件传入 feedFilter 时，数据已经过后端过滤，不需要再本地过滤
  // 只有当没有传入 feedFilter 时，才使用本地过滤
  const showLocalFilter = feedFilter === undefined
  const activeFilter = feedFilter !== undefined ? feedFilter : localOkrFilter

  const filteredFeed = useMemo(() => {
    // 如果父组件已经过滤了数据，直接返回
    if (!showLocalFilter) return feed

    if (!activeFilter.type || !activeFilter.id) return feed
    if (activeFilter.type === "KR") {
      return feed.filter((entry) => entry.kr_id === activeFilter.id)
    }
    if (activeFilter.type === "O") {
      const obj = objectives?.find((o) => o.id === activeFilter.id)
      if (!obj || !Array.isArray(obj.key_results)) return []
      const krIds = obj.key_results.map((kr: any) => kr.id)
      return feed.filter((entry) => krIds.includes(entry.kr_id))
    }
    return feed
  }, [feed, activeFilter, objectives, showLocalFilter])

  return (
    <>
      {/* OKR Progress cards with click filter */}
      <section className="mb-12">
        <div className="flex items-center justify-between">
          <h2 className="mb-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            OKR Progress
          </h2>
          {activeFilter.type && (
            <Button
              size="sm"
              variant="outline"
              className="mb-3 text-xs"
              onClick={() => setOkrFilter({ type: null, id: null })}
            >
              清除过滤
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-4">
          {(objectivesList || []).length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">暂无 OKR</div>
          ) : (
            (objectivesList || []).map((obj, idx) => {
              const colors = [
                {
                  theme: "blue",
                  progressBar: "bg-blue-500",
                  shadow: "hover:shadow-blue-200/60",
                },
                {
                  theme: "green",
                  progressBar: "bg-green-500",
                  shadow: "hover:shadow-green-200/60",
                },
                {
                  theme: "amber",
                  progressBar: "bg-amber-500",
                  shadow: "hover:shadow-amber-200/60",
                },
                {
                  theme: "violet",
                  progressBar: "bg-violet-500",
                  shadow: "hover:shadow-violet-200/60",
                },
              ]
              const colorIdx = idx % colors.length
              const themeColor = colors[colorIdx]
              const isObjectiveSelected = activeFilter.type === "O" && activeFilter.id === obj.id

              const krs = Array.isArray(obj.key_results) ? obj.key_results : []
              const totalTarget = krs.reduce((sum: number, kr: any) => sum + (kr.target_value || 0), 0)
              const totalCurrent = krs.reduce((sum: number, kr: any) => sum + (kr.current_value || 0), 0)
              const objProgress = totalTarget > 0 ? Math.min(totalCurrent / totalTarget, 1) : 0

              return (
                <Card
                  key={obj.id}
                  className={`group border border-border/60 shadow-sm hover:shadow-lg transition-all duration-300 ${themeColor.shadow} ${
                    isObjectiveSelected ? "ring-2 ring-primary/30" : ""
                  }`}
                >
                  <CardHeader
                    className="pb-3 cursor-pointer select-none hover:bg-muted/30 rounded-t-xl transition-all duration-200"
                    onClick={() => handleObjectiveClick(obj.id, isObjectiveSelected)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center items-start gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">
                          {`Objective ${idx + 1}:`}
                        </span>
                        <span className="font-bold text-base leading-snug break-words">
                          {obj.title}
                        </span>
                        {obj.quarter && (
                          <Badge className="shrink-0 py-0.5 px-2 h-min rounded bg-muted/70 text-xs text-muted-foreground border border-muted-foreground/10">
                            {obj.quarter}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-1/3">
                        <Progress
                          value={Math.round(objProgress * 100)}
                          className="flex-1 h-2 bg-muted/70 rounded-full min-w-0"
                          indicatorClassName={
                            objProgress === 1 ? "bg-green-500" : themeColor.progressBar
                          }
                        />
                        <div className="text-right shrink-0 text-xs text-muted-foreground w-10">
                          {totalTarget > 0 ? (
                            <>
                              <span
                                className={
                                  objProgress === 1 ? "text-green-600 font-semibold" : "font-semibold"
                                }
                              >
                                {Math.min(totalCurrent, totalTarget)}/{totalTarget}
                              </span>
                              {objProgress === 1 && (
                                <span className="ml-0.5">
                                  <Trophy className="w-3.5 h-3.5 inline-block text-green-500 align-middle" />
                                </span>
                              )}
                            </>
                          ) : (
                            <span>–</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-0 pt-0">
                    {krs.length > 0 && (
                      <div className="flex flex-col divide-y divide-muted/30">
                        {krs.map((kr: any, i: number) => {
                          const krCompleted =
                            (kr.current_value || 0) >= (kr.target_value || 0) && kr.target_value > 0
                          const krPct =
                            kr.target_value > 0
                              ? Math.min((kr.current_value || 0) / kr.target_value, 1)
                              : 0
                          const isKRSelected = activeFilter.type === "KR" && activeFilter.id === kr.id
                          return (
                            <div
                              key={kr.id}
                              className={`flex flex-col md:flex-row md:items-center items-start gap-2 md:gap-4 py-1.5 first:pt-0 last:pb-0 cursor-pointer select-none rounded transition-colors ${
                                isKRSelected ? "bg-muted/50" : "hover:bg-muted/30"
                              }`}
                              onClick={() => handleKRClick(kr.id, isKRSelected)}
                            >
                              <span className="w-full md:w-1/2 pr-2 text-sm text-muted-foreground break-words whitespace-normal font-medium">
                                {kr.title}
                              </span>
                              <div className="flex items-center gap-3 w-full md:flex-1 mt-1 md:mt-0">
                                <Progress
                                  value={Math.round(krPct * 100)}
                                  className="flex-1 h-2 bg-muted/70 rounded-full"
                                  indicatorClassName={
                                    krCompleted ? "bg-green-500" : themeColor.progressBar
                                  }
                                />
                                <span className="w-16 text-right shrink-0 flex items-center justify-end gap-1 text-xs">
                                  <span
                                    className={
                                      krCompleted ? "text-green-600 font-semibold" : "font-semibold"
                                    }
                                  >
                                    {Math.min(kr.current_value || 0, kr.target_value || 0)}
                                  </span>
                                  <span className="mx-0.5 text-muted-foreground opacity-70">/</span>
                                  <span className="text-muted-foreground">{kr.target_value}</span>
                                  {krCompleted && (
                                    <span className="ml-1 align-middle">
                                      <CheckCircle className="inline-block w-4 h-4 text-green-500" />
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </section>

      {/* Quick Capture (集成语音输入) */}
      <section className="mb-12">
        <div className="relative group">
          <Textarea
            placeholder="记录今天的工作进展...（点击麦克风支持语音输入）"
            className="min-h-[140px] resize-none pr-12 border-border/60 bg-card text-foreground placeholder:text-muted-foreground/50 text-sm leading-relaxed rounded-xl shadow-sm focus:shadow-md transition-all duration-300"
            value={capture}
            onChange={(e) => onCaptureChange(e.target.value)}
            disabled={judging}
          />
          {/* 麦克风悬浮按钮 */}
          <button
            onClick={toggleListening}
            className={`absolute top-4 right-4 p-2.5 rounded-full transition-all duration-300 ${
              isListening ? "bg-red-100 text-red-600 animate-pulse shadow-md" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:scale-110"
            }`}
            title={isListening ? "停止录音" : "语音输入"}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* 录音状态提示 */}
          {isListening && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 animate-fade-in">
               <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
               <span className="text-[10px] text-red-500 font-bold tracking-tighter uppercase">正在录音...</span>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            className="gap-2 px-6 rounded-lg bg-primary hover:bg-primary/90 transition-all duration-200 hover:shadow-md"
            onClick={onSubmit}
            disabled={judging || !capture.trim()}
          >
            {judging ? (
              <>
                <Send className="h-4 w-4 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                提交记录
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Execution Scoring Legend - Collapsible */}
      <section className="mb-10">
        <button
          onClick={() => setShowScoringLegend(!showScoringLegend)}
          className="flex items-center gap-2 mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${showScoringLegend ? 'rotate-90' : ''}`} />
          评分说明
        </button>
        {showScoringLegend && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 bg-red-50/60 border border-red-100/60 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-red-100 text-xs font-bold text-red-600">0-2</span>
              <span className="font-semibold text-sm text-red-700">无产出</span>
            </div>
            <div className="text-xs text-red-600/70 leading-relaxed">
              纯拖延或与目标无关的内耗
            </div>
          </div>
          <div className="flex flex-col gap-1 bg-muted/40 border border-border/40 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-bold text-muted-foreground">3-5</span>
              <span className="font-semibold text-sm text-muted-foreground">被动输入</span>
            </div>
            <div className="text-xs text-muted-foreground/70 leading-relaxed">
              阅读、调研、规划，未产出交付物
            </div>
          </div>
          <div className="flex flex-col gap-1 bg-blue-50/60 border border-blue-100/60 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-600">6-7</span>
              <span className="font-semibold text-sm text-blue-700">有效产出</span>
            </div>
            <div className="text-xs text-blue-600/70 leading-relaxed">
              产出代码、文章或完成节点任务
            </div>
          </div>
          <div className="flex flex-col gap-1 bg-emerald-50/60 border border-emerald-100/60 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-100 text-xs font-bold text-emerald-600">8-10</span>
              <span className="font-semibold text-sm text-emerald-700">高价值突破</span>
            </div>
            <div className="text-xs text-emerald-600/70 leading-relaxed">
              MVP上线、获取用户或商业收益
            </div>
          </div>
        </div>
        )}
      </section>

      {/* Recent Feed */}
      <section>
        <h2 className="mb-5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          最近的记录
        </h2>
        <div className="flex flex-col gap-4">
          {loadingFeed ? (
            <FancyLoader text="Loading entries…" />
          ) : filteredFeed.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm bg-muted/20 rounded-xl border border-dashed border-border/40">
              <div className="flex flex-col items-center gap-2">
                <svg className="w-10 h-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>暂无记录，开始你的第一条记录吧</p>
              </div>
            </div>
          ) : (
            filteredFeed.map((entry) => {
              const scoreColors = getScoreColor(entry.score);
              
              // 1. 动态寻找该日志所属的 Objective 及其索引
              const objIndex = objectives?.findIndex((obj) =>
                obj.key_results?.some((kr: any) => kr.id === entry.kr_id)
              );

              // 2. 定义 Objective 专属配色方案 (与进度条保持一致)
              const objThemes = [
                { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "text-blue-500" },
                { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: "text-green-500" },
                { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "text-amber-500" },
                { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", icon: "text-violet-500" },
              ];

              // 3. 如果找不到目标，使用灰色兜底
              const theme = objIndex !== -1 && objIndex !== undefined 
                ? objThemes[objIndex % objThemes.length] 
                : { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", icon: "text-gray-400" };

              const displayTitle = entry.topic || getKRTitleById(objectives, entry.kr_id) || "未关联目标";

              return (
                <div key={entry.id} className={`relative rounded-xl border ${scoreColors.border} ${scoreColors.bg} p-5 transition-all duration-300 hover:shadow-sm animate-fade-in-up`}>
                  <div className="flex flex-wrap items-center gap-3 w-full mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${scoreColors.badgeBg} text-sm font-bold ${scoreColors.text} shrink-0 shadow-sm`}>
                        {entry.score}
                      </span>

                      {/* --- 动态变色的 Objective 标签 --- */}
                      <Badge
                        className={`h-8 px-3 rounded-full border font-normal text-xs flex items-center gap-1.5 min-w-0 truncate max-w-[200px] sm:max-w-none shadow-sm ${theme.bg} ${theme.border} ${theme.text}`}
                      >
                        <Target className={`h-3.5 w-3.5 flex-shrink-0 ${theme.icon}`} />
                        <span className="ml-1 truncate font-medium">
                          {displayTitle}
                        </span>
                      </Badge>
                    </div>

                    {/* 日期和删除按钮部分保持不变 */}
                    <div className="ml-auto flex items-center gap-3 text-xs text-gray-400 shrink-0">
                      <span className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(entry.created_at) || formatDate(entry.date)}
                      </span>
                      {onSyncToWechat && (
                        <button
                          onClick={() => onSyncToWechat(entry)}
                          className={`${actionBtnBaseClass} p-1.5 rounded-md hover:bg-white/50`}
                          title="同步到公众号"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => onItemToDeleteChange(entry.id)}
                        className={`${actionBtnBaseClass} ${deleteBtnStates(deletingId === entry.id)} p-1.5 rounded-md hover:bg-white/50`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-foreground/90 mb-2">{entry.content}</p>
                  
                  {/* AI 分析部分保持不变 */}
                  {(entry.category || entry.reason) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.category && <span className="font-semibold">{entry.category}</span>}
                      {entry.category && entry.reason && <span> – </span>}
                      {entry.reason}
                    </p>
                  )}
                </div>
              );
            })
          )}

          {/* 加载更多按钮 */}
          {hasMore && onLoadMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="w-full max-w-xs"
              >
                {loadingMore ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    加载中...
                  </>
                ) : (
                  "加载更多"
                )}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Delete confirmation Dialog */}
      <Dialog open={itemToDelete !== null} onOpenChange={(open) => !open && onItemToDeleteChange(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/60">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-lg font-semibold">确认删除</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              此操作无法撤销。这条记录将从云端数据库中永久删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-lg">取消</Button>
            </DialogClose>
            <Button variant="destructive" onClick={onDelete} disabled={deletingId !== null} className="rounded-lg">
              {deletingId !== null ? "正在删除..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})