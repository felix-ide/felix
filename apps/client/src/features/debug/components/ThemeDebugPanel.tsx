import { useEffect, useState } from 'react';
import { useTheme } from '@felix/theme-system';

export function ThemeDebugPanel() {
  const { theme } = useTheme();
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem('theme-debug') === '1';
    } catch (error) {
      console.error('[Felix] Failed to read theme-debug flag', error);
      return false;
    }
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        const next = !visible;
        setVisible(next);
        try {
          localStorage.setItem('theme-debug', next ? '1' : '0');
        } catch (error) {
          console.error('[Felix] Failed to persist theme-debug flag', error);
        }
      }
    };
    window.addEventListener('keydown', handler);
    (window as any).__toggleThemeDebug = () => {
      const next = !visible;
      setVisible(next);
      try {
        localStorage.setItem('theme-debug', next ? '1' : '0');
      } catch (error) {
        console.error('[Felix] Failed to persist theme-debug flag', error);
      }
    };
    return () => window.removeEventListener('keydown', handler);
  }, [visible]);

  if (!visible) return null;

  const sample = (label: string, bg?: string, text?: string, border?: string) => (
    <div key={label} style={{
      background: bg,
      color: text,
      border: `1px solid ${border || 'transparent'}`,
      borderRadius: 6,
      padding: '2px 6px',
      fontSize: 11,
      display: 'inline-flex',
      gap: 6,
      alignItems: 'center'
    }}>
      <span style={{opacity:0.7}}>{label}</span>
    </div>
  );

  const c = theme.colors;
  const componentKeys: Array<keyof NonNullable<typeof c.components>> = [
    'class',
    'function',
    'method',
    'interface',
    'variable',
    'property',
    'file',
  ];
  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      zIndex: 9999,
      background: c.ui?.card?.bg || c.background?.elevated || '#111827',
      color: c.foreground?.primary || '#e5e7eb',
      border: `1px solid ${c.ui?.card?.border || c.border?.primary || '#374151'}`,
      borderRadius: 8,
      padding: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      minWidth: 260
    }}>
      <div style={{fontWeight: 700, fontSize: 12, marginBottom: 6}}>Theme Debug — {theme.name} ({theme.id})</div>
      <div style={{display:'grid', gridTemplateColumns:'auto 1fr', gap: 6, fontSize: 11}}>
        <div style={{opacity:0.7}}>bg</div><div>{c.background?.primary}</div>
        <div style={{opacity:0.7}}>card</div><div>{c.ui?.card?.bg || '-'}</div>
        <div style={{opacity:0.7}}>text</div><div>{c.foreground?.primary}</div>
      </div>
      <div style={{marginTop:8, display:'flex', gap:6, flexWrap:'wrap'}}>
        {sample('primary', c.primary?.[50], c.primary?.[700], c.primary?.[200])}
        {sample('success', c.success?.[50], c.success?.[700], c.success?.[200])}
        {sample('warning', c.warning?.[50], c.warning?.[700], c.warning?.[200])}
        {sample('error', c.error?.[50], c.error?.[700], c.error?.[200])}
        {sample('info', c.info?.[50], c.info?.[700], c.info?.[200])}
      </div>
      <div style={{marginTop:8, display:'flex', gap:6, flexWrap:'wrap'}}>
        {componentKeys.map((key) => {
          const palette = c.components?.[key];
          return sample(
            key,
            palette?.bg,
            palette?.text,
            palette?.border,
          );
        })}
      </div>
      <div style={{opacity:0.6, marginTop:6, fontSize:10}}>Toggle with Ctrl/Cmd + Shift + D</div>
    </div>
  );
}
