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
    
    // Simplified, direct image generation prompt
    const activitiesSummary = activities.map((act: any, i: number) => 
      `${i + 1}. ${act.activity_time || ''} ${act.location_name}`
    ).join(', ');
    
    const prompt = `Generate a romantic date diary scrapbook image with a 3:4 aspect ratio (portrait, suitable for Instagram).

Date: ${plan.plan_date}
Activities: ${activitiesSummary}
${plan.notes ? `Notes: ${plan.notes}` : ''}

Style: Romantic pastel colors (pink, lavender, warm tones), soft gradient background, decorative hearts and stars, polaroid photo frames layout, hand-written style text, title "Our Date Diary" in elegant script font. The design should feel warm, loving, and shareable on social media.`;

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
