import React, { useState } from 'react';
import { useThemeStore } from '../context/ThemeContext.js';
import { Theme } from '../types/theme.js';
import { ColorPicker } from './ColorPicker.js';
import './ThemeEditor.css';

interface ThemeEditorProps {
  themeId?: string;
  onSave?: (theme: Theme) => void;
  onCancel?: () => void;
}

export function ThemeEditor({ themeId, onSave, onCancel }: ThemeEditorProps) {
  const store = useThemeStore();
  const existingTheme = themeId ? store.getTheme(themeId) : undefined;
  
  const [theme, setTheme] = useState<Theme>(existingTheme || {
    id: `custom-${Date.now()}`,
    name: 'New Theme',
    description: '',
    author: 'User',
    version: '1.0.0',
    type: 'custom',
    base: 'dark',
    colors: store.currentTheme.colors,
  });
  
  const [activeSection, setActiveSection] = useState<'colors' | 'typography' | 'spacing' | 'effects'>('colors');
  const [activeColorGroup, setActiveColorGroup] = useState<string>('primary');
  
  const handleSave = () => {
    if (existingTheme) {
      store.updateCustomTheme(theme.id, theme);
    } else {
      store.addCustomTheme(theme);
    }
    onSave?.(theme);
  };
  
  const updateThemeProperty = (path: string[], value: any) => {
    const newTheme = { ...theme };
    let current: any = newTheme;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!(path[i] in current)) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    setTheme(newTheme);
    
    // Apply changes live
    store.setTheme(newTheme.id);
  };
  
  return (
    <div className="theme-editor">
      <div className="theme-editor-header">
        <h2>{existingTheme ? 'Edit Theme' : 'Create New Theme'}</h2>
        <div className="theme-editor-actions">
          <button className="btn btn--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={handleSave}>
            Save Theme
          </button>
        </div>
      </div>
      
      <div className="theme-editor-body">
        <div className="theme-editor-sidebar">
          <div className="theme-editor-metadata">
            <input
              type="text"
              className="form-input"
              placeholder="Theme Name"
              value={theme.name}
              onChange={(e) => setTheme({ ...theme, name: e.target.value })}
            />
            <textarea
              className="form-textarea"
              placeholder="Description"
              value={theme.description || ''}
              onChange={(e) => setTheme({ ...theme, description: e.target.value })}
            />
            <select
              className="form-select"
              value={theme.base || 'dark'}
              onChange={(e) => setTheme({ ...theme, base: e.target.value as 'light' | 'dark' })}
            >
              <option value="light">Light Base</option>
              <option value="dark">Dark Base</option>
            </select>
          </div>
          
          <nav className="theme-editor-nav">
            <button
              className={`theme-editor-nav-item ${activeSection === 'colors' ? 'active' : ''}`}
              onClick={() => setActiveSection('colors')}
            >
              Colors
            </button>
            <button
              className={`theme-editor-nav-item ${activeSection === 'typography' ? 'active' : ''}`}
              onClick={() => setActiveSection('typography')}
            >
              Typography
            </button>
            <button
              className={`theme-editor-nav-item ${activeSection === 'spacing' ? 'active' : ''}`}
              onClick={() => setActiveSection('spacing')}
            >
              Spacing
            </button>
            <button
              className={`theme-editor-nav-item ${activeSection === 'effects' ? 'active' : ''}`}
              onClick={() => setActiveSection('effects')}
            >
              Effects
            </button>
          </nav>
        </div>
        
        <div className="theme-editor-content">
          {activeSection === 'colors' && (
            <div className="theme-editor-colors">
              <div className="color-groups">
                {Object.keys(theme.colors).map((group) => (
                  <button
                    key={group}
                    className={`color-group-tab ${activeColorGroup === group ? 'active' : ''}`}
                    onClick={() => setActiveColorGroup(group)}
                  >
                    {group}
                  </button>
                ))}
              </div>
              
              <div className="color-editor">
                {activeColorGroup === 'primary' && (
                  <ColorScaleEditor
                    scale={theme.colors.primary as Record<string, string>}
                    onChange={(scale) => updateThemeProperty(['colors', 'primary'], scale)}
                  />
                )}
                {activeColorGroup === 'background' && (
                  <SurfaceScaleEditor
                    scale={theme.colors.background as Record<string, string>}
                    onChange={(scale) => updateThemeProperty(['colors', 'background'], scale)}
                  />
                )}
                {activeColorGroup === 'foreground' && (
                  <TextScaleEditor
                    scale={theme.colors.foreground as Record<string, string>}
                    onChange={(scale) => updateThemeProperty(['colors', 'foreground'], scale)}
                  />
                )}
              </div>
            </div>
          )}
          
          {activeSection === 'typography' && (
            <div className="theme-editor-typography">
              <p>Typography editor coming soon...</p>
            </div>
          )}
          
          {activeSection === 'spacing' && (
            <div className="theme-editor-spacing">
              <p>Spacing editor coming soon...</p>
            </div>
          )}
          
          {activeSection === 'effects' && (
            <div className="theme-editor-effects">
              <p>Effects editor coming soon...</p>
            </div>
          )}
        </div>
        
        <div className="theme-editor-preview">
          <h3>Preview</h3>
          <ThemePreview theme={theme} />
        </div>
      </div>
    </div>
  );
}

interface ColorScaleEditorProps {
  scale: Record<string, string>;
  onChange: (scale: Record<string, string>) => void;
}

function ColorScaleEditor({ scale, onChange }: ColorScaleEditorProps) {
  return (
    <div className="color-scale-editor">
      {Object.entries(scale).map(([key, value]) => (
        <div key={key} className="color-scale-item">
          <label>{key}</label>
          <ColorPicker
            color={value}
            onChange={(color) => onChange({ ...scale, [key]: color })}
          />
        </div>
      ))}
    </div>
  );
}

function SurfaceScaleEditor({ scale, onChange }: ColorScaleEditorProps) {
  return (
    <div className="surface-scale-editor">
      {Object.entries(scale).map(([key, value]) => (
        <div key={key} className="surface-scale-item">
          <label>{key}</label>
          <ColorPicker
            color={value}
            onChange={(color) => onChange({ ...scale, [key]: color })}
          />
        </div>
      ))}
    </div>
  );
}

function TextScaleEditor({ scale, onChange }: ColorScaleEditorProps) {
  return (
    <div className="text-scale-editor">
      {Object.entries(scale).map(([key, value]) => (
        <div key={key} className="text-scale-item">
          <label>{key}</label>
          <ColorPicker
            color={value}
            onChange={(color) => onChange({ ...scale, [key]: color })}
          />
        </div>
      ))}
    </div>
  );
}

function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <div className="theme-preview" style={{ 
      backgroundColor: theme.colors.background.primary,
      color: theme.colors.foreground.primary 
    }}>
      <div className="preview-card" style={{ 
        backgroundColor: theme.colors.background.secondary,
        borderColor: theme.colors.border.primary 
      }}>
        <h4 style={{ color: theme.colors.foreground.primary }}>Card Title</h4>
        <p style={{ color: theme.colors.foreground.secondary }}>
          This is a preview of how your theme looks.
        </p>
        <div className="preview-buttons">
          <button style={{ 
            backgroundColor: theme.colors.primary[500],
            color: theme.colors.foreground.inverse 
          }}>
            Primary
          </button>
          <button style={{ 
            backgroundColor: theme.colors.secondary[500],
            color: theme.colors.foreground.inverse 
          }}>
            Secondary
          </button>
        </div>
      </div>
    </div>
  );
}