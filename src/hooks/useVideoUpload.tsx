import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UseVideoUploadOptions {
  maxSizeMB?: number;
  onProgress?: (progress: number) => void;
  enableModeration?: boolean;
  enableTranscoding?: boolean;
  frameSampleCount?: number; // Number of frames to sample for moderation
}

interface VideoMetadata {
  url: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
  posterUrl?: string;
  hlsUrl?: string;
  muxPlaybackId?: string;
}

interface ModerationResult {
  allowed: boolean;
  reason: string | null;
  confidence: number;
  flaggedCategories: string[];
  frameAnalyses?: {
    frameIndex: number;
    allowed: boolean;
    reason: string | null;
  }[];
}

interface TranscodeResult {
  success: boolean;
  hlsUrl?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  status?: string;
  variants?: {
    quality: string;
    url: string;
    bandwidth: number;
  }[];
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov'];
const DEFAULT_MAX_SIZE_MB = 2000; // 2GB for long videos
const DEFAULT_FRAME_SAMPLE_COUNT = 5;
const MAX_DURATION_SECONDS = 3600; // 1 hour max

export const useVideoUpload = (options: UseVideoUploadOptions = {}) => {
  const { 
    maxSizeMB = DEFAULT_MAX_SIZE_MB,
    enableModeration = true,
    enableTranscoding = true,
    frameSampleCount = DEFAULT_FRAME_SAMPLE_COUNT,
  } = options;
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [moderationResult, setModerationResult] = useState<ModerationResult | null>(null);

  const validateVideo = useCallback((file: File): string | null => {
    const isValidType = ACCEPTED_VIDEO_TYPES.includes(file.type) || 
                        file.name.toLowerCase().endsWith('.mp4') ||
                        file.name.toLowerCase().endsWith('.webm') ||
                        file.name.toLowerCase().endsWith('.mov');
    
    if (!isValidType) {
      return 'Invalid video format. Please use MP4, WebM, or MOV files.';
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Video is too large. Maximum size is ${maxSizeMB}MB.`;
    }

    return null;
  }, [maxSizeMB]);

  const validateDuration = useCallback((durationSeconds: number): string | null => {
    if (durationSeconds > MAX_DURATION_SECONDS) {
      const maxMinutes = Math.floor(MAX_DURATION_SECONDS / 60);
      return `Video is too long. Maximum duration is ${maxMinutes} minutes.`;
    }
    return null;
  }, []);

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

  // Extract multiple frames from video for moderation
  const extractFrames = useCallback(async (
    file: File, 
    count: number
  ): Promise<{ blobs: Blob[]; urls: string[] }> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      
      const blobs: Blob[] = [];
      const frameUrls: string[] = [];
      let currentFrameIndex = 0;
      
      video.onloadedmetadata = async () => {
        const duration = video.duration;
        // Sample frames at regular intervals (excluding first and last 5%)
        const startTime = duration * 0.05;
        const endTime = duration * 0.95;
        const interval = (endTime - startTime) / (count - 1);
        
        const captureFrame = (time: number): Promise<Blob | null> => {
          return new Promise((resolveFrame) => {
            video.currentTime = time;
            
            video.onseeked = () => {
              const canvas = document.createElement('canvas');
              canvas.width = Math.min(video.videoWidth, 1280); // Cap at 720p width
              canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
              
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                  resolveFrame(blob);
                }, 'image/jpeg', 0.7);
              } else {
                resolveFrame(null);
              }
            };
          });
        };
        
        for (let i = 0; i < count; i++) {
          const time = startTime + (interval * i);
          try {
            const blob = await captureFrame(time);
            if (blob) {
              blobs.push(blob);
            }
          } catch (error) {
            console.error(`Failed to capture frame ${i}:`, error);
          }
        }
        
        URL.revokeObjectURL(video.src);
        resolve({ blobs, urls: frameUrls });
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve({ blobs: [], urls: [] });
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

  const uploadThumbnail = useCallback(async (blob: Blob, suffix: string = 'poster'): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const fileName = `${user.id}/${Date.now()}-${suffix}.jpg`;
      
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

  const moderateVideo = useCallback(async (
    videoUrl: string, 
    thumbnailUrl?: string,
    frameUrls?: string[]
  ): Promise<ModerationResult> => {
    if (!user) {
      return { allowed: true, reason: null, confidence: 0, flaggedCategories: [] };
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            videoUrl,
            thumbnailUrl,
            frameUrls,
            userId: user.id,
          }),
        }
      );

      if (!response.ok) {
        console.error('Video moderation failed:', response.status);
        return { allowed: true, reason: null, confidence: 0, flaggedCategories: [] };
      }

      return await response.json();
    } catch (error) {
      console.error('Video moderation error:', error);
      return { allowed: true, reason: null, confidence: 0, flaggedCategories: [] };
    }
  }, [user]);

  const transcodeVideo = useCallback(async (
    videoUrl: string,
    postId: string,
    useMux: boolean = true
  ): Promise<TranscodeResult | null> => {
    if (!user) return null;

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcode-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            videoUrl,
            postId,
            userId: user.id,
            useMux,
          }),
        }
      );

      if (!response.ok) {
        console.error('Video transcoding failed:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Video transcoding error:', error);
      return null;
    }
  }, [user]);

  const uploadVideo = useCallback(async (
    file: File,
    options?: { compress?: boolean }
  ): Promise<VideoMetadata | null> => {
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
    setModerationResult(null);

    try {
      // Get video duration and validate
      setUploadStage('Analyzing video...');
      const duration = await getVideoDuration(file);
      setProgress(5);

      // Validate duration
      if (duration) {
        const durationError = validateDuration(duration);
        if (durationError) {
          toast.error(durationError);
          setIsUploading(false);
          return null;
        }
      }

      // Generate thumbnail
      setUploadStage('Generating thumbnail...');
      const thumbnailBlob = await generateThumbnail(file);
      setProgress(10);

      let posterUrl: string | undefined;
      if (thumbnailBlob) {
        setUploadStage('Uploading thumbnail...');
        posterUrl = await uploadThumbnail(thumbnailBlob, 'poster') || undefined;
      }
      setProgress(15);

      // Extract and upload frames for moderation
      let frameUrls: string[] = [];
      if (enableModeration && frameSampleCount > 1) {
        setUploadStage('Extracting frames for review...');
        const { blobs: frameBlobs } = await extractFrames(file, frameSampleCount);
        setProgress(25);
        
        if (frameBlobs.length > 0) {
          setUploadStage('Uploading frames...');
          const uploadPromises = frameBlobs.map((blob, index) => 
            uploadThumbnail(blob, `frame-${index}`)
          );
          const uploadedUrls = await Promise.all(uploadPromises);
          frameUrls = uploadedUrls.filter((url): url is string => url !== null);
        }
      }
      setProgress(35);

      // Upload video
      setUploadStage('Uploading video...');
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 70) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 2;
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

      setProgress(75);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('post-videos')
        .getPublicUrl(fileName);

      const videoUrl = urlData.publicUrl;

      // Moderate video content with multiple frames
      if (enableModeration) {
        setUploadStage('Checking content...');
        setProgress(80);
        
        const modResult = await moderateVideo(videoUrl, posterUrl, frameUrls);
        setModerationResult(modResult);
        
        if (!modResult.allowed) {
          // Delete the uploaded video since it's not allowed
          await supabase.storage
            .from('post-videos')
            .remove([fileName]);
          
          // Clean up thumbnails and frames
          const filesToDelete: string[] = [];
          if (posterUrl) {
            const posterFileName = posterUrl.split('/').pop();
            if (posterFileName) filesToDelete.push(`${user.id}/${posterFileName}`);
          }
          frameUrls.forEach(url => {
            const frameName = url.split('/').pop();
            if (frameName) filesToDelete.push(`${user.id}/${frameName}`);
          });
          
          if (filesToDelete.length > 0) {
            await supabase.storage
              .from('post-thumbnails')
              .remove(filesToDelete);
          }
          
          const rejectionReason = modResult.reason || 
            (modResult.flaggedCategories.length > 0 
              ? `Flagged for: ${modResult.flaggedCategories.join(', ')}`
              : 'Content violates community guidelines');
          
          toast.error(`Video rejected: ${rejectionReason}`);
          return null;
        }
      }

      // Clean up frame images after moderation (we only need the poster)
      if (frameUrls.length > 0) {
        const frameFiles = frameUrls.map(url => {
          const frameName = url.split('/').pop();
          return frameName ? `${user.id}/${frameName}` : null;
        }).filter((f): f is string => f !== null);
        
        if (frameFiles.length > 0) {
          await supabase.storage
            .from('post-thumbnails')
            .remove(frameFiles);
        }
      }

      setProgress(90);
      setUploadStage('Finalizing...');

      const metadata: VideoMetadata = {
        url: videoUrl,
        mimeType: file.type || 'video/mp4',
        sizeBytes: file.size,
        durationSeconds: duration,
        posterUrl,
      };

      setProgress(100);
      setUploadStage('');

      toast.success('Video uploaded successfully');
      return metadata;
    } catch (error: any) {
      console.error('Video upload error:', error);
      toast.error(error.message || 'Failed to upload video');
      return null;
    } finally {
      setIsUploading(false);
      setUploadStage('');
    }
  }, [
    user, 
    validateVideo, 
    getVideoDuration, 
    generateThumbnail, 
    uploadThumbnail,
    extractFrames,
    enableModeration,
    frameSampleCount,
    moderateVideo
  ]);

  // Trigger transcoding with Mux after post creation
  const triggerTranscode = useCallback(async (
    videoUrl: string,
    postId: string,
    useMux: boolean = true
  ): Promise<TranscodeResult | null> => {
    if (!enableTranscoding || !user) return null;

    try {
      const result = await transcodeVideo(videoUrl, postId, useMux);
      return result;
    } catch (error) {
      console.error('Transcoding error:', error);
      return null;
    }
  }, [enableTranscoding, user, transcodeVideo]);

  // Check Mux asset status
  const checkTranscodeStatus = useCallback(async (
    muxAssetId: string
  ): Promise<TranscodeResult | null> => {
    if (!user) return null;

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcode-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({ muxAssetId }),
        }
      );

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Status check error:', error);
      return null;
    }
  }, [user]);

  return {
    uploadVideo,
    triggerTranscode,
    checkTranscodeStatus,
    isUploading,
    progress,
    uploadStage,
    moderationResult,
    validateVideo,
    acceptedTypes: ACCEPTED_VIDEO_TYPES.join(','),
    maxSizeMB,
  };
};

export default useVideoUpload;
