/**
 * MindBase - Floating Bubble Service
 *
 * NOTE: Floating bubble libraries have compatibility issues with Expo SDK 54.
 * The infrastructure (permissions, config plugin) is in place for when a
 * compatible library becomes available.
 *
 * Current status: Feature stub - shows "Coming Soon" message
 */
import { Platform, Alert, Linking } from 'react-native';

class BubbleService {
  private onTapCallback: (() => void) | null = null;

  /**
   * Initialize - feature not yet available
   */
  async init(): Promise<boolean> {
    console.log('BubbleService: Floating bubble coming soon (waiting for compatible library)');
    return false;
  }

  async hasPermission(): Promise<boolean> {
    return false;
  }

  async requestPermission(): Promise<boolean> {
    this.showComingSoonMessage();
    return false;
  }

  async show(): Promise<boolean> {
    return false;
  }

  async hide(): Promise<boolean> {
    return false;
  }

  onTap(callback: () => void): void {
    this.onTapCallback = callback;
  }

  handleTap(): void {
    if (this.onTapCallback) {
      this.onTapCallback();
    }
  }

  isAvailable(): boolean {
    return false;
  }

  private showComingSoonMessage(): void {
    Alert.alert(
      'Floating Bubble - Coming Soon',
      'The floating bubble feature is being developed.\n\nIn the meantime, use:\n• Share button from any app\n• + button to paste from clipboard',
      [{ text: 'OK' }]
    );
  }

  cleanup(): void {
    // No-op for stub
  }
}

export const bubbleService = new BubbleService();

/**
 * Open Android overlay settings
 */
export const openOverlaySettings = async () => {
  if (Platform.OS !== 'android') {
    Alert.alert('Not Available', 'Floating bubble is only available on Android');
    return;
  }

  try {
    await Linking.openSettings();
  } catch (error) {
    Alert.alert('Error', 'Could not open settings');
  }
};
