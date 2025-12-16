/**
 * MindBase - Floating Bubble Service
 * Uses custom native module for Android overlay functionality
 */
import { Platform, Alert, NativeModules } from 'react-native';

const { FloatingBubble } = NativeModules;

class BubbleService {
  private isShowing: boolean = false;
  private onTapCallback: (() => void) | null = null;

  /**
   * Initialize the bubble service
   */
  async init(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('BubbleService: Only available on Android');
      return false;
    }

    if (!FloatingBubble) {
      console.log('BubbleService: Native module not available');
      return false;
    }

    console.log('BubbleService: Initialized');
    return true;
  }

  /**
   * Check if overlay permission is granted
   */
  async hasPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !FloatingBubble) return false;

    try {
      return await FloatingBubble.checkPermission();
    } catch (error) {
      console.error('BubbleService: Error checking permission', error);
      return false;
    }
  }

  /**
   * Request overlay permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'Floating bubble is only available on Android');
      return false;
    }

    if (!FloatingBubble) {
      Alert.alert('Not Available', 'Floating bubble module not loaded');
      return false;
    }

    try {
      const result = await FloatingBubble.requestPermission();
      if (!result) {
        // User was directed to settings, show instructions
        Alert.alert(
          'Permission Required',
          'Please enable "Display over other apps" for MindBase, then return to the app and try again.',
          [{ text: 'OK' }]
        );
      }
      return result;
    } catch (error) {
      console.error('BubbleService: Error requesting permission', error);
      return false;
    }
  }

  /**
   * Show the floating bubble
   */
  async show(): Promise<boolean> {
    if (Platform.OS !== 'android' || !FloatingBubble) return false;

    try {
      // Check permission first
      const hasPermission = await this.hasPermission();
      if (!hasPermission) {
        await this.requestPermission();
        return false;
      }

      const success = await FloatingBubble.showBubble();
      if (success) {
        this.isShowing = true;
        console.log('BubbleService: Bubble shown');
      }
      return success;
    } catch (error) {
      console.error('BubbleService: Error showing bubble', error);
      return false;
    }
  }

  /**
   * Hide the floating bubble
   */
  async hide(): Promise<boolean> {
    if (Platform.OS !== 'android' || !FloatingBubble) return false;

    try {
      const success = await FloatingBubble.hideBubble();
      if (success) {
        this.isShowing = false;
        console.log('BubbleService: Bubble hidden');
      }
      return success;
    } catch (error) {
      console.error('BubbleService: Error hiding bubble', error);
      return false;
    }
  }

  /**
   * Check if bubble feature is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'android' && FloatingBubble != null;
  }

  /**
   * Set callback for when bubble is tapped
   */
  onTap(callback: () => void): void {
    this.onTapCallback = callback;
  }

  /**
   * Handle bubble tap (called from native side)
   */
  handleTap(): void {
    if (this.onTapCallback) {
      this.onTapCallback();
    }
  }

  /**
   * Check if bubble is currently visible
   */
  async isVisible(): Promise<boolean> {
    if (Platform.OS !== 'android' || !FloatingBubble) return false;

    try {
      return await FloatingBubble.isVisible();
    } catch (error) {
      return this.isShowing;
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.hide();
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

  if (FloatingBubble) {
    await FloatingBubble.requestPermission();
  }
};
