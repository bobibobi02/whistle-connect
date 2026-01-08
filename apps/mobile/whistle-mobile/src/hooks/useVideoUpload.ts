import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { Alert } from 'react-native';

interface UseVideoUploadOptions {
  bucket?: string;
  maxSizeMB?: number;
}

interface VideoUploadResult {
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
}

export const useVideoUpload = ({
  bucket = 'post-videos',
  maxSizeMB = 500, // 500MB max for videos
}: UseVideoUploadOptions = {}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const pickVideo = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to upload videos.'
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
      videoMaxDuration: 3600, // 1 hour max
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return result.assets[0];
  };

  const recordVideo = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your camera to record videos.'
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
      videoMaxDuration: 3600, // 1 hour max
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return result.assets[0];
  };

  const uploadVideo = async (
    asset: ImagePicker.ImagePickerAsset
  ): Promise<VideoUploadResult | null> => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload videos');
      return null;
    }

    // Check file size
    if (asset.fileSize && asset.fileSize > maxSizeMB * 1024 * 1024) {
      Alert.alert(
        'File Too Large',
        `Please select a video smaller than ${maxSizeMB}MB`
      );
      return null;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const uri = asset.uri;
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'mp4';
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      setProgress(10);

      // Fetch the video as blob
      const response = await fetch(uri);
      const blob = await response.blob();

      setProgress(30);

      // Convert blob to arraybuffer for upload
      const arrayBuffer = await new Response(blob).arrayBuffer();

      setProgress(50);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, arrayBuffer, {
          contentType: asset.mimeType || 'video/mp4',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      setProgress(80);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress(100);

      return {
        videoUrl: publicUrl,
        durationSeconds: asset.duration ? Math.round(asset.duration / 1000) : undefined,
      };
    } catch (error: any) {
      console.error('Video upload error:', error);
      Alert.alert(
        'Upload Failed',
        error.message || 'Failed to upload video. Please try again.'
      );
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const pickAndUpload = async (): Promise<VideoUploadResult | null> => {
    const asset = await pickVideo();
    if (!asset) return null;
    return uploadVideo(asset);
  };

  const recordAndUpload = async (): Promise<VideoUploadResult | null> => {
    const asset = await recordVideo();
    if (!asset) return null;
    return uploadVideo(asset);
  };

  return {
    pickVideo,
    recordVideo,
    uploadVideo,
    pickAndUpload,
    recordAndUpload,
    isUploading,
    progress,
  };
};
