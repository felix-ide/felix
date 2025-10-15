import { useState, useEffect } from 'react';
import { Input } from '@client/shared/ui/Input';
import { cn } from '@/utils/cn';
import type { KBConfigField } from '../api/knowledgeBaseApi';

interface KBConfigFormProps {
  configSchema: KBConfigField[];
  initialValues?: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export function KBConfigForm({ configSchema, initialValues = {}, onChange }: KBConfigFormProps) {
  const [config, setConfig] = useState<Record<string, any>>(() => {
    // Initialize with default values
    const defaults: Record<string, any> = {};
    configSchema.forEach(field => {
      defaults[field.key] = initialValues[field.key] ?? field.defaultValue ??
        (field.type === 'multiselect' ? [] : field.type === 'boolean' ? false : '');
    });
    return defaults;
  });

  // Sync with initialValues changes (but don't reset while user is typing)
  useEffect(() => {
    // Only update if initialValues has actual values (not empty)
    if (Object.keys(initialValues).length > 0) {
      setConfig(prev => {
        const updated: Record<string, any> = {};
        configSchema.forEach(field => {
          // Keep user's current value if they've changed it, otherwise use initialValues
          updated[field.key] = initialValues[field.key] ?? prev[field.key] ?? field.defaultValue ??
            (field.type === 'multiselect' ? [] : field.type === 'boolean' ? false : '');
        });
        return updated;
      });
    }
  }, [initialValues, configSchema]);

  const handleChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const handleMultiselectToggle = (key: string, option: string) => {
    const current = config[key] || [];
    const newValue = current.includes(option)
      ? current.filter((item: string) => item !== option)
      : [...current, option];
    handleChange(key, newValue);
  };

  return (
    <div className="space-y-4">
      {configSchema.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium mb-2">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>

          {/* Text Input */}
          {field.type === 'text' && (
            <Input
              type="text"
              value={config[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
          )}

          {/* Number Input */}
          {field.type === 'number' && (
            <Input
              type="number"
              value={config[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value ? Number(e.target.value) : '')}
              placeholder={field.placeholder}
              required={field.required}
            />
          )}

          {/* Select Dropdown */}
          {field.type === 'select' && (
            <select
              value={config[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              required={field.required}
            >
              <option value="">-- Select --</option>
              {field.options?.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          {/* Multi-select Checkboxes */}
          {field.type === 'multiselect' && (
            <div className="border border-border rounded-md p-3 max-h-48 overflow-y-auto">
              {field.options?.map(option => (
                <label
                  key={option}
                  className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-accent/50 px-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={(config[field.key] || []).includes(option)}
                    onChange={() => handleMultiselectToggle(field.key, option)}
                    className="rounded border-border"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          )}

          {/* Boolean Checkbox */}
          {field.type === 'boolean' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config[field.key] || false}
                onChange={(e) => handleChange(field.key, e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-muted-foreground">
                {field.placeholder || 'Enable'}
              </span>
            </label>
          )}
        </div>
      ))}
    </div>
  );
}
