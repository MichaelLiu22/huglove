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
      rating,
      template = 'romantic'
    } = await req.json();

    console.log('Generating activity report:', { activityDetails, photoCount: photos?.length, keywords, rating, template });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build expanded description based on keywords
    const keywordsText = keywords && keywords.length > 0 
      ? `关键词氛围：${keywords.join('、')}`
      : '';

    const ratingStars = '⭐'.repeat(rating || 0);

    // Template style definitions
    const templateStyles: Record<string, string> = {
      romantic: `
配色方案：粉色到紫色的渐变背景（#FFE5EC 到 #E8B4F8），搭配金色点缀
装饰元素：爱心、玫瑰花瓣、星星、蝴蝶结等浪漫图标
字体风格：优雅的手写体标题，柔和的圆体正文
排版特点：柔美的曲线边框，柔光效果，渐变叠加
氛围感：温馨、浪漫、梦幻、甜蜜`,
      
      minimalist: `
配色方案：黑白灰为主（#FFFFFF, #F5F5F5, #333333），局部使用一个重点色（如 #1A1A1A）
装饰元素：极简线条、几何图形、大量留白
字体风格：现代无衬线字体，字重清晰
排版特点：网格布局，严谨的对齐，充足的留白空间
氛围感：简洁、高级、现代、克制`,
      
      cute: `
配色方案：明亮活泼的多彩配色（粉色 #FFB6C1、天蓝 #87CEEB、柠檬黄 #FFF44F、薄荷绿 #98FF98）
装饰元素：卡通小动物、云朵、彩虹、小星星、糖果、贴纸效果
字体风格：圆润可爱的字体，加粗醒目
排版特点：俏皮的不规则排版，波浪边框，贴纸叠加效果
氛围感：活泼、可爱、童趣、快乐`,
      
      vintage: `
配色方案：复古棕黄色调（深棕 #8B4513、米黄 #F5DEB3、橙褐 #CD853F、暗红 #8B0000）
装饰元素：胶片边框、老照片质感、复古花纹、邮票元素
字体风格：复古衬线字体，做旧效果
排版特点：胶片相机风格边框，纸张纹理，略微泛黄效果，噪点颗粒感
氛围感：怀旧、复古、文艺、时光感`,
      
      elegant: `
配色方案：低饱和度的高级配色（香槟金 #D4AF37、象牙白 #FFFFF0、深灰蓝 #4A5568、玫瑰金 #B76E79）
装饰元素：金色线条、大理石纹理、优雅花卉、几何图案
字体风格：衬线字体标题，优雅细腻的正文字体
排版特点：对称式布局，精致的细线边框，金箔效果点缀
氛围感：优雅、奢华、精致、高级`,
      
      fresh: `
配色方案：清新自然色系（薄荷绿 #98FF98、天空蓝 #87CEEB、乳白色 #FFFAF0、浅灰 #E5E5E5）
装饰元素：植物叶子、小清新插画、水彩渲染、自然元素
字体风格：清爽的无衬线字体，轻盈感
排版特点：透气的版式设计，水彩晕染背景，轻柔的阴影
氛围感：清新、自然、治愈、舒适`
    };

    const selectedStyle = templateStyles[template] || templateStyles.romantic;
    
    const prompt = `创建一个精美的活动约会报告图片，专为社交媒体分享设计（Instagram/微信朋友圈）。

🎨 设计风格模板 - ${template.toUpperCase()}：
${selectedStyle}

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

设计要求（严格遵循所选模板风格）：
1. **严格遵循上述模板的配色方案、装饰元素和排版风格**
2. 突出活动的主题氛围和情感价值
3. 醒目展示评分（用${ratingStars}星星图标）
4. 深度融合关键词营造的情感氛围，让文字充满感染力
5. 社交媒体标准尺寸（1080x1350像素，3:4比例或1080x1080正方形）
6. 排版要求：
   - 标题醒目，字体风格符合模板
   - 内容层次分明，重点信息突出
   - 留白符合模板设计理念
7. 如果有推荐美食，可以用🍽️图标突出显示
8. 确保整体视觉风格与选择的模板高度一致
9. 避免混用其他风格的元素，保持风格纯粹性

目标：创造一个完全符合所选风格、让人眼前一亮、充满情感共鸣、值得珍藏和分享的精美视觉作品！`;

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
