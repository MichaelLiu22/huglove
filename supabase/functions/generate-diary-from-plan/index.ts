import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planId } = await req.json();
    
    if (!planId) {
      throw new Error('Plan ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header to identify the user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user and get their ID
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Generating diary for plan:', planId, 'by user:', user.id);

    // Fetch plan details with activities
    const { data: plan, error: planError } = await supabase
      .from('date_plans')
      .select(`
        *,
        activities:date_plan_activities(*)
      `)
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      throw new Error('Plan not found');
    }

    // Verify user has access to this plan
    const { data: relationship } = await supabase
      .from('relationships')
      .select('*')
      .eq('id', plan.relationship_id)
      .single();

    if (!relationship || (relationship.user_id !== user.id && relationship.partner_id !== user.id)) {
      throw new Error('Unauthorized to access this plan');
    }

    // Sort activities by time (早到晚)
    const activities = (plan.activities || []).sort((a: any, b: any) => {
      const timeA = a.activity_time || '00:00';
      const timeB = b.activity_time || '00:00';
      return timeA.localeCompare(timeB);
    });

    // Collect all photos from activities
    const allPhotos: string[] = [];
    activities.forEach((a: any) => {
      if (a.activity_photos && Array.isArray(a.activity_photos)) {
        allPhotos.push(...a.activity_photos);
      }
    });

    console.log('Collected photos:', allPhotos.length);

    // Build detailed context for AI with time information
    const activitiesText = activities
      .map((a: any, i: number) => {
        const time = a.activity_time ? `${a.activity_time}` : '';
        const endTime = a.activity_end_time ? ` - ${a.activity_end_time}` : '';
        const location = a.location_name || '未知地点';
        const type = a.location_type || '活动';
        const description = a.description || '';
        const notes = a.activity_notes || '';
        const rating = a.activity_rating ? `⭐评分: ${a.activity_rating}/5` : '';
        
        let activityDesc = `${i + 1}. 时间: ${time}${endTime}\n   地点: ${location} (${type})`;
        if (description) activityDesc += `\n   描述: ${description}`;
        if (notes) activityDesc += `\n   笔记: ${notes}`;
        if (rating) activityDesc += `\n   ${rating}`;
        
        return activityDesc;
      })
      .join('\n\n');

    const diaryPrompt = `请根据以下约会计划生成一篇温馨浪漫的约会日记：

日期：${plan.plan_date}
${plan.notes ? `约会主题: ${plan.notes}` : ''}

活动安排（按时间顺序）：
${activitiesText}

要求：
- 以第一人称视角叙述，像是在写给自己或对方的日记
- 严格按照时间顺序描述，从早到晚的活动流程
- 语气温馨浪漫，充满感情
- 描述活动的美好瞬间、感受和心情
- 如果有用户的笔记内容，要融入到描述中，扩展成更生动的叙述
- 如果有评分，可以自然地表达对活动的喜爱程度
- 字数在400-600字
- 用中文书写
- 不要使用markdown格式
- 不要写标题，直接开始正文
- 要让读者感受到这一天的时间流逝和情感变化`;

    // Generate diary text using Lovable AI
    console.log('Generating diary text...');
    const textResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: '你是一个擅长写浪漫日记的作家，善于捕捉生活中的美好瞬间，按照时间顺序细腻地描述一天的经历。你的文字温暖、真挚，能让人感受到时间的流动和情感的变化。' 
          },
          { role: 'user', content: diaryPrompt }
        ],
      }),
    });

    if (!textResponse.ok) {
      const errorText = await textResponse.text();
      console.error('Text generation error:', textResponse.status, errorText);
      throw new Error('Failed to generate diary text');
    }

    const textData = await textResponse.json();
    const diaryContent = textData.choices[0].message.content;

    // Generate image using Lovable AI
    console.log('Generating diary image...');
    const imagePrompt = `Create a romantic and warm illustration for a couple's date diary. The scene should be: ${activities[0]?.location_type || 'romantic setting'} at ${activities[0]?.location_name || 'a beautiful place'}. Style: soft, warm colors, romantic atmosphere, anime/illustration style. Aspect ratio: 16:9.`;

    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          { role: 'user', content: imagePrompt }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('Image generation error:', imageResponse.status, errorText);
      throw new Error('Failed to generate diary image');
    }

    const imageData = await imageResponse.json();
    const imageBase64 = imageData.choices[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64) {
      throw new Error('No image generated');
    }

    // Upload image to Supabase storage
    console.log('Uploading image to storage...');
    const base64Data = imageBase64.split(',')[1];
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const imagePath = `diary-images/${planId}-${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('couple-photos')
      .upload(imagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload image');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('couple-photos')
      .getPublicUrl(imagePath);

    // Generate diary title based on activities
    const mainActivities = activities.slice(0, 2).map((a: any) => a.location_type || a.location_name).join('与');
    const title = `${plan.plan_date} ${mainActivities}之约`;

    // Save diary to database with photos
    console.log('Saving diary to database...');
    const { data: diary, error: diaryError } = await supabase
      .from('couple_diaries')
      .insert({
        relationship_id: plan.relationship_id,
        author_id: user.id,
        title: title,
        content: diaryContent,
        diary_date: plan.plan_date,
        is_shared: true,
        mood: 'happy',
        photos: allPhotos // Include user uploaded photos
      })
      .select()
      .single();

    if (diaryError) {
      console.error('Diary save error:', diaryError);
      throw new Error('Failed to save diary');
    }

    console.log('Diary generated successfully:', diary.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        diary,
        imageUrl: publicUrl,
        message: '日记生成成功！'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in generate-diary-from-plan:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});