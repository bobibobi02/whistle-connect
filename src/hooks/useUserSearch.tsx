import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserSearchResult {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  karma: number | null;
  is_verified: boolean | null;
  created_at: string;
}

export const useUserSearch = (query: string) => {
  return useQuery({
    queryKey: ["user-search", query],
    queryFn: async (): Promise<UserSearchResult[]> => {
      if (!query || query.length < 2) {
        return [];
      }

      const searchTerm = `%${query}%`;

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, bio, karma, is_verified, created_at")
        .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
        .order("karma", { ascending: false, nullsFirst: false })
        .limit(20);

      if (error) {
        console.error("User search error:", error);
        return [];
      }

      return data || [];
    },
    enabled: query.length >= 2,
  });
};
