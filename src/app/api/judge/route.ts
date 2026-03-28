import OpenAI from "openai";
import { NextResponse } from "next/server";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { createClient } from "@supabase/supabase-js";

// 1. 环境检查：本地开发走 Clash 代理，线上环境直连
if (process.env.NODE_ENV === "development") {
  console.log("Detected development environment, setting up proxy...");
  const proxyAgent = new ProxyAgent("http://127.0.0.1:7890");
  setGlobalDispatcher(proxyAgent);
} else {
  console.log("Detected production environment, connecting directly to DeepSeek...");
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

export async function POST(req: Request) {
  // 验证用户身份
  const { error: authError, user } = await verifyAuth(req);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", message: authError || "Please login first" },
      { status: 401 }
    );
  }

  try {
    const { content, objectives } = await req.json();

    // 检查每日日志限制（每人每天最多5次）
    const supabase = getSupabaseServerClient();
    const today = new Date().toISOString().split('T')[0];
    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("daily_log_count, daily_log_date")
      .eq("user_id", user.id)
      .maybeSingle();

    let dailyLogCount = 0;
    const settingsUpdates: any = {};

    if (userSettings) {
      // 检查是否是新的一天
      if (userSettings.daily_log_date !== today) {
        dailyLogCount = 0;
        settingsUpdates.daily_log_count = 0;
        settingsUpdates.daily_log_date = today;
      } else {
        dailyLogCount = userSettings.daily_log_count || 0;
      }
    }

    // 检查是否超过每日限制
    if (dailyLogCount >= 5) {
      return NextResponse.json(
        { error: "daily_limit_exceeded", message: "今日已提交5次日志，请明天再试。合理限制有助于保持记录质量。" },
        { status: 429 }
      );
    }

    // 3. 构建结构化的 OKR 上下文
    let okrContextString = "";
    if (Array.isArray(objectives) && objectives.length > 0) {
      objectives.forEach((obj: any, idx: number) => {
        okrContextString += `Objective ${idx + 1}: ${obj.title}\n`;
        if (Array.isArray(obj.key_results)) {
          obj.key_results.forEach((kr: any) => {
            okrContextString += `  - [数据库真实 kr_id: ${kr.id}] KR: ${kr.title}\n`;
          });
        }
      });
    }

    // 4. 定义高度结构化的专家级提示词
    const prompt = `
你是「GapMaster」首席执行官助理、数字化管理专家及健康顾问。
你的任务是审计用户的每日执行日志，并将其精准转化为 OKR 的量化进度。

### 1. 当前季度 OKR 目标 (上下文)
${okrContextString ? okrContextString : '（当前无活跃目标，仅进行评分）'}

### 2. 评审维度与分值标准
- **[0-2分] 偏离航向**：没有任何实质行动，纯粹的拖延或与目标无关的琐事。
- **[3-5分] 基础铺垫**：仅进行低密度输入（调研、规划、看资料），无直接成果，没有达成目标不得高于5分。
- **[6-7分] 实质交付**：完成了具体的量化动作（如：慢跑、低嘌呤饮食、完成代码提交）。
- **[8-10分] 战略突破**：实现质变里程碑（如：尿酸指标显著下降、产品首个用户激活、获得首笔咨询收入）。

### 3. 数据判定规则 (核心审计逻辑)
- **关联映射 (Primary Mapping)**：即便日志得分极低（0-2分），只要内容涉及某项 KR，必须在 [primary_kr_id] 中返回该 KR 的 ID，以便前端在 Feed 流中关联对应的 Objective 标签。
- **达成判定 (Achievement Check)**：
    - 只有当用户行为**完全达到或超过** KR 描述的量化标准时，才将其 ID 填入 [achieved_kr_ids] 数组。
    - **逻辑严约束**：若用户描述的行为只是“沾边”但未达标（例如：要求 2.5L 饮水但只喝了 2L），则 [achieved_kr_ids] 必须为空，Dashboard 不得加分。
- **语言净化 (No Tech Jargon)**：严禁在 "analysis" 和 "next_step" 中出现任何类似 "[数据库真实 kr_id: x]" 的技术字样。
- **表达规范**：点评应直接使用 KR 的自然语言名称（如：运动目标、饮水任务）。
- **ENTJ 风格**：点评应客观、犀利、结果导向，指出执行漏洞，禁止感性的心理安慰。

### 4. 输出格式 (必须返回纯 JSON，严禁使用 Markdown 标签)
{
  "score": 0-10数字,
  "category": "偏离航向|基础铺垫|实质交付|战略突破",
  "analysis": "基于执行力度的深度分析，严禁包含任何 ID 标签",
  "primary_kr_id": 关联度最高的 KR ID (用于 UI 标签和颜色显示),
  "achieved_kr_ids": [数字], // 仅包含真正达标、允许 Dashboard 执行 +1 操作的 KR ID 数组
  "next_step": "明天的具体改进建议"
}

### 5. 待评审日志
"""${content}"""
`;

    // 5. 调用 DeepSeek 模型
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const responseText = completion.choices[0]?.message?.content || "";

    // 6. 健壮的 JSON 提取逻辑
    let cleanJson = responseText;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/); // 匹配最外层的 {}
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }

    let data: any;
    try {
      data = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error. Raw Text:", responseText);
      return NextResponse.json({ error: "AI 响应解析失败", raw: responseText }, { status: 500 });
    }

    // 7. 数据清洗与格式统一
    const finalData = {
      score: Math.min(Math.max(Number(data.score) || 0, 0), 10),
      category: data.category || "基础铺垫",
      analysis: data.analysis || "暂无深度分析",
      primary_kr_id: data.primary_kr_id || null,
      achieved_kr_ids: Array.isArray(data.achieved_kr_ids) ? data.achieved_kr_ids : [],
      next_step: data.next_step || "继续保持执行力"
    };

    return NextResponse.json(finalData);

  } catch (error: any) {
    console.error("AI Judge Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}