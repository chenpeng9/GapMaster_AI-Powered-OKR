"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Send,
  Flame,
  FileText,
  Monitor,
  Trophy,
  CalendarDays,
  Trash2,
  CheckCircle,
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
}

export function DashboardView({
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
}: DashboardViewProps) {
  const [okrFilter, setOkrFilter] = useState<OkrFilterType>({ type: null, id: null })

  const filteredFeed = useMemo(() => {
    if (!okrFilter.type || !okrFilter.id) return feed
    if (okrFilter.type === "KR") {
      return feed.filter((entry) => entry.kr_id === okrFilter.id)
    }
    if (okrFilter.type === "O") {
      const obj = objectives?.find((o) => o.id === okrFilter.id)
      if (!obj || !Array.isArray(obj.key_results)) return []
      const krIds = obj.key_results.map((kr: any) => kr.id)
      return feed.filter((entry) => krIds.includes(entry.kr_id))
    }
    return feed
  }, [okrFilter, feed, objectives])

  return (
    <>
      {/* OKR Progress cards with click filter */}
      <section className="mb-12">
        <div className="flex items-center justify-between">
          <h2 className="mb-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            OKR Progress
          </h2>
          {okrFilter.type && (
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
              const isObjectiveSelected = okrFilter.type === "O" && okrFilter.id === obj.id

              const krs = Array.isArray(obj.key_results) ? obj.key_results : []
              const totalTarget = krs.reduce((sum: number, kr: any) => sum + (kr.target_value || 0), 0)
              const totalCurrent = krs.reduce((sum: number, kr: any) => sum + (kr.current_value || 0), 0)
              const objProgress = totalTarget > 0 ? Math.min(totalCurrent / totalTarget, 1) : 0

              return (
                <Card
                  key={obj.id}
                  className={`group border transition-shadow gap-2 ${themeColor.shadow} hover:shadow-sm ${
                    isObjectiveSelected ? "ring-2 ring-blue-300" : ""
                  }`}
                >
                  <CardHeader
                    className="pb-1 cursor-pointer select-none hover:bg-muted/30 rounded-t-lg transition-colors"
                    onClick={() => {
                      if (isObjectiveSelected) {
                        setOkrFilter({ type: null, id: null })
                      } else {
                        setOkrFilter({ type: "O", id: obj.id })
                      }
                    }}
                  >
                    {/* --- Objective 标题行响应式改造 --- */}
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
                          const isKRSelected = okrFilter.type === "KR" && okrFilter.id === kr.id
                          return (
                            <div
                              key={kr.id}
                              className={`flex flex-col md:flex-row md:items-center items-start gap-2 md:gap-4 py-1.5 first:pt-0 last:pb-0 cursor-pointer select-none rounded transition-colors ${
                                isKRSelected ? "bg-muted/50" : "hover:bg-muted/30"
                              }`}
                              onClick={() => {
                                if (isKRSelected) {
                                  setOkrFilter({ type: null, id: null })
                                } else {
                                  setOkrFilter({ type: "KR", id: kr.id })
                                }
                              }}
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

      {/* Quick Capture */}
      <section className="mb-12">
        <Textarea
          placeholder="What did you learn or build today?"
          className="min-h-[120px] resize-none border-border bg-background text-foreground placeholder:text-muted-foreground/60 text-sm leading-relaxed"
          value={capture}
          onChange={(e) => onCaptureChange(e.target.value)}
          disabled={judging}
        />
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            className="gap-2"
            onClick={onSubmit}
            disabled={judging || !capture.trim()}
          >
            {judging ? (
              <>
                <Send className="h-4 w-4 animate-spin" />
                Judging...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Execution Scoring Legend */}
      <section className="mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Execution Scoring
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
          <div className="flex flex-col gap-0.5 bg-red-50/60 border-l-4 border-red-200 px-3 py-2 rounded-sm">
            <div className="flex items-center gap-1 mb-0.5">
              <Flame className="h-3 w-3 text-red-500" />
              <span className="font-semibold text-sm text-red-600">0–2</span>
            </div>
            <div className="text-xs text-red-600/80 leading-tight font-normal">
              没有任何产出，纯粹的拖延或与目标完全无关的内耗
            </div>
          </div>
          <div className="flex flex-col gap-0.5 bg-muted/40 border-l-4 border-border px-3 py-2 rounded-sm">
            <div className="flex items-center gap-1 mb-0.5">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="font-semibold text-sm text-muted-foreground">3–5</span>
            </div>
            <div className="text-xs text-muted-foreground/80 leading-tight font-normal">
              被动输入（如阅读、调研、规划），但未转化为实质性的交付物
            </div>
          </div>
          <div className="flex flex-col gap-0.5 bg-blue-50/60 border-l-4 border-blue-200 px-3 py-2 rounded-sm">
            <div className="flex items-center gap-1 mb-0.5">
              <Monitor className="h-3 w-3 text-blue-500" />
              <span className="font-semibold text-sm text-blue-600">6–7</span>
            </div>
            <div className="text-xs text-blue-600/80 leading-tight font-normal">
              产出了具体的代码、文章或完成了节点任务，直接推动了KR的进度
            </div>
          </div>
          <div className="flex flex-col gap-0.5 bg-amber-50/50 border-l-4 border-amber-200 px-3 py-2 rounded-sm">
            <div className="flex items-center gap-1 mb-0.5">
              <Trophy className="h-3 w-3 text-amber-500" />
              <span className="font-semibold text-sm text-amber-600">8–10</span>
            </div>
            <div className="text-xs text-amber-600/80 leading-tight font-normal">
              极高价值的Alpha突破！如MVP成功上线、斩获真实用户或产生商业收益
            </div>
          </div>
        </div>
      </section>

      {/* Recent Feed */}
      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Recent Feed
        </h2>
        <div className="flex flex-col gap-3">
          {loadingFeed ? (
            <FancyLoader text="Loading entries…" />
          ) : filteredFeed.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm">
              No entries yet.
            </div>
          ) : (
            filteredFeed.map((entry) => {
              const colors = getScoreColor(entry.score)
              const krTitle = getKRTitleById(objectives, entry.kr_id)
              return (
                <div
                  key={entry.id}
                  className={`relative rounded-lg border ${colors.border} ${colors.bg} p-4`}
                >
                  <button
                    title="删除"
                    aria-label="删除"
                    onClick={() => onItemToDeleteChange(entry.id)}
                    disabled={deletingId === entry.id}
                    className={`absolute right-3 top-3 ${actionBtnBaseClass} ${deleteBtnStates(deletingId === entry.id)}`}
                    style={{ lineHeight: 0 }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="mb-2 flex items-center gap-2.5">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${colors.badgeBg} text-xs font-bold ${colors.text}`}
                    >
                      {entry.score}
                    </span>
                    <Badge className="h-7 px-2 ml-1 rounded-full border font-normal text-xs flex items-center gap-1 min-w-[80px] bg-gray-100 border-gray-300 text-gray-700">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="ml-1">{krTitle ? krTitle : "未关联 OKR"}</span>
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(entry.created_at) || formatDate(entry.date)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{entry.content}</p>
                  {(entry.category || entry.reason) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.category && <span className="font-semibold">{entry.category}</span>}
                      {entry.category && entry.reason && <span> – </span>}
                      {entry.reason}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Delete confirmation Dialog */}
      <Dialog open={itemToDelete !== null} onOpenChange={(open) => !open && onItemToDeleteChange(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除这条日志？</DialogTitle>
            <DialogDescription>
              此操作无法撤销。这条记录将从云端数据库中永久删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button variant="destructive" onClick={onDelete} disabled={deletingId !== null}>
              {deletingId !== null ? "正在删除..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
