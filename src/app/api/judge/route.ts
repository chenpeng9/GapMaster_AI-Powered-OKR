import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { ProxyAgent, setGlobalDispatcher } from "undici";

// 【核心修复】强制 Node.js 底层网络引擎走你的 Clash 7890 端口
const proxyAgent = new ProxyAgent("http://127.0.0.1:7890");
setGlobalDispatcher(proxyAgent);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * 请注意：
 * handleSubmit 逻辑位于前端(page.tsx)，API route 只负责 judge。
 * 本 API 未涉及 logs insert、KR 进度更新等副作用，仅为判分服务。
 * 所以以下为原 judge API 的纯净逻辑，不包含 handleSubmit 的数据库副作用。
 */
export async function POST(req: Request) {
  try {
    // 1. 解析 req.json()，接收 content 和 objectives
    const { content, objectives } = await req.json();

    // 2. 格式化 KR 数据，生成结构化字符串 okrContextString（嵌套结构版）
    let okrContextString = "";

    if (Array.isArray(objectives) && objectives.length > 0) {

      objectives.forEach((obj: any) => {

        const objTitle = obj.title || "未知目标";

        okrContextString += `目标: ${objTitle}\n`;

        

        if (Array.isArray(obj.key_results)) {

          obj.key_results.forEach((kr: any) => {

            okrContextString += `  - 关键结果: ${kr.title} [数据库真实 kr_id: ${kr.id}]\n`;

          });

        }

      });

    }

    // 3. 构建 Prompt
    // - 用更直观的方式描述 OKR，去掉原有JSON数组写法
    // - 强调 AI 必须从文本的 [数据库真实 kr_id: x] 提取数字 x
    // - 提出“不允许自己编造kr_id、不能返回objective id；找不到就返回null”
    const prompt = `
你是「自我成长看板」的人工智能评审官。

请参考本季度 KR 目标（每项已明确标注数据库真实 id）如下：
${okrContextString ? okrContextString : '（本季度没有KR目标）'}

【评分标准】：
- 0-2分（偏离航向）：没有任何产出，纯粹的拖延或与目标完全无关的内耗。
- 3-5分（基础铺垫）：被动输入（如阅读、调研、规划），但未转化为实质性的交付物。
- 6-7分（实质交付）：产出了具体的代码、文章或完成了节点任务，直接推动了 KR 的进度。
- 8-10分（战略突破）：极高价值的 Alpha 突破！如 MVP 成功上线、斩获真实用户或产生商业收益。

分析下述用户日志内容，判断主要推动了哪个 Key Result。
你必须严格从上面每一项 [数据库真实 kr_id: x] 中提取数字 x 作为 kr_id 返回。
绝对不能自己编造序号，不能返回 objective_id。
如果找不到匹配的 KR，则 kr_id 必须返回 null。

请按以下 JSON 格式，仅返回严格有效 JSON（无 Markdown、无多余文字）：
{
  "score": 0~10 的数字,
  "category": "偏离航向|基础铺垫|实质交付|战略突破",
  "kr_id": 数字或null,
  "reason": "简要温暖的中文理由"
}

用户日志如下：
"""${content}"""
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 4. 获取 AI 结果
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 5. 只提取 JSON
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    let data: any;
    try {
      data = JSON.parse(cleanJson);
    } catch {
      // 若解析失败，直接返回错误
      return NextResponse.json({ error: "AI 返回非标准 JSON" }, { status: 500 });
    }

    // 6. 兼容 & 兜底处理
    data.score = Number(data.score);
    if (isNaN(data.score) || data.score < 0 || data.score > 10) {
      data.score = 0;
    }

    if (
      !["偏离航向", "基础铺垫", "实质交付", "战略突破"].includes(data.category)
    ) {
      data.category = "";
    }

    // kr_id兼容
    if (!("kr_id" in data)) {
      data.kr_id = null;
    } else if (data.kr_id !== null && typeof data.kr_id !== "number") {
      data.kr_id = null;
    }

    if (!("reason" in data) || typeof data.reason !== "string") {
      data.reason = "";
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("AI Judge Error:", error);
    return NextResponse.json({ error: "Failed to judge" }, { status: 500 });
  }
}