"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Trash2, Pencil } from "lucide-react"
import { Target, ArrowRight, Square } from "lucide-react"
import {
  getFutureQuarters,
  actionBtnBaseClass,
  deleteBtnStates,
  editBtnStates,
} from "@/lib/okr-helpers"

const OKR_THEME_COLORS = [
  {
    key: "blue",
    border: "border-blue-300",
    bg: "bg-blue-50/60",
    badge: "bg-blue-100 text-blue-700",
    icon: (props: any) => <Target {...props} className={`w-[16px] h-[16px] sm:w-4 sm:h-4 text-blue-500 ${props.className || ''}`} />,
    krIconBg: "bg-blue-200",
    pill: "bg-blue-100/80 text-blue-700 border border-blue-200/50",
  },
  {
    key: "green",
    border: "border-green-300",
    bg: "bg-green-50/60",
    badge: "bg-green-100 text-green-700",
    icon: (props: any) => <ArrowRight {...props} className={`w-[16px] h-[16px] sm:w-4 sm:h-4 text-green-500 ${props.className || ''}`} />,
    krIconBg: "bg-green-200",
    pill: "bg-green-100/80 text-green-700 border border-green-200/50",
  },
  {
    key: "amber",
    border: "border-amber-300",
    bg: "bg-amber-50/60",
    badge: "bg-amber-100 text-amber-700",
    icon: (props: any) => <Target {...props} className={`w-[16px] h-[16px] sm:w-4 sm:h-4 text-amber-500 ${props.className || ''}`} />,
    krIconBg: "bg-amber-200",
    pill: "bg-amber-100/80 text-amber-700 border border-amber-200/50",
  },
  {
    key: "violet",
    border: "border-violet-300",
    bg: "bg-violet-50/60",
    badge: "bg-violet-100 text-violet-700",
    icon: (props: any) => <Square {...props} className={`w-[16px] h-[16px] sm:w-4 sm:h-4 text-violet-500 ${props.className || ''}`} />,
    krIconBg: "bg-violet-200",
    pill: "bg-violet-100/80 text-violet-700 border border-violet-200/50",
  },
  {
    key: "rose",
    border: "border-rose-300",
    bg: "bg-rose-50/60",
    badge: "bg-rose-100 text-rose-700",
    icon: (props: any) => <ArrowRight {...props} className={`w-[16px] h-[16px] sm:w-4 sm:h-4 text-rose-400 ${props.className || ''}`} />,
    krIconBg: "bg-rose-200",
    pill: "bg-rose-100/80 text-rose-700 border border-rose-200/50",
  },
]

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

type OkrDeleteType = { type: "objective" | "kr"; id: number }

export interface OKRStrategyViewProps {
  objectivesList: any[]
  okrLoading: boolean
  okrError: string | null
  creatingObjective: boolean
  newObjectiveTitle: string
  onNewObjectiveTitleChange: (v: string) => void
  newObjectiveQuarter: string
  onNewObjectiveQuarterChange: (v: string) => void
  onCreateObjective: (e?: React.FormEvent) => void
  keyResultTitle: string
  onKeyResultTitleChange: (v: string) => void
  keyResultTarget: string
  onKeyResultTargetChange: (v: string) => void
  keyResultUnit: string
  onKeyResultUnitChange: (v: string) => void
  krForObjectiveId: number | null
  onKrForObjectiveIdChange: (id: number | null) => void
  addingKeyResult: boolean
  onAddKeyResult: (e?: React.FormEvent) => void
  okrDeleteDialog: OkrDeleteType | null
  onOkrDeleteDialogChange: (d: OkrDeleteType | null) => void
  okrDeletingId: number | null
  onDeleteObjectiveConfirmed: (id: number) => void
  onDeleteKRConfirmed: (id: number) => void
  editDialogOpen: boolean
  onEditDialogOpenChange: (open: boolean) => void
  editData: { id: number; type: "O" | "KR"; title: string; target_value?: number } | null
  onEditDataChange: (d: { id: number; type: "O" | "KR"; title: string; target_value?: number } | null) => void
  editSaving: boolean
  onEditSave: () => void
  onOpenEditObjective: (obj: any) => void
  onOpenEditKR: (kr: any) => void
}

export function OKRStrategyView({
  objectivesList,
  okrLoading,
  okrError,
  creatingObjective,
  newObjectiveTitle,
  onNewObjectiveTitleChange,
  newObjectiveQuarter,
  onNewObjectiveQuarterChange,
  onCreateObjective,
  keyResultTitle,
  onKeyResultTitleChange,
  keyResultTarget,
  onKeyResultTargetChange,
  keyResultUnit,
  onKeyResultUnitChange,
  krForObjectiveId,
  onKrForObjectiveIdChange,
  addingKeyResult,
  onAddKeyResult,
  okrDeleteDialog,
  onOkrDeleteDialogChange,
  okrDeletingId,
  onDeleteObjectiveConfirmed,
  onDeleteKRConfirmed,
  editDialogOpen,
  onEditDialogOpenChange,
  editData,
  onEditDataChange,
  editSaving,
  onEditSave,
  onOpenEditObjective,
  onOpenEditKR,
}: OKRStrategyViewProps) {
  const futureQuarters = useMemo(() => getFutureQuarters(4), [])

  const disableObjectiveBtn =
    creatingObjective || !newObjectiveTitle.trim() || !newObjectiveQuarter
  const disableKRBtn =
    addingKeyResult ||
    !krForObjectiveId ||
    !keyResultTitle.trim() ||
    !keyResultTarget.trim() ||
    !keyResultUnit.trim()

  return (
    <>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">新建 Objective</h2>
        <form onSubmit={onCreateObjective} className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Label htmlFor="objective-title" className="text-xs mb-1">
              Objective 标题
            </Label>
            <Input
              id="objective-title"
              value={newObjectiveTitle}
              onChange={(e) => onNewObjectiveTitleChange(e.target.value)}
              placeholder="例：产品 MVP 上线"
              required
            />
          </div>
          <div>
            <Label htmlFor="objective-quarter" className="text-xs mb-1">
              季度
            </Label>
            <Select value={newObjectiveQuarter} onValueChange={onNewObjectiveQuarterChange}>
              <SelectTrigger className="w-[120px] bg-background" id="objective-quarter">
                <SelectValue placeholder="选择季度" />
              </SelectTrigger>
              <SelectContent>
                {futureQuarters.map((qtr) => (
                  <SelectItem key={qtr} value={qtr}>
                    {qtr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full transition-colors" type="submit" disabled={disableObjectiveBtn}>
              {creatingObjective ? "创建中..." : "新建"}
            </Button>
          </div>
        </form>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">为 Objective 添加 Key Result</h2>
        <form onSubmit={onAddKeyResult} className="w-full flex flex-col gap-3">
          <div className="w-full flex flex-col gap-2">
            <div className="w-full flex flex-row flex-wrap gap-3 items-end">
              <div className="flex flex-col min-w-[12rem] w-48">
                <Label htmlFor="kr-objective" className="text-xs mb-1">
                  选择目标
                </Label>
                <Select
                  value={krForObjectiveId ? String(krForObjectiveId) : ""}
                  onValueChange={(v) => onKrForObjectiveIdChange(v === "" ? null : Number(v))}
                >
                  <SelectTrigger className="w-full min-w-[8rem] bg-background" id="kr-objective">
                    <SelectValue placeholder="Objective" />
                  </SelectTrigger>
                  <SelectContent>
                    {objectivesList.map((obj) => (
                      <SelectItem key={obj.id} value={String(obj.id)}>
                        {obj.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col flex-1 min-w-[160px]">
                <Label htmlFor="kr-title" className="text-xs mb-1">
                  KR 标题
                </Label>
                <Input
                  id="kr-title"
                  value={keyResultTitle}
                  onChange={(e) => onKeyResultTitleChange(e.target.value)}
                  placeholder="例：完成前端全部页面"
                  required
                  className="w-full"
                />
              </div>
              <div className="flex flex-col w-24 min-w-[6rem]">
                <Label htmlFor="kr-target" className="text-xs mb-1">
                  目标值
                </Label>
                <Input
                  id="kr-target"
                  type="number"
                  value={keyResultTarget}
                  onChange={(e) => onKeyResultTargetChange(e.target.value)}
                  placeholder="如 100"
                  required
                  min={0}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col w-24 min-w-[6rem]">
                <Label htmlFor="kr-unit" className="text-xs mb-1">
                  单位
                </Label>
                <Input
                  id="kr-unit"
                  value={keyResultUnit}
                  onChange={(e) => onKeyResultUnitChange(e.target.value)}
                  placeholder="如 次/篇/个/用户"
                  required
                  className="w-full"
                />
              </div>
              <div className="flex items-end w-32">
                <Button
                  className="w-full transition-colors"
                  type="submit"
                  disabled={disableKRBtn}
                >
                  {addingKeyResult ? "添加中..." : "添加 KR"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* OKR Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          onEditDialogOpenChange(open)
          if (!open) onEditDataChange(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑内容</DialogTitle>
          </DialogHeader>
          {editData && (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                await onEditSave()
              }}
            >
              <div className="flex flex-col gap-3 py-2">
                <Label className="text-xs" htmlFor="edit-title">
                  标题
                </Label>
                <Input
                  id="edit-title"
                  value={editData.title}
                  onChange={(e) =>
                    onEditDataChange(
                      editData ? { ...editData, title: e.target.value } : editData
                    )
                  }
                  required
                />
                {editData.type === "KR" && (
                  <>
                    <Label className="text-xs" htmlFor="edit-target-value">
                      目标值
                    </Label>
                    <Input
                      id="edit-target-value"
                      type="number"
                      value={
                        typeof editData.target_value !== "undefined" &&
                        editData.target_value !== null
                          ? editData.target_value
                          : ""
                      }
                      onChange={(e) => {
                        const v = e.target.value
                        onEditDataChange(
                          editData
                            ? {
                                ...editData,
                                target_value: v === "" ? undefined : Number(v),
                              }
                            : editData
                        )
                      }}
                      min={0}
                      required
                    />
                  </>
                )}
              </div>
              <DialogFooter className="gap-2 mt-6">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={editSaving}>
                    取消
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={
                    editSaving ||
                    !editData.title.trim() ||
                    (editData.type === "KR" &&
                      (typeof editData.target_value !== "number" || isNaN(editData.target_value)))
                  }
                >
                  {editSaving ? "保存中..." : "保存"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* OKR list */}
      <div>
        <h2 className="text-lg font-semibold mb-2">当前 Objectives & Key Results</h2>
        {okrLoading ? (
          <FancyLoader text="加载中..." />
        ) : okrError ? (
          <div className="p-4 text-destructive bg-destructive/10 rounded">{okrError}</div>
        ) : (
          <div className="flex flex-col space-y-3">
            {objectivesList.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center">暂无 OKR</div>
            ) : (
              objectivesList.map((obj, idx) => {
                const theme = OKR_THEME_COLORS[idx % OKR_THEME_COLORS.length]
                return (
                  <Card
                    key={obj.id}
                    className={`border ${theme.border} ${theme.bg} shadow-sm rounded-xl transition p-3.5`}
                  >
                    <CardHeader className="p-0 mb-0">
                      <CardTitle>
                        {/* 1. Objective 标题与右侧信息容器：严谨的左右分布 */}
                        <div className="flex flex-row items-start justify-between gap-3 w-full">
                          <span className="flex-1 text-base font-bold leading-snug break-words whitespace-normal text-gray-900">
                            {`Objective ${idx + 1}: `}{obj.title}
                          </span>
                          {/* 右侧始终靠右并且对齐到顶部 */}
                          <div className="flex items-center gap-1.5 shrink-0 ml-auto mt-0.5">
                            {obj.quarter && (
                              <span
                                className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold border ${theme.badge} border-opacity-40 border-transparent`}
                              >
                                {obj.quarter}
                              </span>
                            )}
                            <button
                              title="编辑"
                              type="button"
                              className={`${actionBtnBaseClass} ${editBtnStates(false)} p-[5px]`}
                              onClick={() => onOpenEditObjective(obj)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="删除"
                              type="button"
                              className={`${actionBtnBaseClass} ${deleteBtnStates(
                                okrDeletingId === obj.id && okrDeleteDialog?.type === "objective"
                              )} p-[5px]`}
                              onClick={() => onOkrDeleteDialogChange({ type: "objective", id: obj.id })}
                              disabled={okrDeletingId === obj.id}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="p-0">
                      {obj.key_results && obj.key_results.length > 0 ? (
                        <ul className="flex flex-col gap-0 mt-1">
                          {obj.key_results.map((kr: any, jdx: number) => (
                            <li
                              key={kr.id}
                              /* 2. KR 结构：Icon 在左侧独立占位，确保绝不串行 */
                              className="flex items-start gap-2 py-1.5 border-t border-gray-300/30 first:border-0"
                            >
                              {/* 强制 Icon 不被挤压且处于首位 */}
                              <div className="mt-[3px] shrink-0">
                                {theme.icon({ className: "w-3.5 h-3.5" })}
                              </div>
                              
                              {/* 3. KR 文本和工具栏放在同一个自适应换行流中 */}
                              {/* 3. 取消 flex 布局，改用纯文本流式排版 */}
                              <div className="flex-1 text-[13px] leading-[24px] text-gray-700 break-words">
                                <span className="font-semibold mr-1">{`KR ${jdx + 1}:`}</span>
                                {kr.title}
                                
                                {/* 关键修复：用 inline-flex 并配合 align-middle，让工具栏像“字符”一样紧随文字末尾 */}
                                <span className="inline-flex items-center gap-1.5 align-middle ml-2">
                                  {typeof kr.target_value !== "undefined" &&
                                    kr.target_value !== null &&
                                    String(kr.target_value).trim() !== "" && (
                                      <span
                                        className={`flex items-center gap-1 font-mono px-1.5 h-[22px] rounded-md text-[11px] font-semibold ${theme.pill}`}
                                      >
                                        {kr.target_value}
                                        {kr.unit ? (
                                          <span className="ml-0.5 font-sans">{kr.unit}</span>
                                        ) : null}
                                      </span>
                                  )}
                                  <button
                                    title="编辑"
                                    type="button"
                                    className={`${actionBtnBaseClass} ${editBtnStates(false)} p-[4px]`}
                                    onClick={() => onOpenEditKR(kr)}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    title="删除"
                                    type="button"
                                    className={`${actionBtnBaseClass} ${deleteBtnStates(
                                      okrDeletingId === kr.id && okrDeleteDialog?.type === "kr"
                                    )} p-[4px]`}
                                    onClick={() => onOkrDeleteDialogChange({ type: "kr", id: kr.id })}
                                    disabled={okrDeletingId === kr.id}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-muted-foreground px-1 mt-1">无 KR</div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation Dialog */}
      <Dialog
        open={okrDeleteDialog !== null}
        onOpenChange={(open) => !open && onOkrDeleteDialogChange(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {okrDeleteDialog?.type === "objective"
                ? "确认删除该目标？"
                : "确认删除该关键结果？"}
            </DialogTitle>
            <DialogDescription>
              {okrDeleteDialog?.type === "objective"
                ? "此操作无法撤销。该目标及其下属所有 KR 将被永久删除。"
                : "此操作无法撤销。该关键结果将被永久删除。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={async () => {
                if (okrDeleteDialog?.type === "objective") {
                  await onDeleteObjectiveConfirmed(okrDeleteDialog.id)
                } else if (okrDeleteDialog?.type === "kr") {
                  await onDeleteKRConfirmed(okrDeleteDialog.id)
                }
              }}
              disabled={okrDeletingId !== null}
            >
              {okrDeletingId !== null ? "正在删除..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}