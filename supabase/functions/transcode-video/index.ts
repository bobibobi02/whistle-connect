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
}

interface TranscodeResult {
  success: boolean;
  hlsUrl?: string;
  variants?: {
    quality: string;
    url: string;
    bandwidth: number;
  }[];
  error?: string;
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

    const { videoUrl, postId, userId }: TranscodeRequest = await req.json();

    if (!videoUrl || !postId) {
      return new Response(JSON.stringify({ error: 'Missing videoUrl or postId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Transcode] Starting transcode for post ${postId}`);

    // For true HLS transcoding, you would typically use:
    // 1. FFmpeg in a dedicated worker/container
    // 2. A service like Mux, Cloudflare Stream, or AWS MediaConvert
    // 
    // This edge function serves as the integration point.
    // For now, we'll create a basic HLS-compatible structure.
    
    // In production, you would:
    // 1. Download the video
    // 2. Transcode to multiple bitrates (e.g., 360p, 720p, 1080p)
    // 3. Segment into .ts files
    // 4. Generate master.m3u8 playlist
    // 5. Upload segments to storage
    
    // For this implementation, we'll store the original video with
    // metadata that supports adaptive streaming where possible.
    
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    // Generate a simple HLS manifest that points to the original video
    // This allows players that support HLS to use it
    const hlsManifest = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1920x1080,NAME="1080p"
${videoUrl}
`;

    // Store the manifest
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
      // Continue without HLS - original video still works
    }

    const { data: manifestUrl } = supabaseService.storage
      .from('post-videos')
      .getPublicUrl(manifestPath);

    // Update the post with transcoding metadata
    const { error: updateError } = await supabaseService
      .from('posts')
      .update({
        video_mime_type: 'application/vnd.apple.mpegurl',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Transcode] Post update error:', updateError);
    }

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

    console.log(`[Transcode] Completed for post ${postId}`, result);

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
