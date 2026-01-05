import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { Alert } from 'react-native';

interface UseImageUploadOptions {
  bucket?: string;
  maxSizeMB?: number;
}

export const useImageUpload = ({ 
  bucket = 'post-images', 
  maxSizeMB = 5 
}: UseImageUploadOptions = {}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const pickImage = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to upload images.'
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return result.assets[0];
  };

  const takePhoto = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your camera to take photos.'
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return result.assets[0];
  };

  const uploadImage = async (
    asset: ImagePicker.ImagePickerAsset
  ): Promise<string | null> => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload images');
      return null;
    }

    // Check file size
    if (asset.fileSize && asset.fileSize > maxSizeMB * 1024 * 1024) {
      Alert.alert(
        'File Too Large',
        `Please select an image smaller than ${maxSizeMB}MB`
      );
      return null;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      // Get the file extension
      const uri = asset.uri;
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      setProgress(20);

      // Fetch the image as blob
      const response = await fetch(uri);
      const blob = await response.blob();

      setProgress(40);

      // Convert blob to arraybuffer for upload
      const arrayBuffer = await new Response(blob).arrayBuffer();

      setProgress(60);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, arrayBuffer, {
          contentType: asset.mimeType || 'image/jpeg',
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

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        'Upload Failed',
        error.message || 'Failed to upload image. Please try again.'
      );
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const pickAndUpload = async (): Promise<string | null> => {
    const asset = await pickImage();
    if (!asset) return null;
    return uploadImage(asset);
  };

  const takeAndUpload = async (): Promise<string | null> => {
    const asset = await takePhoto();
    if (!asset) return null;
    return uploadImage(asset);
  };

  return {
    pickImage,
    takePhoto,
    uploadImage,
    pickAndUpload,
    takeAndUpload,
    isUploading,
    progress,
  };
};
