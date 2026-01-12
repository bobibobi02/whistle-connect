import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  position: number;
  vote_count: number;
}

export interface Poll {
  id: string;
  post_id: string;
  question: string;
  ends_at: string | null;
  allow_multiple: boolean;
  created_at: string;
  options: PollOption[];
  total_votes: number;
  user_votes: string[]; // option IDs the user voted for
  is_ended: boolean;
}

export const usePoll = (postId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["poll", postId],
    queryFn: async (): Promise<Poll | null> => {
      // Get the poll
      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .select("*")
        .eq("post_id", postId)
        .maybeSingle();

      if (pollError) throw pollError;
      if (!poll) return null;

      // Get options
      const { data: options, error: optionsError } = await supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", poll.id)
        .order("position", { ascending: true });

      if (optionsError) throw optionsError;

      // Get vote counts
      const { data: votes, error: votesError } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", poll.id);

      if (votesError) throw votesError;

      // Count votes per option
      const voteCounts: Record<string, number> = {};
      votes?.forEach((v) => {
        voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
      });

      // Get user's votes
      let userVotes: string[] = [];
      if (user) {
        const { data: userVoteData } = await supabase
          .from("poll_votes")
          .select("option_id")
          .eq("poll_id", poll.id)
          .eq("user_id", user.id);

        userVotes = userVoteData?.map((v) => v.option_id) || [];
      }

      const isEnded = poll.ends_at ? new Date(poll.ends_at) < new Date() : false;

      return {
        ...poll,
        options: options?.map((o) => ({
          ...o,
          vote_count: voteCounts[o.id] || 0,
        })) || [],
        total_votes: votes?.length || 0,
        user_votes: userVotes,
        is_ended: isEnded,
      };
    },
    enabled: !!postId,
  });
};

export const useCreatePoll = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      postId,
      question,
      options,
      endsAt,
      allowMultiple,
    }: {
      postId: string;
      question: string;
      options: string[];
      endsAt?: Date;
      allowMultiple?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({
          post_id: postId,
          question,
          ends_at: endsAt?.toISOString() || null,
          allow_multiple: allowMultiple || false,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create options
      const optionInserts = options.map((text, index) => ({
        poll_id: poll.id,
        text,
        position: index,
      }));

      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(optionInserts);

      if (optionsError) throw optionsError;

      return poll;
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["poll", postId] });
      toast({
        title: "Poll created",
        description: "Your poll is now live!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating poll",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useVotePoll = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      pollId,
      optionId,
      postId,
    }: {
      pollId: string;
      optionId: string;
      postId: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if user already voted for this option
      const { data: existingVote } = await supabase
        .from("poll_votes")
        .select("id")
        .eq("poll_id", pollId)
        .eq("option_id", optionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingVote) {
        // Remove vote
        const { error } = await supabase
          .from("poll_votes")
          .delete()
          .eq("id", existingVote.id);

        if (error) throw error;
        return { action: "removed" };
      } else {
        // Check if poll allows multiple votes - use .maybeSingle() for safety
        const { data: poll } = await supabase
          .from("polls")
          .select("allow_multiple")
          .eq("id", pollId)
          .limit(1)
          .maybeSingle();

        if (!poll?.allow_multiple) {
          // Remove any existing vote first
          await supabase
            .from("poll_votes")
            .delete()
            .eq("poll_id", pollId)
            .eq("user_id", user.id);
        }

        // Add vote
        const { error } = await supabase
          .from("poll_votes")
          .insert({
            poll_id: pollId,
            option_id: optionId,
            user_id: user.id,
          });

        if (error) throw error;
        return { action: "added" };
      }
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["poll", postId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error voting",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
