import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/theme';
import { useAuth } from '@/hooks/useAuth';
import { RootStackParamList } from '@/navigation/types';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signOut } = useAuth();

  // Note: You'd need hooks for notification preferences, etc.
  const [pushEnabled, setPushEnabled] = React.useState(true);
  const [emailEnabled, setEmailEnabled] = React.useState(true);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity
          style={styles.item}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.itemText}>Edit Profile</Text>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.item}>
          <Text style={styles.itemText}>Push Notifications</Text>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.text}
          />
        </View>

        <View style={styles.item}>
          <Text style={styles.itemText}>Email Notifications</Text>
          <Switch
            value={emailEnabled}
            onValueChange={setEmailEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.text}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Moderation</Text>
        
        <TouchableOpacity
          style={styles.item}
          onPress={() => navigation.navigate('ModQueue')}
        >
          <Text style={styles.itemText}>Mod Queue</Text>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <TouchableOpacity
          style={styles.item}
          onPress={() => Linking.openURL('https://whistle.app/privacy')}
        >
          <Text style={styles.itemText}>Privacy Policy</Text>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => Linking.openURL('https://whistle.app/terms')}
        >
          <Text style={styles.itemText}>Terms of Service</Text>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.item}>
          <Text style={styles.itemText}>Version</Text>
          <Text style={styles.itemValue}>1.0.0</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with 💖 by Whistle Team</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  itemArrow: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.textMuted,
  },
  itemValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  signOutButton: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  signOutText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  footer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
});
