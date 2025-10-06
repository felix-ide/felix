# @felix/theme-system

Advanced theme system for AIgent Smith with support for multiple themes and user customization.

## Features

- 🎨 Multiple built-in themes (Classic Light/Dark, Midnight, Forest, and more)
- 🎯 Custom theme creation and editing
- 💾 Theme import/export functionality
- 🔄 Live theme switching without page reload
- 🌗 Automatic light/dark/system mode support
- 🎨 Visual theme editor with color pickers
- 📦 Theme persistence in local storage
- 🔧 CSS variable generation for easy integration

## Installation

```bash
npm install @felix/theme-system
```

## Quick Start

### 1. Add the Theme Provider

Wrap your app with the `ThemeProvider`:

```tsx
import { ThemeProvider } from '@felix/theme-system';

function App() {
  return (
    <ThemeProvider defaultTheme="classic-dark" defaultMode="system">
      <YourApp />
    </ThemeProvider>
  );
}
```

### 2. Use Theme in Components

```tsx
import { useTheme, useThemeColors } from '@felix/theme-system';

function MyComponent() {
  const { theme, setTheme, themes } = useTheme();
  const colors = useThemeColors();
  
  return (
    <div style={{ color: colors.foreground.primary }}>
      <h1>Current theme: {theme.name}</h1>
      
      <select onChange={(e) => setTheme(e.target.value)}>
        {themes.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}
```

### 3. Use CSS Variables

The theme system automatically generates CSS variables:

```css
.my-component {
  background: var(--theme-bg-primary);
  color: var(--theme-text-primary);
  border: 1px solid var(--theme-border-primary);
}

.button-primary {
  background: var(--color-primary-500);
  color: var(--theme-text-inverse);
}

.button-primary:hover {
  background: var(--color-primary-600);
}
```

## Built-in Themes

- **Classic Light** - Clean, professional light theme
- **Classic Dark** - Modern dark theme for reduced eye strain
- **Midnight** - Deep blue and purple dark theme
- **Forest** - Nature-inspired green theme
- **Ocean** - Blue maritime theme (coming soon)
- **Sunset** - Warm orange/red theme (coming soon)

## Theme Editor

Include the theme editor for users to create custom themes:

```tsx
import { ThemeEditor } from '@felix/theme-system/editor';

function SettingsPage() {
  const [showEditor, setShowEditor] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowEditor(true)}>
        Create Custom Theme
      </button>
      
      {showEditor && (
        <ThemeEditor
          onSave={(theme) => {
            console.log('Theme saved:', theme);
            setShowEditor(false);
          }}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </>
  );
}
```

## API Reference

### ThemeProvider

```tsx
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: string;
  defaultMode?: 'light' | 'dark' | 'system';
}
```

### useTheme Hook

```tsx
const {
  theme,        // Current active theme
  themeId,      // Current theme ID
  themeMode,    // 'light' | 'dark' | 'system'
  setTheme,     // Change theme by ID
  setThemeMode, // Change theme mode
  themes,       // All available themes
} = useTheme();
```

### useThemeStore Hook

Access the full theme store for advanced usage:

```tsx
const store = useThemeStore();

// Add custom theme
store.addCustomTheme(myTheme);

// Export theme as JSON
const json = store.exportTheme('my-theme-id');

// Import theme from JSON
store.importTheme(json);
```

## CSS Variables

The theme system generates comprehensive CSS variables:

### Color Variables
- `--color-primary-[50-950]` - Primary color scale
- `--color-secondary-[50-950]` - Secondary color scale
- `--color-success-[50-950]` - Success color scale
- `--color-error-[50-950]` - Error color scale

### Background Variables
- `--theme-bg-primary` - Main background
- `--theme-bg-secondary` - Secondary background
- `--theme-bg-tertiary` - Tertiary background
- `--theme-bg-elevated` - Elevated surfaces

### Text Variables
- `--theme-text-primary` - Primary text
- `--theme-text-secondary` - Secondary text
- `--theme-text-muted` - Muted text
- `--theme-text-inverse` - Inverse text

### Border Variables
- `--theme-border-primary` - Primary borders
- `--theme-border-secondary` - Secondary borders
- `--theme-border-focus` - Focus state borders

## Creating Custom Themes

```typescript
import { Theme } from '@felix/theme-system';

const myTheme: Theme = {
  id: 'my-custom-theme',
  name: 'My Custom Theme',
  description: 'A beautiful custom theme',
  author: 'Your Name',
  version: '1.0.0',
  type: 'dark',
  colors: {
    primary: { /* color scale */ },
    secondary: { /* color scale */ },
    // ... other colors
  }
};

// Add to theme system
store.addCustomTheme(myTheme);
```
