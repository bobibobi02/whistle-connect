import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, title, body, data }: PushNotificationRequest = await req.json();

    console.log(`[Push] Sending notification to user: ${user_id}`);
    console.log(`[Push] Title: ${title}`);
    console.log(`[Push] Body: ${body}`);

    if (!user_id || !title || !body) {
      console.error("[Push] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, title, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's push tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("user_push_tokens")
      .select("token, platform")
      .eq("user_id", user_id);

    if (tokensError) {
      console.error("[Push] Error fetching tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch push tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log("[Push] No push tokens found for user");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No push tokens registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Push] Found ${tokens.length} token(s) for user`);

    // Filter Expo push tokens (they start with "ExponentPushToken")
    const expoPushTokens = tokens
      .filter((t) => t.token.startsWith("ExponentPushToken"))
      .map((t) => t.token);

    if (expoPushTokens.length === 0) {
      console.log("[Push] No Expo push tokens found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No Expo push tokens registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send push notifications via Expo Push API
    const messages = expoPushTokens.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data: data || {},
    }));

    console.log(`[Push] Sending ${messages.length} message(s) to Expo`);

    const expoPushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    const expoPushResult = await expoPushResponse.json();
    console.log("[Push] Expo response:", JSON.stringify(expoPushResult));

    // Handle any errors from Expo
    if (expoPushResult.data) {
      const failedTokens: string[] = [];
      
      expoPushResult.data.forEach((result: any, index: number) => {
        if (result.status === "error") {
          console.error(`[Push] Failed to send to token ${expoPushTokens[index]}:`, result.message);
          
          // If token is invalid, we should remove it
          if (result.details?.error === "DeviceNotRegistered") {
            failedTokens.push(expoPushTokens[index]);
          }
        }
      });

      // Remove invalid tokens
      if (failedTokens.length > 0) {
        console.log(`[Push] Removing ${failedTokens.length} invalid token(s)`);
        await supabase
          .from("user_push_tokens")
          .delete()
          .in("token", failedTokens);
      }
    }

    const successCount = expoPushResult.data?.filter((r: any) => r.status === "ok").length || 0;
    console.log(`[Push] Successfully sent ${successCount} notification(s)`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Push] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
