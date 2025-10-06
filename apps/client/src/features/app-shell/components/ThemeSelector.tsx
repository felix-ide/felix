import { useState, useEffect } from 'react';
import { useTheme } from '@felix/theme-system';
import { ChevronDown, Palette } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';

// Available themes with display names
const THEMES = [
  { id: 'felix', name: 'Felix Theme', description: 'Default Felix theme' },
  { id: 'arctic', name: 'Arctic Ice (Light)', description: 'Clean white theme with ice blue accents' },
  { id: 'mars', name: 'Mars Rust (Light)', description: 'Warm cream theme with terracotta tones' },
  { id: 'deep-ocean', name: 'Deep Ocean', description: 'Mysterious underwater depths' },
  { id: 'monochrome-gold', name: 'Monochrome Gold', description: 'Luxurious gold on charcoal' },
  { id: 'northern-lights', name: 'Northern Lights', description: 'Ethereal aurora borealis' },
  { id: 'retro-dark', name: 'Retro Dark', description: '80s/90s cyberpunk with soft neon' },
  { id: 'retro-light', name: 'Retro Light', description: 'Miami Vice aesthetic - bright neon' },
  { id: 'classic-light', name: 'Classic Light', description: 'Clean and bright' },
  { id: 'classic-dark', name: 'Classic Dark', description: 'Easy on the eyes' },
  { id: 'midnight', name: 'Midnight', description: 'Deep blues and purples' },
  { id: 'forest', name: 'Forest', description: 'Natural greens' },
] as const;

const STORAGE_KEY = 'felix-current-theme';
const DEFAULT_THEME = 'felix';

export function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState<string>(DEFAULT_THEME);
  const [isOpen, setIsOpen] = useState(false);
  const { setTheme } = useTheme();

  // Load theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    const effective = savedTheme || DEFAULT_THEME;
    setCurrentTheme(effective);
    try {
      setTheme(effective);
    } catch (error) {
      console.error('[Felix] Failed to apply theme', error);
    }
  }, [setTheme]);

  // Listen for external theme changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setCurrentTheme(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem(STORAGE_KEY, themeId);
    try {
      setTheme(themeId);
    } catch (error) {
      console.error('[Felix] Failed to apply theme', error);
    }
    setIsOpen(false);
  };

  const currentThemeData = THEMES.find(t => t.id === currentTheme) || THEMES[0];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary-foreground"
      >
        <Palette className="h-4 w-4" />
        <span className="hidden sm:inline">{currentThemeData.name}</span>
        <ChevronDown className={cn(
          "h-3 w-3 transition-transform",
          isOpen && "rotate-180"
        )} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-64 rounded-lg bg-card border border-border shadow-lg z-50">
            <div className="p-2">
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                Select Theme
              </div>
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={cn(
                    "w-full text-left px-2 py-2 rounded-md transition-colors",
                    "hover:bg-muted/50",
                    currentTheme === theme.id && "bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{theme.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {theme.description}
                      </div>
                    </div>
                    {currentTheme === theme.id && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
