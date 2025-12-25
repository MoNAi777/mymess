/**
 * MindBase - Main App
 */
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useShareIntent } from 'expo-share-intent';
import { Session } from '@supabase/supabase-js';
import Clipboard from '@react-native-clipboard/clipboard';

import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import SearchScreen from './screens/SearchScreen';
import AuthScreen from './screens/AuthScreen';
import SaveDialog from './components/SaveDialog';
import BubbleToggle from './components/BubbleToggle';
import { BubbleProvider } from './contexts/BubbleContext';
import { api } from './api';
import { supabase } from './config';

// Import bubble service with fallback for Expo Go
let bubbleService: any = null;
try {
  // This will fail in Expo Go (native module not available)
  bubbleService = require('./services/BubbleService').bubbleService;
} catch (e) {
  console.log('Bubble service not available (running in Expo Go)');
}

// Type for pending save content
interface PendingContent {
  content: string;
  contentType: 'text' | 'url' | 'file';
}

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Chat: '💬',
    Search: '🔍',
  };

  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <Text style={styles.tabIconText}>{icons[name]}</Text>
    </View>
  );
}

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingContent, setPendingContent] = useState<PendingContent | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [bubbleEnabled, setBubbleEnabled] = useState(false);
  const [bubbleAvailable, setBubbleAvailable] = useState(false);
  const [showBubbleSettings, setShowBubbleSettings] = useState(false);

  // DEV MODE: Skip Supabase auth but use unique device ID for data isolation
  const DEV_MODE = false;

  // For now, use a shared device ID so all data is accessible
  // TODO: Re-enable unique device IDs once proper user auth is implemented
  const initializeDeviceId = async () => {
    // Use 'default_user' to match existing data - this is temporary for testing
    const deviceId = 'default_user';
    api.setDeviceId(deviceId);
    console.log('Using shared device ID for testing:', deviceId);
    return deviceId;
  };

  useEffect(() => {
    const initAuth = async () => {
      // Always initialize device ID first (for user isolation)
      const deviceId = await initializeDeviceId();

      if (DEV_MODE) {
        // Skip Supabase auth but use unique device ID
        setSession({ user: { id: deviceId } } as any);
        setLoading(false);
        return;
      }

      // Normal Supabase auth check
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) api.setToken(session.access_token);
      setLoading(false);
    };

    initAuth();

    if (!DEV_MODE) {
      // Listen for auth changes only in non-DEV mode
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session) api.setToken(session.access_token);
        else api.setToken("");
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Initialize floating bubble service (Android only, dev build only)
  useEffect(() => {
    const initBubble = async () => {
      if (Platform.OS !== 'android' || !bubbleService) {
        setBubbleAvailable(false);
        return;
      }

      try {
        const initialized = await bubbleService.init();
        setBubbleAvailable(initialized);

        if (initialized) {
          // Load saved bubble state
          const savedState = await AsyncStorage.getItem('bubbleEnabled');
          if (savedState === 'true') {
            setBubbleEnabled(true);
          }
        }
      } catch (error) {
        console.log('Bubble service initialization failed (expected in Expo Go)');
        setBubbleAvailable(false);
      }
    };

    initBubble();

    // Listen for bubble tap intent (deep link)
    const handleBubbleTap = async (event: { url: string }) => {
      if (event.url && event.url.includes('BUBBLE_TAP')) {
        try {
          // First try to get image from clipboard
          const imageData = await Clipboard.getImage();
          if (imageData && imageData.length > 0) {
            // Found an image in clipboard
            setPendingContent({
              content: imageData,
              contentType: 'file', // 'file' indicates image
            });
            setShowSaveDialog(true);
            return;
          }
        } catch (imgErr) {
          // No image in clipboard, try text
          console.log('No image in clipboard, trying text');
        }

        // Try to get text from clipboard
        try {
          const content = await Clipboard.getString();
          if (content && content.trim()) {
            const isUrl = content.startsWith('http://') || content.startsWith('https://');
            setPendingContent({
              content: content.trim(),
              contentType: isUrl ? 'url' : 'text',
            });
            setShowSaveDialog(true);
          } else {
            Alert.alert('Clipboard Empty', 'Copy some text, link, or image first!');
          }
        } catch (err) {
          console.error('Failed to read clipboard from bubble tap', err);
          Alert.alert('Clipboard Error', 'Could not read clipboard');
        }
      }
    };

    // Check if app was opened by bubble tap
    Linking.getInitialURL().then((url) => {
      if (url) handleBubbleTap({ url });
    });

    // Listen for future bubble taps
    const subscription = Linking.addEventListener('url', handleBubbleTap);
    return () => subscription.remove();
  }, []);

  // Toggle bubble visibility when bubbleEnabled changes
  useEffect(() => {
    if (!bubbleAvailable || !bubbleService) return;

    const updateBubble = async () => {
      // Save state
      await AsyncStorage.setItem('bubbleEnabled', bubbleEnabled ? 'true' : 'false');

      // Show or hide bubble
      if (bubbleEnabled) {
        bubbleService.show();
      } else {
        bubbleService.hide();
      }
    };

    updateBubble();
  }, [bubbleEnabled, bubbleAvailable]);

  useEffect(() => {
    const handleShare = () => {
      if (!hasShareIntent) return;

      let contentToSave: string | null = null;
      let contentType: 'text' | 'url' | 'file' = 'text';

      // Handle different share intent types
      if (shareIntent.type === 'text') {
        // Plain text share (WhatsApp messages, etc.)
        contentToSave = (shareIntent as any).value || (shareIntent as any).text;
        contentType = 'text';
      } else if (shareIntent.type === 'weburl') {
        // URL share (links from browsers, etc.)
        contentToSave = (shareIntent as any).webUrl || (shareIntent as any).value;
        contentType = 'url';
      } else if (shareIntent.type === 'file' || shareIntent.type === 'media') {
        // File/media share - save the URI/path
        const files = (shareIntent as any).files || [];
        if (files.length > 0) {
          contentToSave = files[0].path || files[0].uri || JSON.stringify(files[0]);
          contentType = 'file';
        }
      }

      // Fallback: try to extract any text-like content
      if (!contentToSave) {
        const intent = shareIntent as any;
        contentToSave = intent.text || intent.value || intent.webUrl || intent.uri;
        // Detect if it's a URL
        if (contentToSave?.startsWith('http')) {
          contentType = 'url';
        }
      }

      if (contentToSave) {
        // Show the save dialog instead of auto-saving
        setPendingContent({ content: contentToSave, contentType });
        setShowSaveDialog(true);
      } else {
        Alert.alert('Oops!', 'Could not extract content from this share.');
        resetShareIntent();
      }
    };

    if (session) {
      handleShare();
    } else if (hasShareIntent) {
      Alert.alert('Login Required', 'Please login to save shared content.');
    }
  }, [hasShareIntent, shareIntent, resetShareIntent, session]);

  // Handle save from dialog
  const handleSaveFromDialog = async (notes?: string) => {
    if (!pendingContent) return;

    try {
      // Check if content is an image (base64)
      const isImage = pendingContent.contentType === 'file' &&
        (pendingContent.content.startsWith('data:image') || pendingContent.content.length > 500);

      if (isImage) {
        // Upload image
        await api.uploadImage(pendingContent.content, 'image/png', notes);
      } else {
        // Save text/URL content
        await api.saveContent(pendingContent.content, notes);
      }
      setShowSaveDialog(false);
      setPendingContent(null);
      resetShareIntent();

      // Navigate to Home and show success
      if (navigationRef.isReady()) {
        // @ts-ignore
        navigationRef.navigate('Home', { refresh: Date.now() });
      }
      Alert.alert('Saved!', 'Content saved to MindBase', [{ text: 'OK' }]);
    } catch (error: any) {
      Alert.alert('Save Failed', error?.message || 'Could not save content. Please try again.');
      throw error; // Re-throw so dialog knows save failed
    }
  };

  // Handle cancel from dialog
  const handleCancelSave = () => {
    setShowSaveDialog(false);
    setPendingContent(null);
    resetShareIntent();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <AuthScreen onLoginSuccess={() => { }} />
      </View>
    );
  }

  return (
    <BubbleProvider
      bubbleEnabled={bubbleEnabled}
      bubbleAvailable={bubbleAvailable}
      setBubbleEnabled={setBubbleEnabled}
      showBubbleSettings={() => setShowBubbleSettings(true)}
    >
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: '#6366f1',
            tabBarInactiveTintColor: '#666',
            tabBarIcon: ({ focused }) => (
              <TabIcon name={route.name} focused={focused} />
            ),
            tabBarLabel: () => null,
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Chat" component={ChatScreen} />
          <Tab.Screen name="Search" component={SearchScreen} />
        </Tab.Navigator>

        {/* Save Dialog for shared content */}
        <SaveDialog
          visible={showSaveDialog}
          content={pendingContent?.content || ''}
          contentType={pendingContent?.contentType || 'text'}
          onSave={handleSaveFromDialog}
          onCancel={handleCancelSave}
        />

        {/* Bubble Settings Modal */}
        <BubbleToggle
          visible={showBubbleSettings}
          enabled={bubbleEnabled}
          available={bubbleAvailable}
          onToggle={setBubbleEnabled}
          onClose={() => setShowBubbleSettings(false)}
        />
      </NavigationContainer>
    </BubbleProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    backgroundColor: '#1a1a2e',
    borderTopWidth: 0,
    height: 80,
    paddingTop: 10,
    paddingBottom: 20,
  },
  tabIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconFocused: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  tabIconText: {
    fontSize: 24,
  },
});
