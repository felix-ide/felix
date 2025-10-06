import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapping of hardcoded Tailwind classes to theme-aware classes
const classReplacements = {
  // Backgrounds
  'bg-slate-900': 'bg-background',
  'bg-slate-950': 'bg-background', 
  'bg-gray-950': 'bg-background',
  'bg-slate-800': 'bg-secondary',
  'bg-gray-800': 'bg-secondary',
  'bg-slate-700': 'bg-muted',
  'bg-slate-600': 'bg-muted', 
  'bg-gray-600': 'bg-muted',
  'bg-gray-100': 'bg-card',
  'bg-white': 'bg-background',
  
  // Blues (primary)
  'bg-blue-600': 'bg-primary',
  'bg-blue-500': 'bg-primary',
  'bg-blue-700': 'bg-primary/90',
  'bg-blue-100': 'bg-primary/10',
  'bg-blue-900': 'bg-primary/20',
  'bg-blue-950': 'bg-primary/30',
  
  // Greens (success)
  'bg-green-500': 'bg-green-500', // Keep semantic colors
  'bg-green-600': 'bg-green-600',
  'bg-green-400': 'bg-green-400',
  'bg-green-100': 'bg-green-100',
  'bg-green-900': 'bg-green-900',
  
  // Reds (destructive)
  'bg-red-500': 'bg-destructive',
  'bg-red-600': 'bg-destructive',
  'bg-red-100': 'bg-destructive/10',
  'bg-red-900': 'bg-destructive/20',
  
  // Text colors
  'text-slate-200': 'text-foreground',
  'text-slate-300': 'text-muted-foreground',
  'text-slate-400': 'text-muted-foreground',
  'text-slate-500': 'text-muted-foreground',
  'text-gray-300': 'text-muted-foreground',
  'text-gray-400': 'text-muted-foreground',
  'text-gray-600': 'text-muted-foreground',
  'text-gray-800': 'text-foreground',
  'text-white': 'text-primary-foreground',
  
  // Blues
  'text-blue-600': 'text-primary',
  'text-blue-700': 'text-primary',
  'text-blue-300': 'text-primary',
  'text-blue-400': 'text-primary',
  
  // Borders
  'border-slate-700': 'border-border',
  'border-slate-200': 'border-border',
  'border-gray-300': 'border-border',
  'border-gray-200': 'border-border',
  'border-gray-400': 'border-border',
  'border-blue-600': 'border-primary',
  'border-white': 'border-primary-foreground',
  
  // Hover states
  'hover:bg-slate-800': 'hover:bg-secondary',
  'hover:bg-slate-600': 'hover:bg-muted',
  'hover:bg-blue-700': 'hover:bg-primary/90',
  'hover:text-slate-400': 'hover:text-muted-foreground',
  'hover:text-white': 'hover:text-foreground',
  'hover:border-gray-400': 'hover:border-border',
  
  // Focus states
  'focus:border-blue-500': 'focus:border-primary',
  'focus:ring-blue-500': 'focus:ring-primary',
  
  // Fill colors
  'fill-white': 'fill-primary-foreground',
};

// Find all TypeScript/TSX files
const files = glob.sync('src/**/*.{ts,tsx}', {
  cwd: __dirname,
  absolute: true
});

console.log(`Found ${files.length} files to process`);

let totalReplacements = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let replacements = 0;
  let modified = false;
  
  // Replace each class
  Object.entries(classReplacements).forEach(([oldClass, newClass]) => {
    // Match the class in className strings
    const regex = new RegExp(`\\b${oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const newContent = content.replace(regex, newClass);
    
    if (newContent !== content) {
      content = newContent;
      modified = true;
      replacements++;
    }
  });
  
  // Remove dark: prefixes (theme system handles dark mode)
  const darkRegex = /\bdark:[\w-]+/g;
  const darkMatches = content.match(darkRegex);
  if (darkMatches) {
    darkMatches.forEach(match => {
      content = content.replace(match, '');
      modified = true;
      replacements++;
    });
  }
  
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${path.relative(__dirname, file)} - ${replacements} replacements`);
    totalReplacements += replacements;
  }
});

console.log(`\nTotal replacements: ${totalReplacements}`);
console.log('Theme class replacement complete!');