import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Permission to access photos was denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0];
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Permission to access camera was denied');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0];
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset, bucket: string = 'post-images') => {
    if (!user) throw new Error('Must be logged in');

    setIsUploading(true);
    setProgress(0);

    try {
      const ext = asset.uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      // Fetch the image as a blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      // Convert blob to ArrayBuffer
      const arrayBuffer = await new Response(blob).arrayBuffer();

      setProgress(50);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, arrayBuffer, {
          contentType: `image/${ext}`,
          upsert: false,
        });

      if (error) throw error;

      setProgress(100);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    pickImage,
    takePhoto,
    uploadImage,
    isUploading,
    progress,
  };
};
