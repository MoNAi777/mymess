/**
 * MindBase - Floating Bubble Service (Stub)
 *
 * NOTE: The floating bubble native package has compatibility issues.
 * This is a stub that gracefully indicates the feature is unavailable.
 * The bubble feature can be added later when a working package is found.
 */
import { Platform, Alert } from 'react-native';

class BubbleService {
  private onTapCallback: (() => void) | null = null;

  /**
   * Initialize - always returns false (feature not available)
   */
  async init(): Promise<boolean> {
    console.log('BubbleService: Floating bubble not available (native package removed due to compatibility issues)');
    return false;
  }

  async hasPermission(): Promise<boolean> {
    return false;
  }

  async requestPermission(): Promise<boolean> {
    Alert.alert(
      'Coming Soon',
      'Floating bubble feature is not yet available. Use the + button in the app to save clipboard content.'
    );
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
}

export const bubbleService = new BubbleService();

export const openOverlaySettings = async () => {
  Alert.alert(
    'Coming Soon',
    'Floating bubble feature is not yet available. Use the + button in the app to save clipboard content.'
  );
};
