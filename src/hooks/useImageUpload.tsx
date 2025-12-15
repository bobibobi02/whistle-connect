import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseImageUploadOptions {
  bucket: string;
  maxSizeMB?: number;
}

export const useImageUpload = ({ bucket, maxSizeMB = 5 }: UseImageUploadOptions) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const uploadImage = async (file: File): Promise<string | null> => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, GIF, WebP)",
        variant: "destructive",
      });
      return null;
    }

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({
        title: "File too large",
        description: `Please upload an image smaller than ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return null;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      setProgress(30);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      setProgress(80);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress(100);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return {
    uploadImage,
    isUploading,
    progress,
  };
};
