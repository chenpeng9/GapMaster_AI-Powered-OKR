"use client";

import React, { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar, LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// --- 样式常量 ---
const COLORS = {
  primary: "#3b82f6",     // 实质交付 - 蓝色
  strategic: "#f59e0b",   // 战略突破 - 琥珀色
  foundation: "#10b981",  // 基础铺垫 - 绿色
  offtrack: "#ef4444",    // 偏离航向 - 红色
};

const CATEGORY_MAP: Record<string, string> = {
  "实质交付": COLORS.primary,
  "战略突破": COLORS.strategic,
  "基础铺垫": COLORS.foundation,
  "偏离航向": COLORS.offtrack,
};

// --- 自定义 Tooltip ---
// 扩展：tooltip 支持完整title显示
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // 为 barData 特别处理：展示 KR 全名
    const title = payload[0].payload && payload[0].payload.fullTitle
      ? payload[0].payload.fullTitle
      : payload[0].name;
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg max-w-xs">
        <p className="text-xs text-gray-400 mb-1 break-all">{label}</p>
        <p className="text-sm font-bold text-gray-800 break-all">
          {title}: <span className="text-blue-600">{payload[0].value.toFixed(1)}</span>
        </p>
      </div>
    );
  }
  return null;
};

// --- 自定义 Bar 条标签渲染器 ---
const CustomBarLabel = (props: any) => {
  const { x, y, value } = props;
  // x 强制锁定在图表最左侧起点，y 向上偏移 8px
  return (
    <text
      x={x}
      y={y - 8}
      fill="#374151"
      fontSize={13}
      fontWeight={500}
      textAnchor="start"
    >
      {value}
    </text>
  );
};

export function AnalyticsView({ feed, objectives }: { feed?: any[]; objectives?: any[] }) {
  const logs = feed ?? []
  const objs = objectives ?? []

  // 1. 数据处理：执行力曲线 (最近14天)
  const trendData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split("T")[0];
    });

    return last14Days.map(date => {
      const dayLogs = logs.filter(l => (l.created_at || l.date || "").toString().startsWith(date));
      const avgScore = dayLogs.length > 0 
        ? dayLogs.reduce((acc, curr) => acc + (curr.score || 0), 0) / dayLogs.length 
        : 0;
      return { date: date.slice(5), avgScore }; // 只保留 MM-DD
    });
  }, [logs]);

  // 2. 数据处理：战果构成 (环形图)
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach(l => {
      if (l.category) counts[l.category] = (counts[l.category] || 0) + 1;
    });
    return Object.keys(counts).map(name => ({ name, value: counts[name] }));
  }, [logs]);

  // 3. 数据处理：KR 投入度 (条形图)
  const barData = useMemo(() => {
    const krStats = objs.flatMap(obj => 
      (obj.key_results || []).map((kr: any) => {
        const totalScore = logs
          .filter(l => l.kr_id === kr.id)
          .reduce((acc, curr) => acc + (curr.score || 0), 0);
        // 标题放宽到40字符，不截断，大幅降低截断与重叠发生
        const titleText = kr.title.length > 40 ? `${kr.title.slice(0, 40)}...` : kr.title;
        return { 
          name: `KR: ${titleText}`, 
          fullTitle: `KR: ${kr.title}`, 
          score: totalScore 
        };
      })
    );
    return krStats.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [logs, objs]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 执行力曲线 */}
        <Card className="shadow-sm border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg">执行力曲线</CardTitle>
            <CardDescription>最近 14 天每日平均得分</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="avgScore" 
                  name="平均分"
                  stroke={COLORS.primary} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 战果构成 */}
        <Card className="shadow-sm border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg">战果构成</CardTitle>
            <CardDescription>不同类别的执行占比</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_MAP[entry.name] || COLORS.primary} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* KR 投入度 */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg">KR 投入度</CardTitle>
          <CardDescription>各 KR 累计获得的评分总和（反映精力分配）</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {/* 
              极简配置：margin 改为 { top: 30, right: 30, left: 20, bottom: 10 }
              去掉 CartesianGrid，不显示网格
              YAxis 只用于 LabelList，保持 hide
              标签使用自定义渲染器 CustomBarLabel
              Bar 支持轨道底色
            */}
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 30, right: 30, left: 20, bottom: 10 }}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                hide={true}
              />
              <Tooltip cursor={{ fill: "transparent" }} content={<CustomTooltip />} />
              <Bar
                dataKey="score"
                name="评分总和"
                fill={COLORS.primary}
                radius={[0, 4, 4, 0]}
                barSize={12}
                background={{ fill: '#f3f4f6', radius: 4 }}
              >
                <LabelList
                  dataKey="name"
                  content={<CustomBarLabel />}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}