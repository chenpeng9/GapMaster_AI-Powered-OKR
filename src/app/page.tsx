"use client"

import { useState, useEffect } from "react"
import { Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { DashboardView } from "@/components/DashboardView"
import { OKRStrategyView } from "@/components/OKRStrategyView"
import { AnalyticsView } from "@/components/AnalyticsView"

type OkrDeleteType = { type: "objective" | "kr"; id: number }

export default function GapYearPilotDashboard() {
  // --- 基础状态 ---
  const [capture, setCapture] = useState("")
  const [feed, setFeed] = useState<any[]>([])
  const [judging, setJudging] = useState(false)
  const [loadingFeed, setLoadingFeed] = useState(true)
  const [objectives, setObjectives] = useState<any[]>([])
  
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

  // --- 数据初始化 ---
  useEffect(() => {
    fetchFeed();
    fetchObjectivesFull();
  }, [])

  async function fetchFeed() {
    setLoadingFeed(true)
    const { data } = await supabase.from("logs").select("*").order("created_at", { ascending: false })
    if (data) setFeed(data)
    setLoadingFeed(false)
  }

  async function fetchObjectivesFull() {
    setOkrLoading(true)
    try {
      const { data, error } = await supabase
        .from("objectives")
        .select(`*, key_results (*)`)
        .order("id", { ascending: true }) // 升序排列，确保序号 1, 2, 3 稳定
      if (error) throw error
      setObjectives(data || [])
    } catch (e: any) {
      setOkrError(e?.message || "OKR 加载失败")
    } finally {
      setOkrLoading(false)
    }
  }

  // --- 核心逻辑：AI 审计与提交 ---
  async function handleSubmit() {
    if (!capture.trim() || judging) return
    setJudging(true)
    try {
      const resp = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const { error } = await supabase.from("logs").delete().eq("id", itemToDelete)
      if (!error) setFeed((prev) => prev.filter((entry) => entry.id !== itemToDelete))
    } finally {
      setDeletingId(null); setItemToDelete(null);
    }
  }

  async function handleDeleteObjectiveConfirmed(id: number) {
    setOkrDeletingId(id)
    try { 
      await supabase.from("objectives").delete().eq("id", id); 
      await fetchObjectivesFull();
    } finally { setOkrDeleteDialog(null); setOkrDeletingId(null); }
  }

  async function handleDeleteKRConfirmed(id: number) {
    setOkrDeletingId(id)
    try { 
      await supabase.from("key_results").delete().eq("id", id); 
      await fetchObjectivesFull();
    } finally { setOkrDeleteDialog(null); setOkrDeletingId(null); }
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
      await supabase.from("objectives").insert([{ title: newObjectiveTitle.trim(), quarter: newObjectiveQuarter.trim() }]);
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
          <Badge variant="secondary" className="font-mono text-xs tracking-wide bg-secondary/80 backdrop-blur-sm">
            v1.0
          </Badge>
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
      </div>
    </main>
  )
}