import { supabase } from "@/integrations/supabase/client";

interface SendEmailNotificationParams {
  user_id: string;
  email_type: "follower" | "upvote" | "comment";
  data: {
    actor_name?: string;
    post_title?: string;
    comment_preview?: string;
  };
}

export const sendEmailNotification = async (params: SendEmailNotificationParams) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-notification-email", {
      body: params,
    });

    if (error) {
      console.error("Error sending email notification:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error invoking email function:", error);
    return { success: false, error };
  }
};
