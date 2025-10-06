import { TextConverters } from '../TextConverters';

describe('TextConverters', () => {
  describe('component converter', () => {
    it('should include all component fields', () => {
      const component = {
        id: 'comp-1',
        name: 'getUserById',
        type: 'function' as any,
        language: 'typescript',
        filePath: '/src/users.ts',
        location: {} as any,
        metadata: {
          description: 'Fetches user by ID',
          documentation: 'This function retrieves a user from the database'
        },
        code: 'function getUserById(id: string) { return db.users.find(id); }'
      } as any;

      const result = TextConverters.component(component);
      
      expect(result).toContain('getUserById');
      expect(result).toContain('function');
      expect(result).toContain('typescript');
      expect(result).toContain('Fetches user by ID');
      expect(result).toContain('This function retrieves a user from the database');
      expect(result).toContain('function getUserById');
    });

    it('should handle missing optional fields', () => {
      const component = {
        id: 'comp-2',
        name: 'simpleFunc',
        type: 'function' as any,
        language: 'javascript',
        filePath: '/src/simple.js',
        location: {} as any
      } as any;

      const result = TextConverters.component(component);
      
      expect(result).toBe('simpleFunc function javascript');
    });

    it('should truncate long code to 300 characters', () => {
      const longCode = 'x'.repeat(1000);
      const component = {
        id: 'comp-3',
        name: 'longFunc',
        type: 'function' as any,
        language: 'javascript',
        filePath: '/src/long.js',
        location: {} as any,
        code: longCode
      } as any;

      const result = TextConverters.component(component);
      
      // Component converter includes only first 300 chars of code
      expect(result).toContain('x'.repeat(300));
      expect(result.length).toBeLessThan(430); // Signature + snippet should be bounded
    });
  });

  describe('task converter', () => {
    it('should include all task fields', () => {
      const task = {
        id: 'task-1',
        title: 'Implement authentication',
        task_type: 'story',
        task_status: 'in_progress',
        task_priority: 'high',
        description: 'Add OAuth2 authentication to the API',
        assigned_to: 'john.doe@example.com',
        tags: {
          stable_tags: ['auth', 'security', 'api']
        }
      } as any;

      const result = TextConverters.task(task);
      
      expect(result).toContain('Implement authentication');
      expect(result).toContain('story');
      expect(result).toContain('in_progress');
      expect(result).toContain('high');
      expect(result).toContain('Add OAuth2 authentication to the API');
      expect(result).toContain('john.doe@example.com');
      expect(result).toContain('auth security api');
    });

    it('should handle missing optional fields', () => {
      const task = {
        id: 'task-2',
        title: 'Simple task',
        task_type: 'task',
        task_status: 'todo',
        task_priority: 'medium'
      } as any;

      const result = TextConverters.task(task);
      
      expect(result).toBe('Simple task task todo medium');
    });
  });

  describe('note converter', () => {
    it('should include all note fields', () => {
      const note = {
        id: 'note-1',
        title: 'Architecture Decision',
        note_type: 'documentation',
        content: 'We decided to use microservices architecture for better scalability',
        entity_links: [
          { entity_type: 'component', entity_id: 'comp-1' },
          { entity_type: 'task', entity_id: 'task-1' }
        ],
        tags: {
          stable_tags: ['architecture', 'design']
        }
      } as any;

      const result = TextConverters.note(note);
      
      expect(result).toContain('Architecture Decision');
      expect(result).toContain('documentation');
      expect(result).toContain('We decided to use microservices');
      expect(result).toContain('component:comp-1');
      expect(result).toContain('task:task-1');
      expect(result).toContain('architecture design');
    });

    it('should truncate long content to 1000 characters', () => {
      const longContent = 'x'.repeat(2000);
      const note = {
        id: 'note-2',
        note_type: 'note',
        content: longContent
      } as any;

      const result = TextConverters.note(note);
      
      expect(result).toContain('x'.repeat(1000));
      expect(result.length).toBeLessThan(1100); // Should be truncated
    });
  });

  describe('rule converter', () => {
    it('should include all rule fields', () => {
      const rule = {
        id: 'rule-1',
        name: 'Use async/await',
        rule_type: 'pattern',
        description: 'Prefer async/await over callbacks',
        guidance_text: 'Modern JavaScript should use async/await for better readability',
        code_template: 'async function example() { const result = await fetch(url); }',
        validation_script: 'if (node.type === "CallExpression") { return true; }'
      } as any;

      const result = TextConverters.rule(rule);
      
      expect(result).toContain('Use async/await');
      expect(result).toContain('pattern');
      expect(result).toContain('Prefer async/await over callbacks');
      expect(result).toContain('Modern JavaScript should use async/await');
      expect(result).toContain('async function example()');
      expect(result).toContain('CallExpression');
    });

    it('should truncate long templates and scripts', () => {
      const longTemplate = 'x'.repeat(1000);
      const longScript = 'y'.repeat(500);
      const rule = {
        id: 'rule-2',
        name: 'Long rule',
        rule_type: 'automation',
        guidance_text: 'Test',
        code_template: longTemplate,
        validation_script: longScript
      } as any;

      const result = TextConverters.rule(rule);
      
      expect(result).toContain('x'.repeat(500));
      expect(result).toContain('y'.repeat(200));
      expect(result.length).toBeLessThan(800); // Should be truncated
    });
  });

  describe('normalize', () => {
    it('should remove excessive whitespace', () => {
      const text = '  This   has    too     many    spaces  ';
      const result = TextConverters.normalize(text);
      
      expect(result).toBe('This has too many spaces');
    });

    it('should replace newlines with spaces', () => {
      const text = 'Line one\nLine two\n\nLine three';
      const result = TextConverters.normalize(text);
      
      expect(result).toBe('Line one Line two Line three');
    });

    it('should handle mixed whitespace', () => {
      const text = '  \n  Mixed \t whitespace \n\n  text  \t';
      const result = TextConverters.normalize(text);
      
      expect(result).toBe('Mixed whitespace text');
    });

    it('should return empty string for whitespace-only input', () => {
      const text = '   \n\t  ';
      const result = TextConverters.normalize(text);
      
      expect(result).toBe('');
    });
  });

  describe('extractKeywords', () => {
    it('should extract unique words', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const result = TextConverters.extractKeywords(text);
      
      expect(result).toContain('quick');
      expect(result).toContain('brown');
      expect(result).toContain('fox');
      expect(result).toContain('jumps');
      expect(result).toContain('over');
      expect(result).toContain('lazy');
      expect(result).toContain('dog');
    });

    it('should filter out stop words', () => {
      const text = 'The and for are but not you all';
      const result = TextConverters.extractKeywords(text);
      
      expect(result).toEqual([]); // All are stop words
    });

    it('should filter out short words', () => {
      const text = 'a ab abc abcd';
      const result = TextConverters.extractKeywords(text);
      
      expect(result).toEqual(['abc', 'abcd']); // Only words > 2 chars
    });

    it('should convert to lowercase', () => {
      const text = 'JavaScript TypeScript React';
      const result = TextConverters.extractKeywords(text);
      
      expect(result).toContain('javascript');
      expect(result).toContain('typescript');
      expect(result).toContain('react');
    });

    it('should handle duplicates', () => {
      const text = 'test test testing test';
      const result = TextConverters.extractKeywords(text);
      
      expect(result).toContain('test');
      expect(result).toContain('testing');
      expect(result.filter(w => w === 'test').length).toBe(1); // Only one 'test'
    });
  });
});
