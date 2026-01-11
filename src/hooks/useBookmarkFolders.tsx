import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface BookmarkFolder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  bookmark_count: number;
}

export const useBookmarkFolders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bookmark-folders", user?.id],
    queryFn: async (): Promise<BookmarkFolder[]> => {
      if (!user) return [];

      const { data: folders, error } = await supabase
        .from("bookmark_folders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get bookmark counts for each folder
      const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("folder_id")
        .eq("user_id", user.id)
        .not("folder_id", "is", null);

      const countMap: Record<string, number> = {};
      bookmarks?.forEach((b) => {
        if (b.folder_id) {
          countMap[b.folder_id] = (countMap[b.folder_id] || 0) + 1;
        }
      });

      return folders?.map((f) => ({
        ...f,
        bookmark_count: countMap[f.id] || 0,
      })) || [];
    },
    enabled: !!user,
  });
};

export const useCreateBookmarkFolder = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("bookmark_folders")
        .insert({
          user_id: user.id,
          name,
          color: color || "#6366f1",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark-folders"] });
      toast({
        title: "Folder created",
        description: "Your new folder is ready to use.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateBookmarkFolder = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string }) => {
      if (!user) throw new Error("Not authenticated");

      const updates: Record<string, string> = {};
      if (name) updates.name = name;
      if (color) updates.color = color;

      const { error } = await supabase
        .from("bookmark_folders")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark-folders"] });
      toast({
        title: "Folder updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteBookmarkFolder = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("bookmark_folders")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark-folders"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarked-posts"] });
      toast({
        title: "Folder deleted",
        description: "Bookmarks have been moved to unsorted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useMoveBookmarkToFolder = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ postId, folderId }: { postId: string; folderId: string | null }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("bookmarks")
        .update({ folder_id: folderId })
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark-folders"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarked-posts"] });
      toast({
        title: "Bookmark moved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error moving bookmark",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
