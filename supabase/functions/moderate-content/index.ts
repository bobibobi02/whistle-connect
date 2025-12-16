import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, type, userId } = await req.json();
    
    if (!content) {
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a content moderator. Analyze the following ${type || 'content'} and determine if it violates community guidelines.

Flag content that contains:
- Hate speech, discrimination, or slurs
- Explicit sexual content
- Graphic violence
- Harassment or bullying
- Spam or scam content
- Personal information exposure (doxxing)

Be lenient with:
- Mild profanity in casual context
- Heated but civil disagreements
- Dark humor that doesn't target groups

Respond with a JSON object only: {"allowed": boolean, "reason": string or null}`
          },
          {
            role: "user",
            content: content.substring(0, 2000)
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "";
    
    console.log("AI moderation response:", aiResponse);

    let result = { allowed: true, reason: null as string | null };

    // Parse the JSON response from AI
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          allowed: parsed.allowed !== false,
          reason: parsed.reason || null
        };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
    }

    // Log moderation result to database
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase.from('moderation_logs').insert({
          content_type: type || 'unknown',
          content_text: content.substring(0, 500),
          user_id: userId,
          allowed: result.allowed,
          reason: result.reason
        });
      } catch (logError) {
        console.error("Failed to log moderation:", logError);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Moderation error:", error);
    return new Response(JSON.stringify({ allowed: true, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
