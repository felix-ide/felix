export interface KBConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  placeholder?: string;
  options?: string[]; // For select/multiselect
  defaultValue?: any;
  required?: boolean;
}

export interface KBRuleDefinition {
  name: string;
  description?: string;
  guidance_text: string;
  guidance_template?: string; // Template string with {{variable}} placeholders
  rule_type?: 'pattern' | 'constraint' | 'semantic' | 'automation';
  trigger_patterns?: {
    files?: string[];
    components?: string[];
    relationships?: string[];
  };
  priority?: number;
  auto_apply?: boolean;
  template_rule_key?: string; // Unique key to identify this rule from the template
}

export interface KBNodeDefinition {
  title: string;
  description?: string;
  content?: string;
  contentTemplate?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  rules?: KBRuleDefinition[];
  children?: KBNodeDefinition[];
}

export interface KBStructureDefinition {
  name: string;
  description: string;
  version: string;
  root: KBNodeDefinition;
  configSchema?: KBConfigField[]; // Optional configuration form fields
}

export interface KBMetadata {
  kb_type: string;
  template_name: string;
  template_version: string;
  kb_config?: Record<string, any>;
  is_kb_root?: boolean;
  kb_node?: boolean;
  kb_description?: string;
}

export interface KBCreateRequest {
  project_path: string;
  template_name: string;
  parent_id?: string;
}

export interface KBCreateResponse {
  root_id: string;
  created_nodes: number;
}

export interface KBTreeNode {
  id: string;
  title: string;
  content: string;
  metadata: any;
  children: KBTreeNode[];
}