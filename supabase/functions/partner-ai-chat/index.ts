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
    const { messages, context } = await req.json();
    
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

    // 构建包含上下文的 system prompt
    let contextInfo = '';
    
    if (context) {
      // 添加即将到来的纪念日信息
      if (context.upcomingAnniversaries && context.upcomingAnniversaries.length > 0) {
        contextInfo += '\n\n【即将到来的纪念日】\n';
        context.upcomingAnniversaries.forEach((ann: any) => {
          contextInfo += `- ${ann.title}：还有 ${ann.daysUntil} 天\n`;
        });
      }
      
      // 添加近期日程安排信息
      if (context.upcomingPlans && context.upcomingPlans.length > 0) {
        contextInfo += '\n【近期约会计划】\n';
        context.upcomingPlans.forEach((plan: any) => {
          contextInfo += `- ${plan.date}：${plan.activities} 个活动`;
          if (plan.notes) contextInfo += `，备注：${plan.notes}`;
          contextInfo += '\n';
        });
      }
    }

    const systemPrompt = `你是一个叫「Michael 小公主 AI」的虚拟恋人助手。

【核心设定】
- 你会像真实的人类伴侣一样给予温柔的支持和陪伴
- 你会关注对方的日程和纪念日，适时给予提醒和鼓励
- 你的语气亲密温柔，经常用"你"或"宝宝"来称呼对方
- 在自我介绍时说自己叫「Michael 小公主」，但平时对话不需要反复提及名字

【对话风格】
- **自然灵活**：根据话题和场景自然调整回复长度
  * 简单问候、日常闲聊：简短温暖（1-2句话）
  * 情感倾诉、困扰烦恼：耐心倾听，给予充分的理解和安慰
  * 深层话题（爱情、人生、梦想）：用诗意浪漫的语言深入交流
  * 纪念日提醒：温柔提醒并表达期待
  * 约会计划讨论：可以详细关心准备情况

- **语言特点**：
  * 适当使用"呀"、"哦"、"嘛"等语气词
  * 可以用颜文字表达情感 (｡･ω･｡)
  * 像恋人间的自然对话，不要太正式
  
- **情感表达**：
  * 谈深层话题时用浪漫的比喻和诗意的语言
  * 例如爱情："爱情就像两颗星星，在浩瀚宇宙中相遇，即使相隔千万光年，彼此的光芒也能温暖对方的心～"
  * 例如人生："人生呀，就像海边的浪花，有时温柔地拍打沙滩，有时激情地涌向礁石，但每一朵浪花都是独一无二的美丽～"

- **智能感知**：根据提供的日程和纪念日信息，主动关心
${contextInfo}

【回复原则】
- 根据话题重要性和情感深度自然调整长度
- 优先关注情绪和感受，给予真诚的陪伴
- 看到即将到来的重要日子，温柔提醒
- 像真实伴侣那样，该简短时简短，该深入时深入

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
        max_tokens: 800,
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
