import OpenAI from "openai";
import { NextResponse } from "next/server";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { createClient } from "@supabase/supabase-js";

// 1. 环境检查：本地开发走 Clash 代理，线上环境直连
if (process.env.NODE_ENV === "development") {
  console.log("Detected development environment, setting up proxy...");
  const proxyAgent = new ProxyAgent("http://127.0.0.1:7890");
  setGlobalDispatcher(proxyAgent);
}

// 2. 初始化 DeepSeek (兼容 OpenAI API)
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: "https://api.deepseek.com"
});

// 3. 创建服务器端 Supabase 客户端
function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 4. 创建服务端客户端（绕过RLS，用于写入数据）
function getSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 4. 验证用户认证
async function verifyAuth(request: Request) {
  const supabase = getSupabaseServerClient();

  // 从请求头获取 token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return { error: "Missing authorization header", user: null };
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: error?.message || "Invalid token", user: null };
  }

  return { error: null, user };
}

// 5. 获取周的开始和结束日期
function getWeekRange(weekStart: string) {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // 加6天到周日

  return {
    week_start: start.toISOString().split('T')[0],
    week_end: end.toISOString().split('T')[0]
  };
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 格式化日期为 MM/DD
function formatDateShort(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parts[1]}/${parts[2]}`;
}

// GET - 获取指定周的洞察
export async function GET(req: Request) {
  const { error: authError, user } = await verifyAuth(req);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", message: authError || "Please login first" },
      { status: 401 }
    );
  }

  try {
    const url = new URL(req.url);
    const weekParam = url.searchParams.get('week');

    if (!weekParam) {
      return NextResponse.json(
        { error: "Missing week parameter" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 获取该周最新版本的洞察
    const { data, error } = await supabase
      .from("weekly_insights")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekParam)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { message: "No insights found for this week" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("GET Weekly Insights Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

// POST - 生成或更新周洞察
export async function POST(req: Request) {
  const { error: authError, user } = await verifyAuth(req);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", message: authError || "Please login first" },
      { status: 401 }
    );
  }

  try {
    const { week_start, week_logs, objectives, stats } = await req.json();

    if (!week_start) {
      return NextResponse.json(
        { error: "Missing week_start parameter" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const supabaseAdmin = getSupabaseServiceClient();
    const { week_start: ws, week_end: we } = getWeekRange(week_start);

    // 获取上周的数据作为参考
    const lastWeekDate = new Date(ws);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeekStart = formatDate(lastWeekDate);
    const lastWeekRange = getWeekRange(lastWeekStart);

    // 获取上周的洞察
    const { data: lastWeekInsight } = await supabase
      .from("weekly_insights")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", lastWeekStart)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 构建OKR上下文
    let okrContextString = "";
    if (Array.isArray(objectives) && objectives.length > 0) {
      objectives.forEach((obj: any, idx: number) => {
        okrContextString += `Objective ${idx + 1}: ${obj.title}\n`;
        if (Array.isArray(obj.key_results)) {
          obj.key_results.forEach((kr: any) => {
            okrContextString += `  - KR: ${kr.title} (当前: ${kr.current_value || 0}/${kr.target_value})\n`;
          });
        }
      });
    }

    // 构建日志上下文
    const logsContext = Array.isArray(week_logs) && week_logs.length > 0
      ? week_logs.map((log: any) => `- [${log.score}分] ${log.category || '未分类'}: ${log.content}`).join('\n')
      : '(本周暂无日志记录)';

    // 构建统计数据
    const statsStr = `- 总日志数: ${stats?.totalLogs || 0}\n- 平均分: ${stats?.avgScore || 0}\n- 达成率: ${stats?.executionRate || 0}%\n- 活跃天数: ${stats?.activeDays || 0}/7`;

    // 构建上周执行回顾（如果存在）
    let lastWeekContext = "";
    if (lastWeekInsight) {
      lastWeekContext = `
### 上周执行回顾 (${formatDateShort(lastWeekRange.week_start)}-${formatDateShort(lastWeekRange.week_end)})
- 上周总结: ${lastWeekInsight.summary || '暂无'}
- 上周OKR进展: ${lastWeekInsight.okr_progress || '暂无'}
- 上周执行数据: ${lastWeekInsight.total_logs}条日志 · ${lastWeekInsight.avg_score}分 · ${lastWeekInsight.execution_rate}%达成率
`;
    }

    // AI Prompt
    const prompt = `
你是「GapMaster」的AI执行顾问，基于用户的OKR、本周日志和上周执行情况，生成本周执行洞察。

${lastWeekContext}
---

### 本期OKR目标
${okrContextString || '(当前无OKR目标)'}

### 本周日志 (${stats?.totalLogs || 0}条)
${logsContext}

### 本周统计数据
${statsStr}

### 请生成以下三段洞察（简洁、犀利、可执行）：

1. 【本周执行总结】
分析执行质量（基于分数和category分布）、执行频率（日志数量、活跃天数）、亮点和问题。对比上周情况，指出进步或退步。ENTJ风格，结果导向。

2. 【OKR进度分析】
结合日志和KR当前进度，分析各KR的具体进展。指出哪些KR有进展、哪些停滞、关键问题是什么。

3. 【下周行动建议】
给出3-5条具体、可执行的建议。建议要基于问题诊断，对比上周情况，避免重复同样的问题。

输出JSON格式（严禁使用Markdown标签，只返回纯JSON）：
{
  "summary": "本周执行总结...",
  "okr_progress": "OKR进度分析...",
  "next_steps": "1. 建议1\n2. 建议2\n3. 建议3"
}
`;

    // 调用DeepSeek
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000
    });

    const responseText = completion.choices[0]?.message?.content || "";

    // JSON提取
    let cleanJson = responseText;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }

    let insightsData: any;
    try {
      insightsData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error. Raw Text:", responseText);
      return NextResponse.json(
        { error: "AI response parse failed", raw: responseText },
        { status: 500 }
      );
    }

    // 获取该周当前最大版本号
    const { data: existingVersions } = await supabase
      .from("weekly_insights")
      .select("version")
      .eq("user_id", user.id)
      .eq("week_start", ws)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion = existingVersions && existingVersions.length > 0
      ? (existingVersions[0].version + 1)
      : 1;

    // 插入新版本（使用服务端客户端绕过RLS）
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from("weekly_insights")
      .insert({
        user_id: user.id,
        week_start: ws,
        week_end: we,
        version: nextVersion,
        summary: insightsData.summary || "",
        okr_progress: insightsData.okr_progress || "",
        next_steps: insightsData.next_steps || "",
        total_logs: stats?.totalLogs || 0,
        avg_score: stats?.avgScore || 0,
        execution_rate: stats?.executionRate || 0,
        active_days: stats?.activeDays || 0
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(insertedData);

  } catch (error: any) {
    console.error("POST Weekly Insights Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
