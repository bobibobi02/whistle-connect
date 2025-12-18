import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QueuedNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, string>;
  status: string;
  created_at: string;
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

    console.log("[ProcessQueue] Starting to process push notification queue...");

    // Get pending notifications (limit to batch size)
    const batchSize = 100;
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from("push_notification_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      console.error("[ProcessQueue] Error fetching queue:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch queue" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log("[ProcessQueue] No pending notifications to process");
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ProcessQueue] Found ${pendingNotifications.length} pending notifications`);

    // Group notifications by user to batch token lookups
    const userIds = [...new Set(pendingNotifications.map((n: QueuedNotification) => n.user_id))];
    
    // Get all push tokens for these users
    const { data: allTokens, error: tokensError } = await supabase
      .from("user_push_tokens")
      .select("user_id, token")
      .in("user_id", userIds);

    if (tokensError) {
      console.error("[ProcessQueue] Error fetching tokens:", tokensError);
    }

    // Create a map of user_id -> tokens
    const tokensByUser = new Map<string, string[]>();
    allTokens?.forEach((t) => {
      const existing = tokensByUser.get(t.user_id) || [];
      if (t.token.startsWith("ExponentPushToken")) {
        existing.push(t.token);
      }
      tokensByUser.set(t.user_id, existing);
    });

    // Build Expo push messages
    const messages: Array<{
      to: string;
      sound: string;
      title: string;
      body: string;
      data: Record<string, string>;
      notificationId: string;
    }> = [];

    const noTokenNotifications: string[] = [];

    for (const notification of pendingNotifications as QueuedNotification[]) {
      const userTokens = tokensByUser.get(notification.user_id) || [];
      
      if (userTokens.length === 0) {
        noTokenNotifications.push(notification.id);
        continue;
      }

      for (const token of userTokens) {
        messages.push({
          to: token,
          sound: "default",
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          notificationId: notification.id,
        });
      }
    }

    console.log(`[ProcessQueue] Prepared ${messages.length} messages for ${messages.length > 0 ? 'sending' : 'no tokens'}`);

    // Mark notifications without tokens as "sent" (nothing to do)
    if (noTokenNotifications.length > 0) {
      await supabase
        .from("push_notification_queue")
        .update({ 
          status: "sent", 
          processed_at: new Date().toISOString() 
        })
        .in("id", noTokenNotifications);
      
      console.log(`[ProcessQueue] Marked ${noTokenNotifications.length} notifications as sent (no tokens)`);
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: noTokenNotifications.length, sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send to Expo in batches of 100
    const expoBatchSize = 100;
    const sentNotificationIds = new Set<string>();
    const failedNotificationIds = new Set<string>();
    const invalidTokens: string[] = [];

    for (let i = 0; i < messages.length; i += expoBatchSize) {
      const batch = messages.slice(i, i + expoBatchSize);
      const expoBatch = batch.map(({ to, sound, title, body, data }) => ({ to, sound, title, body, data }));

      try {
        const expoPushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
          },
          body: JSON.stringify(expoBatch),
        });

        const expoPushResult = await expoPushResponse.json();
        console.log(`[ProcessQueue] Expo batch ${Math.floor(i / expoBatchSize) + 1} response:`, 
          JSON.stringify(expoPushResult).substring(0, 200));

        // Process results
        if (expoPushResult.data) {
          expoPushResult.data.forEach((result: any, index: number) => {
            const originalMessage = batch[index];
            
            if (result.status === "ok") {
              sentNotificationIds.add(originalMessage.notificationId);
            } else {
              console.error(`[ProcessQueue] Failed: ${result.message}`);
              
              if (result.details?.error === "DeviceNotRegistered") {
                invalidTokens.push(originalMessage.to);
              }
              
              failedNotificationIds.add(originalMessage.notificationId);
            }
          });
        }
      } catch (batchError) {
        console.error(`[ProcessQueue] Batch ${Math.floor(i / expoBatchSize) + 1} failed:`, batchError);
        batch.forEach((msg) => failedNotificationIds.add(msg.notificationId));
      }
    }

    // Update notification statuses
    const sentIds = [...sentNotificationIds];
    const failedIds = [...failedNotificationIds].filter(id => !sentNotificationIds.has(id));

    if (sentIds.length > 0) {
      await supabase
        .from("push_notification_queue")
        .update({ status: "sent", processed_at: new Date().toISOString() })
        .in("id", sentIds);
    }

    if (failedIds.length > 0) {
      await supabase
        .from("push_notification_queue")
        .update({ status: "failed", processed_at: new Date().toISOString() })
        .in("id", failedIds);
    }

    // Remove invalid tokens
    if (invalidTokens.length > 0) {
      console.log(`[ProcessQueue] Removing ${invalidTokens.length} invalid tokens`);
      await supabase
        .from("user_push_tokens")
        .delete()
        .in("token", invalidTokens);
    }

    // Clean up old processed notifications (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await supabase
      .from("push_notification_queue")
      .delete()
      .neq("status", "pending")
      .lt("processed_at", sevenDaysAgo.toISOString());

    console.log(`[ProcessQueue] Complete. Sent: ${sentIds.length}, Failed: ${failedIds.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: pendingNotifications.length,
        sent: sentIds.length,
        failed: failedIds.length,
        invalidTokensRemoved: invalidTokens.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[ProcessQueue] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
