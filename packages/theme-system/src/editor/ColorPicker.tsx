import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ color, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localColor, setLocalColor] = useState(color);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setLocalColor(color);
  }, [color]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  const handleChange = (newColor: string) => {
    setLocalColor(newColor);
    onChange(newColor);
  };
  
  return (
    <div className="color-picker" ref={pickerRef}>
      {label && <label className="color-picker-label">{label}</label>}
      <div className="color-picker-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div 
          className="color-picker-swatch" 
          style={{ backgroundColor: localColor }}
        />
        <input
          type="text"
          className="color-picker-input"
          value={localColor}
          onChange={(e) => handleChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      
      {isOpen && (
        <div className="color-picker-dropdown">
          <input
            type="color"
            value={localColor}
            onChange={(e) => handleChange(e.target.value)}
            className="color-picker-native"
          />
          <div className="color-picker-presets">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                className="color-picker-preset"
                style={{ backgroundColor: preset }}
                onClick={() => {
                  handleChange(preset);
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PRESET_COLORS = [
  '#000000', '#ffffff',
  '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#dc2626', '#d97706', '#16a34a', '#2563eb', '#7c3aed', '#db2777',
  '#991b1b', '#92400e', '#15803d', '#1d4ed8', '#6d28d9', '#be185d',
  '#7f1d1d', '#78350f', '#14532d', '#1e40af', '#5b21b6', '#9f1239',
];