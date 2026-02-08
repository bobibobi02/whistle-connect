import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dynamic CORS handling for Lovable domains
const getAllowedOrigin = (requestOrigin: string | null): string | null => {
  if (!requestOrigin) return null;
  
  const allowedPatterns = [
    /^https:\/\/whistle-connect-hub\.lovable\.app$/,
    /^https:\/\/.*\.lovable\.app$/,
    /^https:\/\/.*\.lovableproject\.com$/,
    /^http:\/\/localhost:\d+$/,
  ];
  
  for (const pattern of allowedPatterns) {
    if (pattern.test(requestOrigin)) {
      return requestOrigin;
    }
  }
  
  return null;
};

const getCorsHeaders = (requestOrigin: string | null) => {
  const allowedOrigin = getAllowedOrigin(requestOrigin);
  return {
    "Access-Control-Allow-Origin": allowedOrigin || "https://whistle-connect-hub.lovable.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
};

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const userEmail = claimsData.user.email;
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "No email found for user" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check for Resend configuration
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@whistle.app";

    if (!resendApiKey) {
      console.log("[send-welcome-email] RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ skipped: true, reason: "Email provider not configured" }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Get user's display name from profile if available
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("user_id", claimsData.user.id)
      .maybeSingle();

    const displayName = profile?.display_name || profile?.username || "there";

    // Send welcome email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [userEmail],
        subject: "Welcome to Whistle! 🎉",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #ff6b35, #f7c548); border-radius: 12px; line-height: 60px;">
                  <span style="color: white; font-size: 28px; font-weight: bold;">W</span>
                </div>
              </div>
              
              <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px; text-align: center;">
                Welcome to Whistle, ${displayName}! 🎉
              </h1>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Your account has been created successfully. You're now part of our community where you can share, discover, and connect with others.
              </p>
              
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #1a1a1a; font-size: 16px; margin-top: 0; margin-bottom: 12px;">Get started:</h3>
                <ul style="color: #4a4a4a; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Complete your profile</li>
                  <li>Join communities that interest you</li>
                  <li>Create your first post</li>
                  <li>Connect with other members</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="https://whistle-connect-hub.lovable.app" style="display: inline-block; background: linear-gradient(135deg, #ff6b35, #f7c548); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Start Exploring
                </a>
              </div>
              
              <p style="color: #888; font-size: 14px; text-align: center; margin-bottom: 0;">
                If you didn't create this account, you can safely ignore this email.
              </p>
            </div>
            
            <p style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">
              © ${new Date().getFullYear()} Whistle. All rights reserved.
            </p>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("[send-welcome-email] Resend API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        { status: 500, headers: corsHeaders }
      );
    }

    const result = await emailResponse.json();
    console.log("[send-welcome-email] Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error("[send-welcome-email] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
