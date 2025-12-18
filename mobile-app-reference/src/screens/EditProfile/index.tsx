import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '@/theme';
import { useAuth } from '@/hooks/useAuth';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/config/supabase';

export function EditProfileScreen() {
  const navigation = useNavigation();
  const { user, profile, refreshProfile } = useAuth();
  const { pickImage, uploadImage, isUploading } = useImageUpload();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);

  const handlePickAvatar = async () => {
    try {
      const asset = await pickImage();
      if (asset) {
        const url = await uploadImage(asset, 'avatars');
        if (url) {
          setAvatarUrl(url);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          username,
          bio,
          avatar_url: avatarUrl,
        })
        .eq('user_id', user.id);

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          Alert.alert('Error', 'Username is already taken');
        } else {
          throw error;
        }
      } else {
        await refreshProfile();
        Alert.alert('Success', 'Profile updated!');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickAvatar} disabled={isUploading}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {displayName?.[0] || username?.[0] || '?'}
              </Text>
            </View>
          )}
          {isUploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color={theme.colors.text} />
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePickAvatar} disabled={isUploading}>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your display name"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={theme.colors.text} />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  avatarSection: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 40,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    color: theme.colors.link,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
  },
  form: {
    padding: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bioInput: {
    minHeight: 100,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
});
