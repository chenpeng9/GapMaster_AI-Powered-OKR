import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 创建服务器端 Supabase 客户端
function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 验证用户认证
async function verifyAuth(request: Request) {
  const supabase = getSupabaseServerClient();

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

// GET - 获取指定周的所有版本
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

    // 获取该周所有版本
    const { data, error } = await supabase
      .from("weekly_insights")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekParam)
      .order("version", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ versions: data || [] });

  } catch (error: any) {
    console.error("GET Weekly Insights Versions Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
