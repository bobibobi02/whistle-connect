import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const allowedOrigins = [
  Deno.env.get('APP_URL'),
  'https://lovable.dev',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
].filter(Boolean) as string[];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const isAllowed = allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('.lovable.dev')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0] || 'https://lovable.dev',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 notifications per minute per user

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now >= userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  userLimit.count++;
  return { allowed: true };
}

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify JWT authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[Push] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user's JWT token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("[Push] Invalid or expired token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Push] Authenticated user: ${user.id}`);

    // Check rate limit
    const { allowed, retryAfter } = checkRateLimit(user.id);
    if (!allowed) {
      console.log(`[Push] Rate limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", retryAfter }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter)
          } 
        }
      );
    }

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

    // Authorization check: user can only send notifications to themselves
    // unless they are an admin
    if (user.id !== user_id) {
      // Check if caller is admin using service role client
      const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
      const { data: isAdmin } = await supabaseService.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });
      
      if (!isAdmin) {
        console.error(`[Push] User ${user.id} not authorized to send notifications to ${user_id}`);
        return new Response(
          JSON.stringify({ error: "Not authorized to send notifications to this user" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`[Push] Admin user ${user.id} authorized to send to ${user_id}`);
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
