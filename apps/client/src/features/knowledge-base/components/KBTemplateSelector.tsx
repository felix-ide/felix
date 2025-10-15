import { useState } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { Plus, BookOpen, X } from 'lucide-react';
import type { KBTemplate } from '../api/knowledgeBaseApi';

interface KBTemplateSelectorProps {
  templates: KBTemplate[];
  onCreateKB: (templateName: string, customName: string, kbConfig?: Record<string, any>) => Promise<void>;
  isCreating: boolean;
}

export function KBTemplateSelector({ templates, onCreateKB, isCreating }: KBTemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');

  const selectedTemplateData = templates.find(t => t.name === selectedTemplate);

  const handleTemplateSelect = (templateName: string) => {
    setSelectedTemplate(templateName);
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setCustomName('');
  };

  const handleCreate = async () => {
    if (!selectedTemplate || !customName.trim()) return;

    try {
      await onCreateKB(selectedTemplate, customName.trim());
      setIsOpen(false);
      setSelectedTemplate(null);
      setCustomName('');
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="default">
        <Plus className="w-4 h-4 mr-2" />
        Create Knowledge Base
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
          <div className="bg-background rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {selectedTemplate ? 'Name Your Knowledge Base' : 'Choose Template'}
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Template Selection */}
              {!selectedTemplate && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Choose a template to start your knowledge base.
                  </p>

                  <div className="grid gap-3">
                    {templates.map(template => (
                      <button
                        key={template.name}
                        onClick={() => handleTemplateSelect(template.name)}
                        className="p-4 border border-border rounded-lg text-left transition-all hover:border-primary hover:bg-primary/5"
                      >
                        <div className="flex items-start gap-3">
                          <BookOpen className="w-5 h-5 mt-0.5 text-primary" />
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{template.display_name}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {template.description}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {template.sections.slice(0, 4).map(section => (
                                <span
                                  key={section}
                                  className="text-xs px-2 py-0.5 bg-secondary rounded"
                                >
                                  {section}
                                </span>
                              ))}
                              {template.sections.length > 4 && (
                                <span className="text-xs px-2 py-0.5 text-muted-foreground">
                                  +{template.sections.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Name Input */}
              {selectedTemplate && selectedTemplateData && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Give your knowledge base a name.
                  </p>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Knowledge Base Name
                      <span className="text-destructive ml-1">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., My Project Documentation, API Reference..."
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full"
                      autoFocus
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-border">
                    <Button variant="outline" onClick={handleBack} disabled={isCreating}>
                      Back
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={!customName.trim() || isCreating}
                    >
                      {isCreating ? 'Creating...' : 'Create Knowledge Base'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
