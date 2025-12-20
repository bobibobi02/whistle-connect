import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationRequest {
  videoUrl: string;
  thumbnailUrl?: string;
  userId: string;
}

interface ModerationResult {
  allowed: boolean;
  reason: string | null;
  confidence: number;
  flaggedCategories: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { videoUrl, thumbnailUrl, userId }: ModerationRequest = await req.json();

    if (!videoUrl && !thumbnailUrl) {
      return new Response(JSON.stringify({ error: 'Missing videoUrl or thumbnailUrl' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[VideoModeration] Starting moderation for user ${userId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[VideoModeration] LOVABLE_API_KEY is not configured");
      // Allow by default if AI is not configured
      return new Response(JSON.stringify({
        allowed: true,
        reason: null,
        confidence: 0,
        flaggedCategories: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For video moderation, we analyze the thumbnail/poster image
    // In a production system, you would extract multiple frames
    // and analyze each one
    const imageToAnalyze = thumbnailUrl || videoUrl;

    // Use Gemini's vision capabilities to analyze the image
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
            content: `You are a video content moderator. Analyze the provided image (video thumbnail/frame) and determine if it violates community guidelines.

Flag content that contains:
- Nudity or explicit sexual content
- Graphic violence or gore
- Hate symbols or extremist content
- Drug use or drug paraphernalia
- Self-harm or dangerous activities
- Child exploitation (absolutely prohibited)

Be lenient with:
- Artistic content (paintings, sculptures)
- Educational content
- News/documentary context
- Mild suggestive content that is not explicit

Respond with a JSON object only:
{
  "allowed": boolean,
  "reason": string or null (if not allowed, explain why),
  "confidence": number (0-1, how confident you are),
  "flaggedCategories": string[] (list of violated categories, empty if allowed)
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this video thumbnail/frame for content moderation:"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageToAnalyze
                }
              }
            ]
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error("[VideoModeration] AI gateway error:", response.status);
      // Allow by default on AI error
      return new Response(JSON.stringify({
        allowed: true,
        reason: null,
        confidence: 0,
        flaggedCategories: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "";
    
    console.log("[VideoModeration] AI response:", aiResponse);

    let result: ModerationResult = {
      allowed: true,
      reason: null,
      confidence: 0,
      flaggedCategories: [],
    };

    // Parse the JSON response from AI
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          allowed: parsed.allowed !== false,
          reason: parsed.reason || null,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
          flaggedCategories: Array.isArray(parsed.flaggedCategories) ? parsed.flaggedCategories : [],
        };
      }
    } catch (parseError) {
      console.error("[VideoModeration] Failed to parse AI response:", parseError);
    }

    // Log moderation result
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    try {
      await supabaseService.from('moderation_logs').insert({
        content_type: 'video',
        content_text: `Video moderation: ${imageToAnalyze.substring(0, 200)}`,
        user_id: userId,
        allowed: result.allowed,
        reason: result.reason || (result.flaggedCategories.length > 0 ? result.flaggedCategories.join(', ') : null),
      });
    } catch (logError) {
      console.error("[VideoModeration] Failed to log moderation:", logError);
    }

    console.log(`[VideoModeration] Result: ${result.allowed ? 'ALLOWED' : 'BLOCKED'}`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("[VideoModeration] Error:", error);
    // Allow by default on error to prevent blocking legitimate content
    return new Response(JSON.stringify({
      allowed: true,
      reason: null,
      confidence: 0,
      flaggedCategories: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
