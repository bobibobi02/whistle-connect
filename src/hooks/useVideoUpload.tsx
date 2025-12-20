import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UseVideoUploadOptions {
  maxSizeMB?: number;
  onProgress?: (progress: number) => void;
}

interface VideoMetadata {
  url: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
  posterUrl?: string;
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov'];
const DEFAULT_MAX_SIZE_MB = 500;

export const useVideoUpload = (options: UseVideoUploadOptions = {}) => {
  const { maxSizeMB = DEFAULT_MAX_SIZE_MB } = options;
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const validateVideo = useCallback((file: File): string | null => {
    // Check file type
    const isValidType = ACCEPTED_VIDEO_TYPES.includes(file.type) || 
                        file.name.toLowerCase().endsWith('.mp4') ||
                        file.name.toLowerCase().endsWith('.webm') ||
                        file.name.toLowerCase().endsWith('.mov');
    
    if (!isValidType) {
      return 'Invalid video format. Please use MP4, WebM, or MOV files.';
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Video is too large. Maximum size is ${maxSizeMB}MB.`;
    }

    return null;
  }, [maxSizeMB]);

  const getVideoDuration = useCallback((file: File): Promise<number | undefined> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(undefined);
      };
      
      video.src = URL.createObjectURL(file);
    });
  }, []);

  const generateThumbnail = useCallback((file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      video.onloadeddata = () => {
        // Seek to 1 second or 10% of video, whichever is less
        const seekTime = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTime;
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(video.src);
            resolve(blob);
          }, 'image/jpeg', 0.8);
        } else {
          URL.revokeObjectURL(video.src);
          resolve(null);
        }
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };
      
      video.src = URL.createObjectURL(file);
    });
  }, []);

  const uploadThumbnail = useCallback(async (blob: Blob): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const fileName = `${user.id}/${Date.now()}-poster.jpg`;
      
      const { error } = await supabase.storage
        .from('post-thumbnails')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      
      if (error) {
        console.error('Thumbnail upload error:', error);
        return null;
      }
      
      const { data: urlData } = supabase.storage
        .from('post-thumbnails')
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      return null;
    }
  }, [user]);

  const uploadVideo = useCallback(async (file: File): Promise<VideoMetadata | null> => {
    if (!user) {
      toast.error('Please sign in to upload videos');
      return null;
    }

    const validationError = validateVideo(file);
    if (validationError) {
      toast.error(validationError);
      return null;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      // Get video duration
      const duration = await getVideoDuration(file);
      setProgress(5);

      // Generate thumbnail
      const thumbnailBlob = await generateThumbnail(file);
      setProgress(10);

      let posterUrl: string | undefined;
      if (thumbnailBlob) {
        posterUrl = await uploadThumbnail(thumbnailBlob) || undefined;
      }
      setProgress(15);

      // Upload video
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      // Simulate progress during upload (Supabase doesn't provide real progress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 500);

      const { error: uploadError } = await supabase.storage
        .from('post-videos')
        .upload(fileName, file, {
          contentType: file.type || 'video/mp4',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (uploadError) {
        throw uploadError;
      }

      setProgress(95);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('post-videos')
        .getPublicUrl(fileName);

      setProgress(100);

      const metadata: VideoMetadata = {
        url: urlData.publicUrl,
        mimeType: file.type || 'video/mp4',
        sizeBytes: file.size,
        durationSeconds: duration,
        posterUrl,
      };

      toast.success('Video uploaded successfully');
      return metadata;
    } catch (error: any) {
      console.error('Video upload error:', error);
      toast.error(error.message || 'Failed to upload video');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [user, validateVideo, getVideoDuration, generateThumbnail, uploadThumbnail]);

  return {
    uploadVideo,
    isUploading,
    progress,
    validateVideo,
    acceptedTypes: ACCEPTED_VIDEO_TYPES.join(','),
    maxSizeMB,
  };
};

export default useVideoUpload;
