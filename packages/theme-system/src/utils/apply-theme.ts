/**
 * Direct theme application utility
 */

import { generateCSSVariables } from './css-generator.js';
import { getThemeById } from '../themes/index.js';
import type { Theme } from '../types/theme.js';

// Build shadcn/tailwind token CSS like ThemeContext
function toHslTuple(color: string): string | null {
  try {
    const c = color.trim();
    const hslMatch = c.match(/hsla?\(([^)]+)\)/i);
    if (hslMatch) {
      const [h,s,l] = hslMatch[1].split(',').map(p=>p.trim());
      return `${Math.round(parseFloat(h))} ${Math.round(parseFloat(s))}% ${Math.round(parseFloat(l))}%`;
    }
    const rgbMatch = c.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1],10)/255, g=parseInt(rgbMatch[2],10)/255, b=parseInt(rgbMatch[3],10)/255;
      const max=Math.max(r,g,b), min=Math.min(r,g,b); let h=0,s=0,l=(max+min)/2; if(max!==min){const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min); switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break;} h/=6;}
      return `${Math.round(h*360)} ${Math.round(s*100)}% ${Math.round(l*100)}%`;
    }
    const hex = c.length===4?('#'+[...c.slice(1)].map(ch=>ch+ch).join('')):c;
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!m) return null;
    const rr=parseInt(m[1].slice(0,2),16)/255, gg=parseInt(m[1].slice(2,4),16)/255, bb=parseInt(m[1].slice(4,6),16)/255;
    const max=Math.max(rr,gg,bb), min=Math.min(rr,gg,bb); let h=0,s=0,l=(max+min)/2; if(max!==min){const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min); switch(max){case rr:h=(gg-bb)/d+(gg<bb?6:0);break;case gg:h=(bb-rr)/d+2;break;case bb:h=(rr-gg)/d+4;break;} h/=6;}
    return `${Math.round(h*360)} ${Math.round(s*100)}% ${Math.round(l*100)}%`;
  } catch { return null; }
}

function safeHsl(color: string | undefined, fallback: string): string { const v = color && toHslTuple(color); return v || fallback; }
function buildShadcnTokenCss(theme: Theme): string {
  const bg = theme.colors.background; const fg = theme.colors.foreground; const border = theme.colors.border; const prim = theme.colors.primary; const acc = theme.colors.accent; const ui = theme.colors.ui as any;
  const pairs: Record<string,string> = {
    '--background': safeHsl(bg?.primary,'0 0% 100%'),
    '--foreground': safeHsl(fg?.primary,'222.2 84% 4.9%'),
    '--card': safeHsl(ui?.card?.bg||bg?.elevated||bg?.secondary,'0 0% 100%'),
    '--card-foreground': safeHsl(fg?.primary,'222.2 84% 4.9%'),
    '--popover': safeHsl(bg?.elevated||bg?.secondary,'0 0% 100%'),
    '--popover-foreground': safeHsl(fg?.primary,'222.2 84% 4.9%'),
    '--primary': safeHsl(prim?.[500],'222.2 47.4% 11.2%'),
    '--primary-foreground': safeHsl('#ffffff','210 40% 98%'),
    '--secondary': safeHsl(bg?.secondary,'210 40% 96.1%'),
    '--secondary-foreground': safeHsl(fg?.primary,'222.2 47.4% 11.2%'),
    '--accent': safeHsl(acc?.[500]||bg?.secondary,'210 40% 96.1%'),
    '--accent-foreground': safeHsl(fg?.primary,'222.2 47.4% 11.2%'),
    '--muted': safeHsl(bg?.secondary,'210 40% 96.1%'),
    '--muted-foreground': safeHsl(fg?.muted||fg?.tertiary,'215.4 16.3% 46.9%'),
    '--destructive': safeHsl(theme.colors.error?.[500],'0 100% 50%'),
    '--destructive-foreground': safeHsl('#ffffff','210 40% 98%'),
    '--success': safeHsl((theme as Theme).colors.success?.[500],'142 71% 45%'),
    '--success-foreground': safeHsl('#ffffff','0 0% 100%'),
    '--warning': safeHsl((theme as Theme).colors.warning?.[500],'38 92% 50%'),
    '--warning-foreground': safeHsl('#000000','0 0% 10%'),
    '--info': safeHsl((theme as Theme).colors.info?.[500],'199 89% 48%'),
    '--info-foreground': safeHsl('#ffffff','0 0% 100%'),
    '--border': safeHsl(border?.primary,'214.3 31.8% 91.4%'),
    '--input': safeHsl(ui?.input?.bg||bg?.primary,'0 0% 100%'),
    '--ring': safeHsl(border?.focus||prim?.[500],'222.2 84% 4.9%'),
    '--radius': (theme.effects?.borderRadius?.md)||'0.5rem',
  };
  return Object.entries(pairs).map(([k,v])=>`${k}: ${v};`).join('\n  ');
}

export function applyTheme(themeId: string) {
  console.log(`[applyTheme] Applying theme: ${themeId}`);
  
  // Get theme data
  const theme = getThemeById(themeId);
  if (!theme) {
    console.error(`[applyTheme] Theme not found: ${themeId}`);
    return;
  }
  
  console.log(`[applyTheme] Theme type: ${theme.type}, Theme ID: ${themeId}`);
  
  // Set theme attributes
  document.documentElement.setAttribute('data-theme', theme.type);
  document.documentElement.setAttribute('data-theme-id', themeId);
  
  // Generate and apply CSS variables
  const cssVariables = generateCSSVariables(theme);
  
  // Create or update style element
  let styleElement = document.getElementById('theme-system-variables');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'theme-system-variables';
    document.head.appendChild(styleElement);
  }
  
  const shadcnVars = buildShadcnTokenCss(theme as Theme);
  styleElement.textContent = `:root { ${cssVariables} }\n:root {\n  ${shadcnVars}\n}`;
  console.log(`[applyTheme] Theme ${themeId} applied successfully`);
}
