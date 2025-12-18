import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/theme';
import { useCreatePost } from '@/hooks/usePosts';
import { useCommunities, useCommunityFlairs } from '@/hooks/useCommunities';
import { useImageUpload } from '@/hooks/useImageUpload';
import { RootStackParamList, MainTabParamList } from '@/navigation/types';

type CreatePostRouteProp = RouteProp<MainTabParamList, 'CreatePost'>;

export function CreatePostScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<CreatePostRouteProp>();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState(route.params?.communityName || '');
  const [selectedFlairId, setSelectedFlairId] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showCommunityPicker, setShowCommunityPicker] = useState(false);
  const [showFlairPicker, setShowFlairPicker] = useState(false);

  const { data: communities } = useCommunities();
  const selectedCommunityData = communities?.find((c) => c.name === selectedCommunity);
  const { data: flairs } = useCommunityFlairs(selectedCommunityData?.id || '');
  
  const createPost = useCreatePost();
  const { pickImage, uploadImage, isUploading } = useImageUpload();

  const handlePickImage = async () => {
    try {
      const asset = await pickImage();
      if (asset) {
        setImageUri(asset.uri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!selectedCommunity) {
      Alert.alert('Error', 'Please select a community');
      return;
    }

    try {
      let imageUrl: string | undefined;
      
      if (imageUri) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        imageUrl = await uploadImage({ uri: imageUri, width: 0, height: 0, type: 'image' });
      }

      const post = await createPost.mutateAsync({
        title,
        content: content || undefined,
        community: selectedCommunity,
        image_url: imageUrl,
        flair_id: selectedFlairId || undefined,
      });

      navigation.navigate('PostDetail', { postId: post.id });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post');
    }
  };

  const selectedFlair = flairs?.find((f) => f.id === selectedFlairId);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* Community Selector */}
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowCommunityPicker(!showCommunityPicker)}
        >
          <Text style={styles.selectorLabel}>Community</Text>
          <Text style={styles.selectorValue}>
            {selectedCommunity ? `r/${selectedCommunity}` : 'Select a community'}
          </Text>
        </TouchableOpacity>

        {showCommunityPicker && (
          <View style={styles.pickerContainer}>
            {communities?.map((community) => (
              <TouchableOpacity
                key={community.id}
                style={styles.pickerItem}
                onPress={() => {
                  setSelectedCommunity(community.name);
                  setSelectedFlairId(null);
                  setShowCommunityPicker(false);
                }}
              >
                <Text style={styles.pickerIcon}>{community.icon}</Text>
                <Text style={styles.pickerText}>{community.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Flair Selector (if community selected and has flairs) */}
        {selectedCommunity && flairs && flairs.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowFlairPicker(!showFlairPicker)}
            >
              <Text style={styles.selectorLabel}>Flair</Text>
              {selectedFlair ? (
                <View
                  style={[
                    styles.flairBadge,
                    { backgroundColor: selectedFlair.background_color || theme.colors.flairBackground },
                  ]}
                >
                  <Text
                    style={[
                      styles.flairText,
                      { color: selectedFlair.color || theme.colors.flairText },
                    ]}
                  >
                    {selectedFlair.name}
                  </Text>
                </View>
              ) : (
                <Text style={styles.selectorValue}>Select flair (optional)</Text>
              )}
            </TouchableOpacity>

            {showFlairPicker && (
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedFlairId(null);
                    setShowFlairPicker(false);
                  }}
                >
                  <Text style={styles.pickerText}>No flair</Text>
                </TouchableOpacity>
                {flairs
                  .filter((f) => !f.is_mod_only)
                  .map((flair) => (
                    <TouchableOpacity
                      key={flair.id}
                      style={styles.pickerItem}
                      onPress={() => {
                        setSelectedFlairId(flair.id);
                        setShowFlairPicker(false);
                      }}
                    >
                      <View
                        style={[
                          styles.flairBadge,
                          { backgroundColor: flair.background_color || theme.colors.flairBackground },
                        ]}
                      >
                        <Text
                          style={[
                            styles.flairText,
                            { color: flair.color || theme.colors.flairText },
                          ]}
                        >
                          {flair.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </>
        )}

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="An interesting title"
            placeholderTextColor={theme.colors.textMuted}
            maxLength={300}
          />
          <Text style={styles.charCount}>{title.length}/300</Text>
        </View>

        {/* Content */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Content</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind?"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Image */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Image</Text>
          {imageUri ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImage}
                onPress={() => setImageUri(null)}
              >
                <Text style={styles.removeImageText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
              <Text style={styles.imageButtonText}>📷 Add Image</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (createPost.isPending || isUploading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={createPost.isPending || isUploading}
        >
          {createPost.isPending || isUploading ? (
            <ActivityIndicator color={theme.colors.text} />
          ) : (
            <Text style={styles.submitButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  form: {
    padding: theme.spacing.lg,
  },
  selector: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  selectorValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  pickerContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    marginTop: -theme.spacing.sm,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  pickerText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  flairBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  flairText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  textArea: {
    minHeight: 120,
  },
  charCount: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  imageButton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
  },
  imageButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  imagePreview: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
  },
  removeImage: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: theme.borderRadius.full,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
});
