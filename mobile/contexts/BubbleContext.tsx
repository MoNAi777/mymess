/**
 * MindBase - Bubble Context
 * Provides bubble state and controls to child components
 */
import React, { createContext, useContext, ReactNode } from 'react';

interface BubbleContextType {
  bubbleEnabled: boolean;
  bubbleAvailable: boolean;
  setBubbleEnabled: (enabled: boolean) => void;
  showBubbleSettings: () => void;
}

const BubbleContext = createContext<BubbleContextType | null>(null);

export function useBubble(): BubbleContextType {
  const context = useContext(BubbleContext);
  if (!context) {
    // Return a no-op context if not available
    return {
      bubbleEnabled: false,
      bubbleAvailable: false,
      setBubbleEnabled: () => {},
      showBubbleSettings: () => {},
    };
  }
  return context;
}

interface BubbleProviderProps {
  children: ReactNode;
  bubbleEnabled: boolean;
  bubbleAvailable: boolean;
  setBubbleEnabled: (enabled: boolean) => void;
  showBubbleSettings: () => void;
}

export function BubbleProvider({
  children,
  bubbleEnabled,
  bubbleAvailable,
  setBubbleEnabled,
  showBubbleSettings,
}: BubbleProviderProps) {
  return (
    <BubbleContext.Provider
      value={{ bubbleEnabled, bubbleAvailable, setBubbleEnabled, showBubbleSettings }}
    >
      {children}
    </BubbleContext.Provider>
  );
}
