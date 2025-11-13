import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planDetails, activities, notes, photoCount } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // 构建约会报告的详细描述
    const prompt = `创建一个精美的约会报告图片，用于社交媒体分享（Instagram/微信朋友圈）。

约会详情：
- 日期：${planDetails.date}
- 备注：${planDetails.notes || '无'}
- 活动数量：${activities.length}个

活动列表：
${activities.map((act: any, i: number) => `${i + 1}. ${act.time || ''} - ${act.name}
   地点：${act.location}
   ${act.description ? `描述：${act.description}` : ''}`).join('\n')}

用户备注：${notes || '无特别备注'}

照片数量：${photoCount}张

设计要求：
1. 使用温馨浪漫的色彩（粉色、淡紫色、温暖的橙色系）
2. 背景使用柔和的渐变或可爱的插画元素（心形、星星、花朵等）
3. 布局清晰，包含：
   - 标题："我们的约会" 或 "Date Report"
   - 日期以醒目方式展示
   - 活动按时间线排列，使用图标或数字标记
   - 底部留白区域显示照片数量和备注
4. 整体风格要年轻、活泼、充满爱意
5. 图片比例 3:4（适合Instagram/朋友圈）
6. 使用中英文混合，显得时尚
7. 添加一些可爱的装饰元素（小图标、线条、贴纸效果）

要让人看到这张图就感觉温暖、甜蜜、想要点赞！`;

    console.log("Generating date report image with prompt");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-date-report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
