/**
 * MindBase - Bubble Toggle Component
 * A small toggle button to enable/disable the floating bubble
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Modal,
  Platform,
} from 'react-native';

interface BubbleToggleProps {
  visible: boolean;
  enabled: boolean;
  available: boolean;
  onToggle: (enabled: boolean) => void;
  onClose: () => void;
}

export default function BubbleToggle({
  visible,
  enabled,
  available,
  onToggle,
  onClose,
}: BubbleToggleProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container}>
          <Text style={styles.title}>Floating Bubble</Text>

          {Platform.OS !== 'android' ? (
            <Text style={styles.unavailable}>
              Floating bubble is only available on Android
            </Text>
          ) : !available ? (
            <View>
              <Text style={styles.unavailable}>
                Floating bubble requires a development build.
              </Text>
              <Text style={styles.hint}>
                Build with: npx eas build --platform android --profile development
              </Text>
            </View>
          ) : (
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Enable Bubble</Text>
                <Text style={styles.toggleDescription}>
                  Shows a floating brain icon that lets you save clipboard content from any app
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={onToggle}
                trackColor={{ false: '#3a3a4e', true: '#6366f1' }}
                thumbColor={enabled ? '#fff' : '#888'}
              />
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  unavailable: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#6366f1',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  toggleDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: '#2a2a3e',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});
