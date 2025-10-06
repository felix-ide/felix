/**
 * Theme Receiver for Modules
 * 
 * Listens for theme changes via localStorage events
 */

export class ThemeReceiver {
  private static instance: ThemeReceiver;
  
  constructor() {
    // No WebSocket client needed
  }
  
  static getInstance(): ThemeReceiver {
    if (!this.instance) {
      this.instance = new ThemeReceiver();
    }
    return this.instance;
  }
  
  /**
   * Initialize theme receiver
   */
  init() {
    console.log('[ThemeReceiver] Initializing theme receiver');
    
    // Listen for storage events (cross-tab theme changes)
    window.addEventListener('storage', (e) => {
      if (e.key === 'aigent-smith-current-theme') {
        console.log('[ThemeReceiver] Theme changed via localStorage:', e.newValue);
        this.checkLocalStorageTheme();
      }
    });
    
    // Check localStorage on init
    this.checkLocalStorageTheme();
  }
  
  
  /**
   * Apply CSS variables to document
   */
  private applyTheme(cssVariables: Record<string, string>) {
    console.log('[ThemeReceiver] Applying CSS variables, count:', Object.keys(cssVariables).length);
    
    // Create or update style element (same approach as ThemeContext)
    let styleElement = document.getElementById('theme-system-variables');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'theme-system-variables';
      document.head.appendChild(styleElement);
    }
    
    // Build CSS string
    const cssString = Object.entries(cssVariables)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n');
    
    styleElement.textContent = `:root {\n${cssString}\n}`;
    console.log('[ThemeReceiver] Applied CSS variables to style element');
  }
  
  /**
   * Check localStorage for theme data
   */
  private checkLocalStorageTheme() {
    try {
      const themeId = localStorage.getItem('aigent-smith-current-theme');
      const themeData = localStorage.getItem('aigent-smith-theme-data');
      
      if (themeId && themeData) {
        const theme = JSON.parse(themeData);
        // Apply theme using the same logic as ThemeContext
        document.documentElement.setAttribute('data-theme', theme.type);
        document.documentElement.setAttribute('data-theme-id', themeId);
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }
  }
}