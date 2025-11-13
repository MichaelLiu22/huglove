import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planId } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch plan details
    const { data: plan, error: planError } = await supabase
      .from('date_plans')
      .select('*')
      .eq('id', planId)
      .single();
      
    if (planError) throw planError;
    
    // Fetch activities with photos and notes
    const { data: activities, error: activitiesError } = await supabase
      .from('date_plan_activities')
      .select('*')
      .eq('plan_id', planId)
      .order('order_index');
      
    if (activitiesError) throw activitiesError;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Collect all photos from activities
    const allPhotos: string[] = [];
    activities.forEach((act: any) => {
      if (act.activity_photos && Array.isArray(act.activity_photos)) {
        allPhotos.push(...act.activity_photos);
      }
    });
    
    // Collect all notes
    const activityNotes = activities
      .filter((act: any) => act.activity_notes)
      .map((act: any, i: number) => `${i + 1}. ${act.location_name}: ${act.activity_notes}`)
      .join('\n');
    
    // 构建约会报告的详细描述
    const prompt = `创建一个精美的约会日记图片，用于社交媒体分享（Instagram/微信朋友圈）。

约会详情：
- 日期：${plan.plan_date}
- 计划备注：${plan.notes || '无'}
- 活动数量：${activities.length}个
- 照片数量：${allPhotos.length}张

活动列表：
${activities.map((act: any, i: number) => `${i + 1}. ${act.activity_time || ''} - ${act.location_name}
   地点：${act.location_address || act.location_name}
   ${act.description ? `描述：${act.description}` : ''}
   ${act.activity_notes ? `回忆：${act.activity_notes}` : ''}`).join('\n')}

用户的回忆和感受：
${activityNotes || '无特别记录'}

${plan.notes ? `整体感受：${plan.notes}` : ''}

设计要求：
1. **根据照片数量调整布局**：
   - 如果有${allPhotos.length}张照片，在图片中创意地展示或拼贴这些照片
   - 照片应该是视觉焦点，占据主要版面
   - 使用创意的照片排列方式（网格、拼贴、重叠、相框效果等）

2. **文字和内容扩展**：
   - 基于用户的笔记扩展生成一些温馨、浪漫的句子
   - 例如："这一天，我们从${activities[0]?.location_name}开始，每一刻都值得珍藏"
   - 添加一些关于爱情、陪伴、美好时光的诗意表达
   - 保持简洁但充满情感

3. **整体设计风格**：
   - 使用温馨浪漫的色彩（粉色、淡紫色、温暖的橙色系）
   - 背景使用柔和的渐变或可爱的插画元素
   - 标题："我们的约会日记" 或 "Our Date Diary"
   - 日期以醒目、艺术的方式展示
   - 活动信息简洁呈现，不抢照片的风头

4. **照片处理**：
   - 为照片添加美观的边框或阴影效果
   - 可以添加即拍即印的相机贴纸效果
   - 照片周围可以添加手写风格的注释或日期标签

5. **技术要求**：
   - 图片比例 3:4（适合Instagram/朋友圈）
   - 整体风格年轻、活泼、充满爱意
   - 使用中英文混合，显得时尚精致
   - 添加可爱的装饰元素（心形、星星、小图标等）

让人看到这张图就能感受到满满的幸福和甜蜜！`;

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
    console.log("AI API response:", JSON.stringify(data, null, 2));
    
    // Try different response formats
    let imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Also try direct image_url format
    if (!imageUrl) {
      imageUrl = data.choices?.[0]?.message?.image_url;
    }
    
    // Try content field
    if (!imageUrl && data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      if (typeof content === 'string' && content.startsWith('data:image')) {
        imageUrl = content;
      }
    }

    console.log("Extracted imageUrl:", imageUrl ? imageUrl.substring(0, 100) + "..." : "null");

    if (!imageUrl) {
      console.error("Full response structure:", JSON.stringify(data, null, 2));
      throw new Error("No image generated - check logs for response structure");
    }
    
    // Save report to database
    const { error: reportError } = await supabase
      .from('date_reports')
      .insert({
        plan_id: planId,
        relationship_id: plan.relationship_id,
        report_image_url: imageUrl,
        photos: allPhotos,
        notes: activityNotes,
      });
      
    if (reportError) {
      console.error("Error saving report:", reportError);
    }

    return new Response(
      JSON.stringify({ reportImageUrl: imageUrl }),
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
