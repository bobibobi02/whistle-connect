import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCreateReport } from '@/hooks/useReports';
import { theme } from '@/theme';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  contentType: 'post' | 'comment';
  postId?: string;
  commentId?: string;
}

const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech or discrimination' },
  { value: 'spam', label: 'Spam or misleading content' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

export function ReportModal({ visible, onClose, contentType, postId, commentId }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const createReport = useCreateReport();

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for your report');
      return;
    }

    try {
      await createReport.mutateAsync({
        contentType,
        postId,
        commentId,
        reason: selectedReason,
        details: details || undefined,
      });
      Alert.alert('Report Submitted', 'Thank you for helping keep our community safe.');
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDetails('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Report {contentType}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.description}>
            Help us understand what's wrong with this {contentType}. Your report will be reviewed by our moderation team.
          </Text>

          <Text style={styles.sectionTitle}>Why are you reporting this?</Text>
          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.value}
              style={[
                styles.reasonItem,
                selectedReason === reason.value && styles.reasonItemSelected,
              ]}
              onPress={() => setSelectedReason(reason.value)}
            >
              <View style={styles.radioOuter}>
                {selectedReason === reason.value && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.reasonLabel}>{reason.label}</Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionTitle}>Additional details (optional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Provide any additional context..."
            placeholderTextColor={theme.colors.textMuted}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, !selectedReason && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedReason || createReport.isPending}
          >
            {createReport.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  reasonItemSelected: {
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  reasonLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  textArea: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: 100,
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  submitButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
