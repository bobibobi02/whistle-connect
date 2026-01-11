import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_edited: boolean;
  is_deleted: boolean;
  sender?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  participants: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }[];
  last_message?: Message;
  unread_count: number;
}

export const useConversations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user) return [];

      // Get all conversations for this user
      const { data: participants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (participantsError) throw participantsError;
      if (!participants || participants.length === 0) return [];

      const conversationIds = participants.map((p) => p.conversation_id);

      // Get conversation details
      const { data: conversations, error: conversationsError } = await supabase
        .from("conversations")
        .select("*")
        .in("id", conversationIds)
        .order("last_message_at", { ascending: false });

      if (conversationsError) throw conversationsError;

      // Get all participants for these conversations
      const { data: allParticipants, error: allParticipantsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id, last_read_at")
        .in("conversation_id", conversationIds);

      if (allParticipantsError) throw allParticipantsError;

      // Get profiles for all participants
      const userIds = [...new Set(allParticipants?.map((p) => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p) => {
        profileMap[p.user_id] = p;
      });

      // Get last message for each conversation
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false });

      const lastMessageMap: Record<string, Message> = {};
      lastMessages?.forEach((m) => {
        if (!lastMessageMap[m.conversation_id]) {
          lastMessageMap[m.conversation_id] = m;
        }
      });

      // Count unread messages
      const myParticipants = allParticipants?.filter((p) => p.user_id === user.id) || [];
      const lastReadMap: Record<string, string | null> = {};
      myParticipants.forEach((p) => {
        lastReadMap[p.conversation_id] = p.last_read_at;
      });

      return conversations?.map((conv) => {
        const convParticipants = allParticipants
          ?.filter((p) => p.conversation_id === conv.id && p.user_id !== user.id)
          .map((p) => ({
            user_id: p.user_id,
            ...profileMap[p.user_id],
          })) || [];

        const lastReadAt = lastReadMap[conv.id];
        const unreadCount = lastMessages?.filter(
          (m) => m.conversation_id === conv.id && 
                 m.sender_id !== user.id && 
                 (!lastReadAt || new Date(m.created_at) > new Date(lastReadAt))
        ).length || 0;

        return {
          ...conv,
          participants: convParticipants,
          last_message: lastMessageMap[conv.id],
          unread_count: unreadCount,
        };
      }) || [];
    },
    enabled: !!user,
  });
};

export const useMessages = (conversationId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, queryClient]);

  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async (): Promise<Message[]> => {
      if (!user || !conversationId) return [];

      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set(messages?.map((m) => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", senderIds);

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p) => {
        profileMap[p.user_id] = p;
      });

      return messages?.map((m) => ({
        ...m,
        sender: profileMap[m.sender_id],
      })) || [];
    },
    enabled: !!user && !!conversationId,
  });
};

export const useSendMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useStartConversation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ recipientId, message }: { recipientId: string; message: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if conversation already exists between these users
      const { data: existingParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (existingParticipants && existingParticipants.length > 0) {
        const conversationIds = existingParticipants.map((p) => p.conversation_id);
        
        const { data: recipientParticipants } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", recipientId)
          .in("conversation_id", conversationIds);

        if (recipientParticipants && recipientParticipants.length > 0) {
          // Conversation exists, just send a message
          const conversationId = recipientParticipants[0].conversation_id;
          
          const { data: newMessage, error: messageError } = await supabase
            .from("messages")
            .insert({
              conversation_id: conversationId,
              sender_id: user.id,
              content: message,
            })
            .select()
            .single();

          if (messageError) throw messageError;
          return { conversationId, message: newMessage };
        }
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      // Add both participants
      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: conversation.id, user_id: user.id },
          { conversation_id: conversation.id, user_id: recipientId },
        ]);

      if (participantsError) throw participantsError;

      // Send the first message
      const { data: newMessage, error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: message,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      return { conversationId: conversation.id, message: newMessage };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({
        title: "Message sent",
        description: "Your message has been delivered.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error starting conversation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useMarkAsRead = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};
