/**
 * MindBase - Main App
 */
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
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

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) api.setToken(session.access_token);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) api.setToken(session.access_token);
      else api.setToken('');
    });

    return () => subscription.unsubscribe();
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
          // Set up callback for when bubble is tapped
          bubbleService.onTap(async () => {
            // Read clipboard and show save dialog
            try {
              const content = await Clipboard.getString();
              if (content && content.trim()) {
                const isUrl = content.startsWith('http://') || content.startsWith('https://');
                setPendingContent({
                  content: content.trim(),
                  contentType: isUrl ? 'url' : 'text',
                });
                setShowSaveDialog(true);
              }
            } catch (err) {
              console.error('Failed to read clipboard from bubble tap', err);
            }
          });
        }
      } catch (error) {
        console.log('Bubble service initialization failed (expected in Expo Go)');
        setBubbleAvailable(false);
      }
    };

    initBubble();
  }, []);

  // Toggle bubble visibility when bubbleEnabled changes
  useEffect(() => {
    if (!bubbleAvailable || !bubbleService) return;

    if (bubbleEnabled) {
      bubbleService.show();
    } else {
      bubbleService.hide();
    }
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
      await api.saveContent(pendingContent.content, notes);
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
