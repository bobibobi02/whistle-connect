import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscodeRequest {
  videoUrl: string;
  postId: string;
  userId: string;
  useMux?: boolean;
}

interface MuxAsset {
  id: string;
  status: string;
  playback_ids?: { id: string; policy: string }[];
  duration?: number;
  aspect_ratio?: string;
}

interface TranscodeResult {
  success: boolean;
  hlsUrl?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  status?: string;
  variants?: {
    quality: string;
    url: string;
    bandwidth: number;
  }[];
  error?: string;
}

async function createMuxAsset(videoUrl: string): Promise<MuxAsset | null> {
  const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID");
  const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET");

  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
    console.log("[Transcode] Mux credentials not configured, falling back to basic HLS");
    return null;
  }

  const credentials = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

  try {
    const response = await fetch("https://api.mux.com/video/v1/assets", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [{ url: videoUrl }],
        playback_policy: ["public"],
        encoding_tier: "smart",
        mp4_support: "standard",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Transcode] Mux API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("[Transcode] Mux asset created:", data.data?.id);
    return data.data as MuxAsset;
  } catch (error) {
    console.error("[Transcode] Mux request failed:", error);
    return null;
  }
}

async function getMuxAssetStatus(assetId: string): Promise<MuxAsset | null> {
  const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID");
  const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET");

  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
    return null;
  }

  const credentials = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

  try {
    const response = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      console.error("[Transcode] Mux status check failed:", response.status);
      return null;
    }

    const data = await response.json();
    return data.data as MuxAsset;
  } catch (error) {
    console.error("[Transcode] Mux status request failed:", error);
    return null;
  }
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

    const body = await req.json();
    const { videoUrl, postId, userId, useMux = true }: TranscodeRequest = body;

    // Handle status check for existing Mux asset
    if (body.muxAssetId) {
      const asset = await getMuxAssetStatus(body.muxAssetId);
      if (!asset) {
        return new Response(JSON.stringify({ success: false, error: 'Failed to get asset status' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const playbackId = asset.playback_ids?.[0]?.id;
      const result: TranscodeResult = {
        success: asset.status === 'ready',
        status: asset.status,
        muxAssetId: asset.id,
        muxPlaybackId: playbackId,
        hlsUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : undefined,
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!videoUrl || !postId) {
      return new Response(JSON.stringify({ error: 'Missing videoUrl or postId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Transcode] Starting transcode for post ${postId}, useMux: ${useMux}`);

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Try Mux first if enabled
    if (useMux) {
      const muxAsset = await createMuxAsset(videoUrl);
      
      if (muxAsset) {
        const playbackId = muxAsset.playback_ids?.[0]?.id;
        
        // Update post with Mux information
        await supabaseService
          .from('posts')
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq('id', postId)
          .eq('user_id', userId);

        const result: TranscodeResult = {
          success: true,
          status: muxAsset.status,
          muxAssetId: muxAsset.id,
          muxPlaybackId: playbackId,
          hlsUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : undefined,
          variants: playbackId ? [
            { quality: 'auto', url: `https://stream.mux.com/${playbackId}.m3u8`, bandwidth: 0 },
            { quality: '360p', url: `https://stream.mux.com/${playbackId}/low.mp4`, bandwidth: 600000 },
            { quality: '720p', url: `https://stream.mux.com/${playbackId}/medium.mp4`, bandwidth: 2000000 },
            { quality: '1080p', url: `https://stream.mux.com/${playbackId}/high.mp4`, bandwidth: 4000000 },
          ] : undefined,
        };

        console.log(`[Transcode] Mux asset created for post ${postId}:`, result);

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback to basic HLS manifest
    console.log(`[Transcode] Using basic HLS fallback for post ${postId}`);
    
    const hlsManifest = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1920x1080,NAME="1080p"
${videoUrl}
`;

    const manifestPath = `${userId}/${postId}/master.m3u8`;
    const manifestBlob = new Blob([hlsManifest], { type: 'application/vnd.apple.mpegurl' });
    
    const { error: uploadError } = await supabaseService.storage
      .from('post-videos')
      .upload(manifestPath, manifestBlob, {
        contentType: 'application/vnd.apple.mpegurl',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Transcode] Manifest upload error:', uploadError);
    }

    const { data: manifestUrl } = supabaseService.storage
      .from('post-videos')
      .getPublicUrl(manifestPath);

    await supabaseService
      .from('posts')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId);

    const result: TranscodeResult = {
      success: true,
      hlsUrl: manifestUrl?.publicUrl,
      variants: [
        {
          quality: '1080p',
          url: videoUrl,
          bandwidth: 2000000,
        },
      ],
    };

    console.log(`[Transcode] Basic HLS completed for post ${postId}`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Transcode] Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
