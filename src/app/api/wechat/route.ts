import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

// 验证用户认证并返回用户信息
async function verifyAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return { error: "Missing authorization header", user: null, supabase: null };
  }

  const token = authHeader.replace("Bearer ", "");

  // 使用用户的 token 创建经过认证的客户端
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: error?.message || "Invalid token", user: null, supabase: null };
  }

  return { error: null, user, supabase };
}

// 获取用户的 MiniMax API 配置
async function getUserMinimaxConfig(supabase: any, userId: string): Promise<{ apiKey: string | null; baseUrl: string | null }> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("minimax_api_key, minimax_base_url")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching user settings:", error);
  }

  return {
    apiKey: data?.minimax_api_key || null,
    baseUrl: data?.minimax_base_url || null
  };
}

export async function POST(req: Request) {
  const { error: authError, user, supabase } = await verifyAuth(req);

  if (authError || !user || !supabase) {
    return NextResponse.json(
      { error: "Unauthorized", message: authError || "Please login first" },
      { status: 401 }
    );
  }

  try {
    const { logContent, logDate } = await req.json();

    if (!logContent) {
      return NextResponse.json(
        { error: "Missing log content" },
        { status: 400 }
      );
    }

    // 获取用户的 MiniMax API 配置
    const { apiKey: minimaxApiKey, baseUrl: minimaxBaseUrl } = await getUserMinimaxConfig(supabase, user.id);

    if (!minimaxApiKey) {
      return NextResponse.json(
        { error: "请先在设置中配置 MiniMax API Key", details: "未找到 API Key 配置" },
        { status: 400 }
      );
    }

    // 使用用户配置的 API 地址
    const apiBaseUrl = minimaxBaseUrl || "https://api.minimax.chat";
    const apiPath = "/v1/chat/completions";
    const fullUrl = `${apiBaseUrl}${apiPath}`;

    // 调用 API 生成公众号风格文章
    const prompt = `请将以下日记内容改写成微信公众号风格的图文文章。要求：
1. 标题：吸引眼球，有话题性
2. 正文：使用少量 Emoji 有趣的表述，分段落，每段不宜过长，可以适当根据素材增加一些新的内容和观点
3. 结构：开头引入、中间分享、结尾总结
4. 整体风格：积极向上，有温度，与读者有共鸣
5. 最后附带一个英文的封面图片提示词（用于 AI 生成图片），简洁描述

请直接返回 JSON 格式，不要其他内容：
{"title": "标题", "content": "正文内容", "coverPrompt": "英文封面提示词"}

以下是日记内容：
${logContent}`;

    const response = await axios.post(
      fullUrl,
      {
        model: "MiniMax-M2.5",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        stream: false
      },
      {
        headers: {
          "Authorization": `Bearer ${minimaxApiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 60000
      }
    );

    // 解析响应
    const result = response.data;

    // 检查是否有错误
    if (result.error) {
      throw new Error(result.error.message || "API 调用失败");
    }

    // 提取内容
    let assistantMessage = result.choices?.[0]?.message?.content;
    if (!assistantMessage && result.choices?.[0]?.delta?.content) {
      assistantMessage = result.choices[0].delta.content;
    }
    if (!assistantMessage && result.choices?.[0]?.message) {
      assistantMessage = result.choices[0].message;
    }

    if (!assistantMessage) {
      console.error("Unable to extract message from response:", result);
      throw new Error("API 响应格式错误");
    }

    // 尝试解析 JSON
    let parsed;
    try {
      parsed = JSON.parse(assistantMessage);
    } catch {
      const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = {
          title: "今日打卡",
          content: assistantMessage,
          coverPrompt: "A productive day in modern office, minimalist style, warm light"
        };
      }
    }

    return NextResponse.json({
      title: parsed.title || "今日打卡",
      content: parsed.content || assistantMessage,
      coverPrompt: parsed.coverPrompt || "A productive day in modern office, minimalist style, warm light"
    });

  } catch (err: any) {
    console.error("WeChat API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message || "生成失败" },
      { status: 500 }
    );
  }
}
