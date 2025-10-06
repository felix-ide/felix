import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './features/app-shell/components/App';
import { CodeIndexerThemeProvider as ThemeProvider } from './themes/CodeIndexerThemeProvider';

const THEME_KEY = 'felix-current-theme';

if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
}

// Theme variables are provided by ThemeProvider. We pass along any saved
// theme as the default so initial paint matches user preference.
const savedTheme = localStorage.getItem(THEME_KEY) || undefined;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme={savedTheme || 'felix'}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
