import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { useCreatePost } from '@/hooks/useCreatePost';
import { theme } from '@/theme';

export default function CreatePostScreen() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isNsfw, setIsNsfw] = useState(false);

  const { pickAndUpload: pickImage, takeAndUpload: takePhoto, isUploading: isUploadingImage, progress: imageProgress } = useImageUpload();
  const { pickAndUpload: pickVideo, recordAndUpload: recordVideo, isUploading: isUploadingVideo, progress: videoProgress } = useVideoUpload();
  const createPost = useCreatePost();

  const isUploading = isUploadingImage || isUploadingVideo;
  const progress = isUploadingImage ? imageProgress : videoProgress;

  const handlePickImage = async () => {
    const url = await pickImage();
    if (url) {
      setImageUrl(url);
      setVideoUrl(null);
      setVideoDuration(null);
    }
  };

  const handleTakePhoto = async () => {
    const url = await takePhoto();
    if (url) {
      setImageUrl(url);
      setVideoUrl(null);
      setVideoDuration(null);
    }
  };

  const handlePickVideo = async () => {
    const result = await pickVideo();
    if (result) {
      setVideoUrl(result.videoUrl);
      setVideoDuration(result.durationSeconds ?? null);
      setImageUrl(null);
    }
  };

  const handleRecordVideo = async () => {
    const result = await recordVideo();
    if (result) {
      setVideoUrl(result.videoUrl);
      setVideoDuration(result.durationSeconds ?? null);
      setImageUrl(null);
    }
  };

  const handleRemoveMedia = () => {
    setImageUrl(null);
    setVideoUrl(null);
    setVideoDuration(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your post');
      return;
    }

    createPost.mutate(
      {
        title: title.trim(),
        content: content.trim() || undefined,
        image_url: imageUrl || undefined,
        video_url: videoUrl || undefined,
        is_nsfw: isNsfw,
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Your post has been created!', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
      }
    );
  };

  const showImageOptions = () => {
    Alert.alert('Add Image', 'Choose an option', [
      { text: 'Camera', onPress: handleTakePhoto },
      { text: 'Photo Library', onPress: handlePickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const showVideoOptions = () => {
    Alert.alert('Add Video', 'Choose an option', [
      { text: 'Record Video', onPress: handleRecordVideo },
      { text: 'Video Library', onPress: handlePickVideo },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const isSubmitting = createPost.isPending || isUploading;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Create Post',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || !title.trim()}
              style={[
                styles.postButton,
                (isSubmitting || !title.trim()) && styles.postButtonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Input */}
          <TextInput
            style={styles.titleInput}
            placeholder="Title"
            placeholderTextColor={theme.colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={300}
          />

          {/* Content Input */}
          <TextInput
            style={styles.contentInput}
            placeholder="What's on your mind? (optional)"
            placeholderTextColor={theme.colors.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />

          {/* Image Preview */}
          {imageUrl && (
            <View style={styles.mediaPreviewContainer}>
              <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={handleRemoveMedia}
              >
                <Ionicons name="close-circle" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          )}

          {/* Video Preview */}
          {videoUrl && (
            <View style={styles.mediaPreviewContainer}>
              <Video
                source={{ uri: videoUrl }}
                style={styles.videoPreview}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isMuted
                useNativeControls
              />
              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={handleRemoveMedia}
              >
                <Ionicons name="close-circle" size={28} color={theme.colors.text} />
              </TouchableOpacity>
              <View style={styles.videoBadge}>
                <Ionicons name="videocam" size={16} color={theme.colors.text} />
                {videoDuration && (
                  <Text style={styles.videoDurationText}>
                    {Math.floor(videoDuration / 60)}:{String(videoDuration % 60).padStart(2, '0')}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
              <Text style={styles.progressText}>
                Uploading {isUploadingVideo ? 'video' : 'image'}... {progress}%
              </Text>
            </View>
          )}

          {/* NSFW Toggle */}
          <TouchableOpacity
            style={styles.nsfwToggle}
            onPress={() => setIsNsfw(!isNsfw)}
          >
            <Ionicons
              name={isNsfw ? 'checkbox' : 'square-outline'}
              size={24}
              color={isNsfw ? theme.colors.error : theme.colors.textSecondary}
            />
            <Text style={styles.nsfwText}>Mark as NSFW (18+)</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={showImageOptions}
            disabled={isUploading}
          >
            <Ionicons
              name="image-outline"
              size={24}
              color={imageUrl ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, imageUrl && styles.actionTextActive]}>Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={showVideoOptions}
            disabled={isUploading}
          >
            <Ionicons
              name="videocam-outline"
              size={24}
              color={videoUrl ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, videoUrl && styles.actionTextActive]}>Video</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  titleInput: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
  },
  contentInput: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: 120,
    paddingVertical: theme.spacing.sm,
  },
  mediaPreviewContainer: {
    position: 'relative',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
  },
  videoPreview: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  removeMediaButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
  },
  videoBadge: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  videoDurationText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: '500',
  },
  progressContainer: {
    height: 24,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  nsfwToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  nsfwText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  actionBar: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  actionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  actionTextActive: {
    color: theme.colors.primary,
  },
  postButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    minWidth: 60,
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
