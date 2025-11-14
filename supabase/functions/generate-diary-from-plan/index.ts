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

    // Build context for AI
    const activities = plan.activities || [];
    const activitiesText = activities
      .map((a: any, i: number) => 
        `${i + 1}. ${a.location_name} (${a.location_type || '活动'}) - ${a.description || ''}`
      )
      .join('\n');

    const diaryPrompt = `请根据以下约会计划生成一篇温馨浪漫的约会日记：

日期：${plan.plan_date}
活动列表：
${activitiesText}

要求：
- 以第一人称视角叙述
- 语气温馨浪漫
- 描述活动的美好瞬间和感受
- 字数在300-500字
- 用中文书写
- 不要使用markdown格式`;

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
          { role: 'system', content: '你是一个擅长写浪漫日记的作家，善于捕捉生活中的美好瞬间。' },
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

    // Generate diary title
    const title = `${plan.plan_date} 约会日记`;

    // Save diary to database
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
        // Store image URL in content or create a separate field if needed
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