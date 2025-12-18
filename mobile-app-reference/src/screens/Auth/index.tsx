import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { useAuth } from '@/hooks/useAuth';

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && !username) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          Alert.alert('Login Failed', error.message);
        }
      } else {
        const { error } = await signUp(email, password, username);
        if (error) {
          Alert.alert('Signup Failed', error.message);
        } else {
          Alert.alert('Success', 'Account created successfully! You can now log in.');
          setIsLogin(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.logo}>🎵</Text>
            <Text style={styles.title}>Whistle</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Welcome back!' : 'Join the conversation'}
            </Text>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Choose a username"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textMuted}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <Text style={styles.buttonText}>
                  {isLogin ? 'Log In' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.switchText}>
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Log in'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  logo: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  form: {
    width: '100%',
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  switchButton: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  switchText: {
    color: theme.colors.link,
    fontSize: theme.fontSize.md,
  },
});
