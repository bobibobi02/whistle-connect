import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  user_id: string;
  email_type: "follower" | "upvote" | "comment";
  data: {
    actor_name?: string;
    post_title?: string;
    comment_preview?: string;
  };
}

// HTML escape function to prevent XSS in email content
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

const getEmailContent = (type: string, data: EmailRequest["data"]) => {
  // Escape all user-controlled data
  const actorName = escapeHtml(data.actor_name || "Someone");
  const postTitle = escapeHtml(data.post_title || "");
  const commentPreview = escapeHtml(data.comment_preview || "");

  switch (type) {
    case "follower":
      return {
        subject: `${actorName} started following you!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px;">New Follower! 🎉</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              <strong>${actorName}</strong> started following you.
            </p>
            <p style="color: #6a6a6a; font-size: 14px; margin-top: 20px;">
              Keep creating great content!
            </p>
          </div>
        `,
      };
    case "upvote":
      return {
        subject: `Your post "${postTitle}" is getting popular!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px;">Your Post is Trending! 🔥</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              <strong>${actorName}</strong> upvoted your post: "${postTitle}"
            </p>
            <p style="color: #6a6a6a; font-size: 14px; margin-top: 20px;">
              Your content is resonating with the community!
            </p>
          </div>
        `,
      };
    case "comment":
      return {
        subject: `New comment on "${postTitle}"`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px;">New Comment! 💬</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              <strong>${actorName}</strong> commented on your post: "${postTitle}"
            </p>
            ${commentPreview ? `
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="color: #4a4a4a; font-size: 14px; margin: 0;">"${commentPreview}"</p>
              </div>
            ` : ""}
            <p style="color: #6a6a6a; font-size: 14px; margin-top: 20px;">
              Join the conversation!
            </p>
          </div>
        `,
      };
    default:
      return {
        subject: "New notification",
        html: "<p>You have a new notification.</p>",
      };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, email_type, data }: EmailRequest = await req.json();

    console.log(`Processing ${email_type} email for user ${user_id}`);

    // Get user email from auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
    
    if (userError || !userData?.user?.email) {
      console.error("Could not get user email:", userError);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check email preferences
    const { data: prefs } = await supabase
      .from("email_preferences")
      .select("*")
      .eq("user_id", user_id)
      .single();

    // Check if user wants this type of email
    const prefKey = email_type === "follower" ? "email_new_follower" 
                  : email_type === "upvote" ? "email_post_upvote" 
                  : "email_comment";
    
    if (prefs && !prefs[prefKey]) {
      console.log(`User has disabled ${email_type} emails`);
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = getEmailContent(email_type, data);

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Notifications <onboarding@resend.dev>",
        to: [userData.user.email],
        subject,
        html,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
