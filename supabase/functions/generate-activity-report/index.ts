import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      activityDetails, 
      photos, 
      notes, 
      keywords,
      rating 
    } = await req.json();

    console.log('Generating activity report:', { activityDetails, photoCount: photos?.length, keywords, rating });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build expanded description based on keywords
    const keywordsText = keywords && keywords.length > 0 
      ? `关键词氛围：${keywords.join('、')}`
      : '';

    const ratingStars = '⭐'.repeat(rating || 0);
    
    const prompt = `创建一个精美的活动约会报告图片，专为社交媒体分享设计（Instagram/微信朋友圈）。

活动信息：
- 活动地点：${activityDetails.location_name || '未知地点'}
- 详细地址：${activityDetails.location_address || ''}
- 活动时间：${activityDetails.activity_time || ''}
${activityDetails.weather_condition ? `- 天气状况：${activityDetails.weather_condition} ${activityDetails.temperature || ''}` : ''}
${activityDetails.recommended_dishes ? `- 推荐美食：${activityDetails.recommended_dishes}` : ''}
${activityDetails.description ? `- 活动内容：${activityDetails.description}` : ''}

💝 用户评分：${rating}/10 分 ${ratingStars}

✨ 用户感受：
${notes || '这是一次美好的约会体验'}

${keywordsText}
（请根据这些关键词深入扩充内容，让描述更生动、更有情感、更能打动人心。用优美的文字描绘这个特别时刻的氛围和感受）

📸 本次活动共有 ${photos?.length || 0} 张精彩照片

设计要求：
1. 温馨浪漫的配色方案（粉色、紫色、暖橙、浅蓝等暖色调渐变）
2. 突出活动的主题氛围和情感价值
3. 醒目展示评分（用${ratingStars}星星图标）
4. 深度融合关键词营造的情感氛围，让文字充满感染力
5. 社交媒体标准尺寸（1080x1350像素，3:4比例或1080x1080正方形）
6. 添加精致可爱的装饰元素：
   - 爱心、星星、花朵等浪漫图标
   - 精美边框或卡片式设计
   - 柔和的阴影和光晕效果
7. 排版要求：
   - 标题醒目，使用优雅的中文字体
   - 内容层次分明，重点信息突出
   - 留白适当，不拥挤
8. 整体风格：时尚、温馨、文艺、让人一眼就想点赞和分享
9. 如果有推荐美食，可以用🍽️图标突出显示
10. 融入约会的浪漫元素，让这份报告成为珍贵的回忆

目标：创造一个让人眼前一亮、充满情感共鸣、值得珍藏和分享的精美视觉作品！`;

    console.log('Calling Lovable AI with prompt...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      throw new Error('No image generated from AI');
    }

    // Upload the generated image to Supabase storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const imageBuffer = await fetch(imageUrl).then(r => r.arrayBuffer());
    const fileName = `activity-report-${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('date-reports')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('date-reports')
      .getPublicUrl(fileName);

    console.log('Report image uploaded successfully:', publicUrl);

    return new Response(
      JSON.stringify({ imageUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-activity-report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
