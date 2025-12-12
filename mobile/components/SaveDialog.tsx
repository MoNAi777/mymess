/**
 * MindBase - Save Dialog Component
 * Shows a preview and allows adding notes before saving shared content
 */
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

interface SaveDialogProps {
  visible: boolean;
  content: string;
  contentType: 'text' | 'url' | 'file';
  onSave: (notes?: string) => Promise<void>;
  onCancel: () => void;
}

export default function SaveDialog({
  visible,
  content,
  contentType,
  onSave,
  onCancel,
}: SaveDialogProps) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(notes.trim() || undefined);
      setNotes(''); // Reset for next use
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNotes('');
    onCancel();
  };

  // Determine content preview
  const isUrl = contentType === 'url' || content.startsWith('http');
  const previewText = content.length > 200
    ? content.substring(0, 200) + '...'
    : content;

  // Get icon based on content type
  const getIcon = () => {
    if (isUrl) return '🔗';
    if (contentType === 'file') return '📎';
    return '📝';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🧠</Text>
            <Text style={styles.headerTitle}>Save to MindBase</Text>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Content Preview */}
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewIcon}>{getIcon()}</Text>
                <Text style={styles.previewLabel}>
                  {isUrl ? 'Link' : contentType === 'file' ? 'File' : 'Text'}
                </Text>
              </View>
              <Text style={styles.previewText} numberOfLines={5}>
                {previewText}
              </Text>
            </View>

            {/* Notes Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Add notes or tags (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., recipe, work, interesting..."
                placeholderTextColor="#666"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.charCount}>{notes.length}/200</Text>
            </View>

            {/* AI Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>✨</Text>
              <Text style={styles.infoText}>
                AI will automatically categorize and summarize this content
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34, // Safe area
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  previewCard: {
    backgroundColor: '#0f0f1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'uppercase',
  },
  previewText: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  inputSection: {
    marginTop: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#0f0f1a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#8b8bf5',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
