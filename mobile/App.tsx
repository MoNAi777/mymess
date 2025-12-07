/**
 * MindBase - Main App
 */
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useShareIntent } from 'expo-share-intent';
import { Session } from '@supabase/supabase-js';

import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import SearchScreen from './screens/SearchScreen';
import AuthScreen from './screens/AuthScreen';
import { api } from './api';
import { supabase } from './config';

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

  useEffect(() => {
    const handleShare = async () => {
      if (hasShareIntent && shareIntent.type === 'text' && (shareIntent as any).value) {
        console.log('Received share intent:', (shareIntent as any).value);
        try {
          // Auto-save the shared content
          await api.saveContent((shareIntent as any).value);
          // Clear intent
          resetShareIntent();
          // Navigate to Home and refresh
          if (navigationRef.isReady()) {
            // @ts-ignore
            navigationRef.navigate('Home', { refresh: Date.now() });
          }
        } catch (error) {
          console.error('Failed to save shared content:', error);
        }
      }
    };

    if (session) {
      handleShare();
    }
  }, [hasShareIntent, shareIntent, resetShareIntent, navigationRef, session]);

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
    </NavigationContainer>
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
