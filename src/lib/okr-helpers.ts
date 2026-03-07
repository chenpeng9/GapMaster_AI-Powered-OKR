export function formatDate(dateStr?: string) {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function getScoreColor(score: number) {
  if (score <= 2) {
    return { bg: "bg-red-50/70", text: "text-red-600", border: "border-red-200/60", badgeBg: "bg-red-100" }
  }
  if (score <= 5) {
    return { bg: "bg-muted/40", text: "text-muted-foreground", border: "border-border/60", badgeBg: "bg-muted" }
  }
  if (score <= 7) {
    return { bg: "bg-blue-50/70", text: "text-blue-600", border: "border-blue-200/60", badgeBg: "bg-blue-100" }
  }
  return { bg: "bg-emerald-50/70", text: "text-emerald-600", border: "border-emerald-200/60", badgeBg: "bg-emerald-100" }
}

export function getFutureQuarters(count: number = 4): string[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const currentQ = Math.floor(month / 3) + 1
  const quarters: string[] = []
  let q = currentQ
  let y = year
  for (let i = 0; i < count; i++) {
    quarters.push(`${y}Q${q}`)
    q++
    if (q > 4) {
      q = 1
      y++
    }
  }
  return quarters
}

export const actionBtnBaseClass = "rounded p-1 transition"
export const deleteBtnStates = (active = false) =>
  active
    ? "opacity-80 text-red-500"
    : "opacity-40 hover:opacity-100 hover:bg-red-50 hover:text-red-600"
export const editBtnStates = (active = false) =>
  active
    ? "opacity-80 text-blue-500"
    : "opacity-40 hover:opacity-100 hover:bg-blue-50 hover:text-blue-600"

export function getKRTitleById(
  objectives: any[] | undefined,
  krId: number | null | undefined
): string | null {
  if (!krId || !objectives) return null
  for (let objIdx = 0; objIdx < objectives.length; objIdx++) {
    const obj = objectives[objIdx]
    if (Array.isArray(obj.key_results)) {
      for (let krIdx = 0; krIdx < obj.key_results.length; krIdx++) {
        const kr = obj.key_results[krIdx]
        if (kr.id === krId) {
          return `KR ${krIdx + 1}: ${kr.title}`
        }
      }
    }
  }
  return null
}
