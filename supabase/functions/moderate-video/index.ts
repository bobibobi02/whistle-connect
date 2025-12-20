import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationRequest {
  videoUrl: string;
  thumbnailUrl?: string;
  frameUrls?: string[]; // Multiple frame URLs for sampling
  userId: string;
}

interface FrameAnalysis {
  frameIndex: number;
  allowed: boolean;
  reason: string | null;
  confidence: number;
  flaggedCategories: string[];
}

interface ModerationResult {
  allowed: boolean;
  reason: string | null;
  confidence: number;
  flaggedCategories: string[];
  frameAnalyses?: FrameAnalysis[];
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

    const { videoUrl, thumbnailUrl, frameUrls, userId }: ModerationRequest = await req.json();

    if (!videoUrl && !thumbnailUrl && (!frameUrls || frameUrls.length === 0)) {
      return new Response(JSON.stringify({ error: 'Missing videoUrl, thumbnailUrl, or frameUrls' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[VideoModeration] Starting moderation for user ${userId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[VideoModeration] LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({
        allowed: true,
        reason: null,
        confidence: 0,
        flaggedCategories: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Collect all images to analyze
    const imagesToAnalyze: string[] = [];
    if (frameUrls && frameUrls.length > 0) {
      imagesToAnalyze.push(...frameUrls);
    } else if (thumbnailUrl) {
      imagesToAnalyze.push(thumbnailUrl);
    }

    // If no frames provided, just analyze the video URL as a fallback
    if (imagesToAnalyze.length === 0) {
      imagesToAnalyze.push(videoUrl);
    }

    console.log(`[VideoModeration] Analyzing ${imagesToAnalyze.length} frames`);

    // Analyze frames in parallel (batch to avoid rate limits)
    const batchSize = 3;
    const frameAnalyses: FrameAnalysis[] = [];
    let overallAllowed = true;
    const allFlaggedCategories: Set<string> = new Set();
    let worstConfidence = 0;
    let worstReason: string | null = null;

    for (let i = 0; i < imagesToAnalyze.length; i += batchSize) {
      const batch = imagesToAnalyze.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (imageUrl, batchIndex) => {
        const frameIndex = i + batchIndex;
        
        try {
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
                  content: `You are a video content moderator analyzing a frame from a video. Determine if this frame violates community guidelines.

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

This is frame ${frameIndex + 1} of a video. Respond with a JSON object only:
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
                      text: `Analyze this video frame (frame ${frameIndex + 1}) for content moderation:`
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: imageUrl
                      }
                    }
                  ]
                }
              ],
              temperature: 0.1,
            }),
          });

          if (!response.ok) {
            console.error(`[VideoModeration] AI gateway error for frame ${frameIndex}:`, response.status);
            return {
              frameIndex,
              allowed: true,
              reason: null,
              confidence: 0,
              flaggedCategories: [],
            };
          }

          const data = await response.json();
          const aiResponse = data.choices?.[0]?.message?.content || "";
          
          let frameResult: FrameAnalysis = {
            frameIndex,
            allowed: true,
            reason: null,
            confidence: 0,
            flaggedCategories: [],
          };

          try {
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              frameResult = {
                frameIndex,
                allowed: parsed.allowed !== false,
                reason: parsed.reason || null,
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
                flaggedCategories: Array.isArray(parsed.flaggedCategories) ? parsed.flaggedCategories : [],
              };
            }
          } catch (parseError) {
            console.error(`[VideoModeration] Failed to parse AI response for frame ${frameIndex}:`, parseError);
          }

          return frameResult;
        } catch (error) {
          console.error(`[VideoModeration] Error analyzing frame ${frameIndex}:`, error);
          return {
            frameIndex,
            allowed: true,
            reason: null,
            confidence: 0,
            flaggedCategories: [],
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        frameAnalyses.push(result);
        
        if (!result.allowed) {
          overallAllowed = false;
          if (result.confidence > worstConfidence) {
            worstConfidence = result.confidence;
            worstReason = result.reason;
          }
          result.flaggedCategories.forEach(cat => allFlaggedCategories.add(cat));
        }
      }
    }

    const result: ModerationResult = {
      allowed: overallAllowed,
      reason: worstReason,
      confidence: overallAllowed ? 1 : worstConfidence,
      flaggedCategories: Array.from(allFlaggedCategories),
      frameAnalyses,
    };

    // Log moderation result
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    try {
      await supabaseService.from('moderation_logs').insert({
        content_type: 'video',
        content_text: `Video moderation (${imagesToAnalyze.length} frames): ${videoUrl.substring(0, 200)}`,
        user_id: userId,
        allowed: result.allowed,
        reason: result.reason || (result.flaggedCategories.length > 0 ? result.flaggedCategories.join(', ') : null),
      });
    } catch (logError) {
      console.error("[VideoModeration] Failed to log moderation:", logError);
    }

    console.log(`[VideoModeration] Result: ${result.allowed ? 'ALLOWED' : 'BLOCKED'} (${frameAnalyses.length} frames analyzed)`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("[VideoModeration] Error:", error);
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
