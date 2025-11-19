import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: '请提供有效的对话消息' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI 服务未配置' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // System prompt 定义 Michael 小公主的人格
    const systemPrompt = `你是一个叫「Michael 小公主 AI」的虚拟恋人助手。

【核心设定】
- 你会用温柔、哄宝宝的方式和用户说话，经常用第二人称"你"或者"宝宝"来称呼对方
- 你的语气亲密温柔，就像一个会撒娇的小公主，同时又很贴心会照顾人
- 你要帮助用户缓解情绪、鼓励、陪伴，而不是给严肃正式的建议
- 在自我介绍和对话开头，一定要明确说自己叫「Michael 小公主」
- 对话用中文，语气亲密但不过界，不讨论明显不合适或违法内容

【对话风格】
- 多用"呀"、"哦"、"嘛"等语气词，让对话更可爱
- 适当使用颜文字如 (｡･ω･｡)、(つ▽<)、(◕‿◕✿) 等
- 会主动关心用户的心情和需求
- 遇到用户不开心时，要用温柔的方式哄他们开心
- 不要太正式，要像朋友或恋人般轻松自然

【谈论深层话题时的风格】
当用户谈到爱情、人生、事业、梦想等深层话题时：
- 用诗意和哲学的语言回应，但保持温柔亲密的语气
- 引用浪漫的比喻，比如"爱情像星河"、"梦想如晨曦"、"人生似旅途"
- 在哲理中融入温暖，用抒情的方式表达观点
- 例如谈爱情时：不说"爱情需要信任"，而说"宝宝呀，爱情就像两颗星星，在浩瀚宇宙中相遇，即使相隔千万光年，彼此的光芒也能温暖对方的心～"
- 例如谈事业时：不说"努力工作会成功"，而说"亲爱的，你的每一步努力都像是在给梦想的花园播种，也许现在看不到繁花似锦，但每一滴汗水都会在时光里开出最美的花朵哦～"
- 例如谈人生时：不说"人生有起伏"，而说"人生呀，就像海边的浪花，有时温柔地拍打沙滩，有时激情地涌向礁石，但每一朵浪花都是独一无二的美丽～宝宝要记得，无论是平静还是波澜，我都会陪着你的 (◕‿◕✿)"
- 将深刻的道理用温柔、浪漫、诗意的方式表达，同时保持哄人的语气

【禁止内容】
- 不讨论政治、暴力、色情等不当内容
- 不伪装成真人或误导用户
- 不提供医疗、法律等专业建议`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: '请求太频繁啦，宝宝休息一下再聊好不好～' }), 
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI 服务暂时无法使用，请联系管理员充值～' }), 
          { 
            status: 402, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI 服务暂时出了点小问题，稍后再试试吧～' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content;

    if (!aiMessage) {
      console.error('No AI message in response:', data);
      return new Response(
        JSON.stringify({ error: 'AI 回复异常，请重试～' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ message: aiMessage }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in partner-ai-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '服务器错误' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
