import React, { useEffect, useState } from 'react';
import { ThemeProvider, useThemeStore } from '@felix/theme-system';

interface FelixThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
}

export const FelixThemeProvider: React.FC<FelixThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'felix' 
}) => {
  const [initialTheme, setInitialTheme] = useState<string>(defaultTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  
  useEffect(() => {
    // Check for saved theme in localStorage when in integrated mode
    const integrationConfig = (window as any).FELIX_INTEGRATION || (window as any).FELIX_INTEGRATION;
    if (integrationConfig?.isIntegrated) {
      const savedTheme = localStorage.getItem('felix-current-theme');
      if (savedTheme) {
        setInitialTheme(savedTheme);
        // Immediately sync store so variables render on first paint
        try {
          setTheme(savedTheme);
        } catch (error) {
          console.error('[Felix] Failed to apply theme', error);
        }
      }
    }
    // Keep in sync with external changes to the integration key
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'felix-current-theme' && e.newValue) {
        try {
          setTheme(e.newValue);
        } catch (error) {
          console.error('[Felix] Failed to apply theme from storage event', error);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [setTheme]);
  
  return (
    <ThemeProvider defaultTheme={initialTheme}>
      {children}
    </ThemeProvider>
  );
};

// Backwards compatibility export
export const CodeIndexerThemeProvider = FelixThemeProvider;
