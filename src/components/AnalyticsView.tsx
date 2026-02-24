"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  TrendingUp, 
  CheckCircle2, 
  BarChart3, 
  Target, 
  Zap,
  Calendar
} from "lucide-react"

interface AnalyticsViewProps {
  feed: any[]
  objectives: any[]
}

export function AnalyticsView({ feed, objectives }: AnalyticsViewProps) {
  // --- 数据处理逻辑 ---
  const stats = useMemo(() => {
    const now = new Date()
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(now.getDate() - i)
      return d.toISOString().split('T')[0]
    }).reverse()

    // 1. 按日期分组统计
    const dailyStats = last7Days.map(date => {
      const dayLogs = feed.filter(log => 
        (log.created_at || log.date).startsWith(date)
      )
      const avgScore = dayLogs.length 
        ? dayLogs.reduce((sum, l) => sum + (l.score || 0), 0) / dayLogs.length 
        : 0
      
      return {
        date: date.split('-').slice(1).join('/'), // 格式化为 MM/DD
        count: dayLogs.length,
        score: Math.round(avgScore * 10) / 10,
        achieved: dayLogs.filter(l => l.score >= 6).length
      }
    })

    // 2. 统计 Objective 分布
    const objDistribution: Record<string, number> = {}
    feed.forEach(log => {
      if (log.topic && log.topic !== "未关联目标") {
        objDistribution[log.topic] = (objDistribution[log.topic] || 0) + 1
      }
    })

    // 3. 计算本周关键指标
    const totalScore = feed.reduce((sum, l) => sum + (l.score || 0), 0)
    const avgScore = feed.length ? (totalScore / feed.length).toFixed(1) : "0"
    const executionRate = feed.length 
      ? Math.round((feed.filter(l => l.score >= 6).length / feed.length) * 100) 
      : 0

    return { dailyStats, objDistribution, avgScore, executionRate, totalLogs: feed.length }
  }, [feed])

  return (
    <div className="space-y-6 pb-12">
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">平均执行分</span>
            </div>
            <div className="text-2xl font-bold">{stats.avgScore}</div>
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 border-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">实质达成率</span>
            </div>
            <div className="text-2xl font-bold">{stats.executionRate}%</div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">本周动态数</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalLogs}</div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 border-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">活跃天数</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.dailyStats.filter(d => d.count > 0).length}/7
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 七日趋势图 - 视觉优化版 */}
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
              // 根据分数动态计算渐变色
              let barColorClass = "bg-muted/30"; // 默认/0分
              if (day.score > 0) {
                if (day.score < 3) barColorClass = "bg-gradient-to-t from-red-200 to-red-100 border-t border-red-300/50";
                else if (day.score < 6) barColorClass = "bg-gradient-to-t from-amber-200 to-amber-100 border-t border-amber-300/50";
                else if (day.score < 8) barColorClass = "bg-gradient-to-t from-blue-200 to-blue-100 border-t border-blue-300/50";
                else barColorClass = "bg-gradient-to-t from-green-200 to-green-100 border-t border-green-300/50";
              }

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="relative w-full flex flex-col items-center justify-end h-40 bg-muted/10 rounded-t-lg overflow-hidden">
                    {/* 柱子本体 */}
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-300 relative ${barColorClass} group-hover:-translate-y-1 group-hover:shadow-sm`}
                      style={{ height: `${day.score * 10}%`, minHeight: day.score > 0 ? '4px' : '0' }}
                    >
                      {/* Hover 精致气泡提示 */}
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
                  {/* 日期标签 */}
                  <span className="text-[10px] text-muted-foreground font-medium font-mono uppercase tracking-wider">{day.date}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 战略重心分析 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Strategic Focus (by Objective)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 pt-2">
            {Object.entries(stats.objDistribution).length > 0 ? (
              Object.entries(stats.objDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([title, count], i) => {
                  const percentage = Math.round((count / stats.totalLogs) * 100)
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium truncate max-w-[80%]">{title}</span>
                        <span className="text-muted-foreground">{count}次 ({percentage}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all" 
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

      {/* 底部 ENTJ 决策洞察 */}
      <div className="rounded-xl border border-dashed border-primary/30 p-4 bg-primary/5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
          <Zap className="h-3 w-3" />
          Executive Insight
        </h3>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {stats.executionRate >= 70 
            ? "本周执行效率极高。你目前表现出极强的实质交付能力，请继续保持当前的节奏，警惕陷入无意义的细节优化。" 
            : stats.executionRate >= 40 
            ? "执行力处于中等水平。存在部分‘基础铺垫’类任务占比过高的情况，建议下周强制增加 20% 的硬性产出（实质交付）。"
            : "警告：执行效率偏低。目前大部分动态属于‘偏离航向’或‘基础铺垫’，需要重新审视 KR 的可操作性。"}
        </p>
      </div>
    </div>
  )
}