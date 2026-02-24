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
  const [capture, setCapture] = useState("")
  const [feed, setFeed] = useState<any[]>([])
  const [judging, setJudging] = useState(false)
  const [loadingFeed, setLoadingFeed] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)
  const [objectives, setObjectives] = useState<any[] | undefined>(undefined)

  // OKR Strategy Tab 状态
  const [okrLoading, setOkrLoading] = useState(false)
  const [okrError, setOkrError] = useState<string | null>(null)
  const [objectivesList, setObjectivesList] = useState<any[]>([])
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
  const [editData, setEditData] = useState<{
    id: number
    type: "O" | "KR"
    title: string
    target_value?: number
  } | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // 数据拉取
  useEffect(() => {
    let ignore = false
    async function fetchFeed() {
      setLoadingFeed(true)
      const { data } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false })
      if (!ignore && data) setFeed(data)
      setLoadingFeed(false)
    }
    fetchFeed()
    return () => {
      ignore = true
    }
  }, [])

  async function fetchObjectivesFull() {
    setOkrLoading(true)
    setOkrError(null)
    try {
      const { data, error } = await supabase
        .from("objectives")
        .select(`
          *,
          key_results (*)
        `)
        .order("id", { ascending: false })
      if (error) throw error
      setObjectivesList(data || [])
      setObjectives(data || [])
    } catch (e: any) {
      setOkrError(e?.message || "加载失败")
    }
    setOkrLoading(false)
  }

  useEffect(() => {
    fetchObjectivesFull()
  }, [])

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
      const krId = data.kr_id
      const { data: insertedRows, error } = await supabase
        .from("logs")
        .insert([
          {
            content: capture.trim(),
            score: data.score,
            category: data.category,
            reason: data.reason,
            topic: data.topic,
            kr_id: krId,
          },
        ])
        .select()
      if (!error && insertedRows && insertedRows.length) {
        setFeed((prev) => [insertedRows[0], ...prev])
        if (
          krId !== null &&
          typeof krId !== "undefined" &&
          Number(data.score) >= 6
        ) {
          try {
            const { data: krRows, error: krFetchError } = await supabase
              .from("key_results")
              .select("*")
              .eq("id", krId)
              .maybeSingle()
            if (krRows && !krFetchError) {
              const curr =
                typeof krRows.current_value === "number"
                  ? krRows.current_value
                  : 0
              const delta =
                typeof data.contribution === "number" && !isNaN(data.contribution)
                  ? data.contribution
                  : 1
              await supabase
                .from("key_results")
                .update({ current_value: curr + delta })
                .eq("id", krId)
              await fetchObjectivesFull()
            }
          } catch (e) {
            // ignore kr update errors for now
          }
        }
      }
      setCapture("")
    } catch (e) {
      // 错误处理略
    } finally {
      setJudging(false)
    }
  }

  async function handleDelete() {
    if (deletingId || itemToDelete == null) return
    setDeletingId(itemToDelete)
    try {
      const { error } = await supabase.from("logs").delete().eq("id", itemToDelete)
      if (!error) {
        setFeed((prev) => prev.filter((entry) => entry.id !== itemToDelete))
      }
    } finally {
      setDeletingId(null)
      setItemToDelete(null)
    }
  }

  async function handleDeleteObjectiveConfirmed(id: number) {
    if (!id) return
    setOkrDeletingId(id)
    try {
      await supabase.from("objectives").delete().eq("id", id)
      fetchObjectivesFull()
    } finally {
      setOkrDeleteDialog(null)
      setOkrDeletingId(null)
    }
  }

  async function handleDeleteKRConfirmed(id: number) {
    if (!id) return
    setOkrDeletingId(id)
    try {
      await supabase.from("key_results").delete().eq("id", id)
      fetchObjectivesFull()
    } finally {
      setOkrDeleteDialog(null)
      setOkrDeletingId(null)
    }
  }

  function openEditObjective(obj: any) {
    setEditData({
      id: obj.id,
      type: "O",
      title: obj.title || "",
    })
    setEditDialogOpen(true)
  }

  function openEditKR(kr: any) {
    setEditData({
      id: kr.id,
      type: "KR",
      title: kr.title || "",
      target_value:
        typeof kr.target_value === "number"
          ? kr.target_value
          : kr.target_value != null && !isNaN(Number(kr.target_value))
            ? Number(kr.target_value)
            : undefined,
    })
    setEditDialogOpen(true)
  }

  async function handleEditDialogSave() {
    if (!editData) return
    setEditSaving(true)
    try {
      if (editData.type === "O") {
        const updateObj: any = { title: (editData.title || "").trim() }
        if (!updateObj.title) return
        await supabase
          .from("objectives")
          .update(updateObj)
          .eq("id", editData.id)
      } else if (editData.type === "KR") {
        const updateObj: any = { title: (editData.title || "").trim() }
        if (
          typeof editData.target_value !== "undefined" &&
          editData.target_value !== null
        ) {
          updateObj.target_value = Number(editData.target_value)
        }
        if (!updateObj.title) return
        await supabase
          .from("key_results")
          .update(updateObj)
          .eq("id", editData.id)
      }
      setEditDialogOpen(false)
      setEditData(null)
      fetchObjectivesFull()
    } finally {
      setEditSaving(false)
    }
  }

  async function handleCreateObjective(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!newObjectiveTitle.trim() || !newObjectiveQuarter) return
    setCreatingObjective(true)
    try {
      const { error } = await supabase
        .from("objectives")
        .insert([
          { title: newObjectiveTitle.trim(), quarter: newObjectiveQuarter.trim() },
        ])
        .select()
      if (!error) {
        setNewObjectiveTitle("")
        setNewObjectiveQuarter("")
        fetchObjectivesFull()
      }
    } finally {
      setCreatingObjective(false)
    }
  }

  async function handleAddKeyResult(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (
      !krForObjectiveId ||
      !keyResultTitle.trim() ||
      !keyResultTarget.trim() ||
      !keyResultUnit.trim()
    )
      return
    setAddingKeyResult(true)
    try {
      const { error } = await supabase
        .from("key_results")
        .insert([
          {
            objective_id: krForObjectiveId,
            title: keyResultTitle.trim(),
            target_value: Number(keyResultTarget),
            unit: keyResultUnit.trim(),
          },
        ])
        .select()
      if (!error) {
        setKeyResultTitle("")
        setKeyResultTarget("")
        setKeyResultUnit("")
        setKrForObjectiveId(null)
        fetchObjectivesFull()
      }
    } finally {
      setAddingKeyResult(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              GapMaster
            </h1>
            <Badge variant="secondary" className="font-mono text-xs tracking-wide">
              MVP
            </Badge>
          </div>
        </header>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="dashboard" className="font-semibold text-base">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="okr" className="font-semibold text-base">
              OKR Strategy
            </TabsTrigger>
            <TabsTrigger value="analytics" className="font-semibold text-base">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardView
              objectivesList={objectivesList}
              objectives={objectives || []}
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
              objectivesList={objectivesList}
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
            <AnalyticsView feed={feed} objectives={objectives || []} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
