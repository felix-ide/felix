/**
 * Unit tests for PHP FQN resolution with nikic/PHP-Parser
 * Tests namespaces, use aliases, traits, extends/implements relationships
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { join, resolve } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { ComponentType, RelationshipType } from '../../types.js';

// Unmock PhpParser for these tests
jest.unmock('../../parsers/PhpParser.js');
import { PhpParser } from '../../parsers/PhpParser.js';

describe('PHP FQN Resolution', () => {
  let testDir: string;
  let parser: PhpParser;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), 'php-fqn-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });

    // Initialize parser
    parser = new PhpParser();
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Basic Namespace Resolution', () => {
    it('should resolve classes in namespaces using FQNs for component IDs', async () => {
      const filePath = join(testDir, 'src', 'App', 'User.php');
      mkdirSync(join(testDir, 'src', 'App'), { recursive: true });

      const content = `<?php
namespace App;

class User {
    public function getName() {
        return $this->name;
    }
}
`;

      writeFileSync(filePath, content);

      const components = await parser.detectComponents(content, filePath);

      // Find the class component
      const userClass = components.find((c: any) =>
        c.type === ComponentType.CLASS && c.name === 'User'
      );

      expect(userClass).toBeDefined();
      expect(userClass?.metadata?.fqn).toBe('App\\User');
      expect(userClass?.metadata?.namespace).toBe('App');
      // Component ID should be based on FQN for uniqueness
      expect(userClass?.id).toContain('App\\User');
    });

    it('should handle global namespace classes', async () => {
      const filePath = join(testDir, 'GlobalClass.php');
      const content = `<?php

class GlobalClass {
    public function test() {}
}
`;

      writeFileSync(filePath, content);

      const components = await parser.detectComponents(content, filePath);

      // Find the class component
      const globalClass = components.find((c: any) =>
        c.type === ComponentType.CLASS && c.name === 'GlobalClass'
      );

      expect(globalClass).toBeDefined();
      expect(globalClass?.metadata?.fqn).toBe('GlobalClass');
      expect(globalClass?.metadata?.namespace).toBeUndefined();
    });
  });

  describe('Use Statement and Alias Resolution', () => {
    it('should resolve use statements and aliases correctly', async () => {
      const baseFilePath = join(testDir, 'src', 'Services', 'UserService.php');
      const targetFilePath = join(testDir, 'src', 'Models', 'User.php');

      mkdirSync(join(testDir, 'src', 'Services'), { recursive: true });
      mkdirSync(join(testDir, 'src', 'Models'), { recursive: true });

      // Target class
      const targetContent = `<?php
namespace App\\Models;

class User {
    public function getId() {
        return $this->id;
    }
}
`;

      // Base class that uses the target with alias
      const baseContent = `<?php
namespace App\\Services;

use App\\Models\\User as UserModel;
use App\\Services\\Logger;

class UserService extends Logger {
    public function getUser(): UserModel {
        return new UserModel();
    }
}
`;

      writeFileSync(targetFilePath, targetContent);
      writeFileSync(baseFilePath, baseContent);

      // Parse the base file
      const components = await parser.detectComponents(baseContent, baseFilePath);
      const relationships = await parser.detectRelationships(components, baseContent);

      // Find the class component
      const userServiceClass = components.find((c: any) =>
        c.type === ComponentType.CLASS && c.name === 'UserService'
      );

      expect(userServiceClass).toBeDefined();
      expect(userServiceClass?.metadata?.fqn).toBe('App\\Services\\UserService');

      // Check if extends relationship was created (even if unresolved)
      const extendsRelationship = relationships.find((r: any) =>
        r.type === RelationshipType.EXTENDS &&
        r.sourceId === userServiceClass?.id
      );

      expect(extendsRelationship).toBeDefined();
      // Should resolve extends to FQN
      expect(extendsRelationship?.metadata?.targetFqn).toBe('App\\Services\\Logger');
    });
  });

  describe('Inheritance Resolution', () => {
    it('should resolve extends relationships using FQNs', async () => {
      const filePath = join(testDir, 'inheritance.php');
      const content = `<?php
namespace App;

abstract class BaseClass {
    public function baseMethod() {}
}

class DerivedClass extends BaseClass {
    public function derivedMethod() {}
}
`;

      writeFileSync(filePath, content);

      const components = await parser.detectComponents(content, filePath);
      const relationships = await parser.detectRelationships(components, content);

      // Find both classes
      const baseClass = components.find((c: any) =>
        c.type === ComponentType.CLASS && c.name === 'BaseClass'
      );
      const derivedClass = components.find((c: any) =>
        c.type === ComponentType.CLASS && c.name === 'DerivedClass'
      );

      expect(baseClass).toBeDefined();
      expect(derivedClass).toBeDefined();

      expect(baseClass?.metadata?.fqn).toBe('App\\BaseClass');
      expect(derivedClass?.metadata?.fqn).toBe('App\\DerivedClass');

      // Check extends relationship
      const extendsRelationship = relationships.find((r: any) =>
        r.type === RelationshipType.EXTENDS &&
        r.sourceId === derivedClass?.id
      );

      expect(extendsRelationship).toBeDefined();
      expect(extendsRelationship?.targetId).toBe(baseClass?.id);
      expect(extendsRelationship?.metadata?.targetFqn).toBe('App\\BaseClass');
      expect(extendsRelationship?.metadata?.isResolved).toBe(true);
    });
  });

  describe('Interface Implementation', () => {
    it('should resolve implements relationships using FQNs', async () => {
      const filePath = join(testDir, 'interfaces.php');
      const content = `<?php
namespace App\\Contracts;

interface Loggable {
    public function log(string $message): void;
}

interface Cacheable {
    public function cache(): void;
}

class Logger implements Loggable, Cacheable {
    public function log(string $message): void {
        echo $message;
    }

    public function cache(): void {
        // Implementation
    }
}
`;

      writeFileSync(filePath, content);

      const components = await parser.detectComponents(content, filePath);
      const relationships = await parser.detectRelationships(components, content);

      // Find interfaces and class
      const loggableInterface = components.find((c: any) =>
        c.type === ComponentType.INTERFACE && c.name === 'Loggable'
      );
      const cacheableInterface = components.find((c: any) =>
        c.type === ComponentType.INTERFACE && c.name === 'Cacheable'
      );
      const loggerClass = components.find((c: any) =>
        c.type === ComponentType.CLASS && c.name === 'Logger'
      );

      expect(loggableInterface).toBeDefined();
      expect(cacheableInterface).toBeDefined();
      expect(loggerClass).toBeDefined();

      expect(loggableInterface?.metadata?.fqn).toBe('App\\Contracts\\Loggable');
      expect(cacheableInterface?.metadata?.fqn).toBe('App\\Contracts\\Cacheable');
      expect(loggerClass?.metadata?.fqn).toBe('App\\Contracts\\Logger');

      // Check implements relationships
      const implementsRelationships = relationships.filter((r: any) =>
        r.type === RelationshipType.IMPLEMENTS &&
        r.sourceId === loggerClass?.id
      );

      expect(implementsRelationships).toHaveLength(2);

      const loggableImpl = implementsRelationships.find((r: any) =>
        r.targetId === loggableInterface?.id
      );
      const cacheableImpl = implementsRelationships.find((r: any) =>
        r.targetId === cacheableInterface?.id
      );

      expect(loggableImpl).toBeDefined();
      expect(cacheableImpl).toBeDefined();

      expect(loggableImpl?.metadata?.targetFqn).toBe('App\\Contracts\\Loggable');
      expect(cacheableImpl?.metadata?.targetFqn).toBe('App\\Contracts\\Cacheable');
      expect(loggableImpl?.metadata?.isResolved).toBe(true);
      expect(cacheableImpl?.metadata?.isResolved).toBe(true);
    });
  });

  describe('Trait Usage', () => {
    it('should resolve trait usage relationships using FQNs', async () => {
      const filePath = join(testDir, 'traits.php');
      const content = `<?php
namespace App\\Traits;

trait Timestampable {
    public function timestamp() {
        return date('Y-m-d H:i:s');
    }
}

trait Loggable {
    public function log($message) {
        echo $message;
    }
}

class Article {
    use Timestampable, Loggable;

    public function publish() {
        $this->log('Article published at ' . $this->timestamp());
    }
}
`;

      writeFileSync(filePath, content);

      const components = await parser.detectComponents(content, filePath);
      const relationships = await parser.detectRelationships(components, content);

      // Find traits and class
      const timestampableTrait = components.find((c: any) =>
        c.type === ComponentType.CLASS &&
        c.name === 'Timestampable' &&
        c.metadata?.isTrait === true
      );
      const loggableTrait = components.find((c: any) =>
        c.type === ComponentType.CLASS &&
        c.name === 'Loggable' &&
        c.metadata?.isTrait === true
      );
      const articleClass = components.find((c: any) =>
        c.type === ComponentType.CLASS && c.name === 'Article'
      );

      expect(timestampableTrait).toBeDefined();
      expect(loggableTrait).toBeDefined();
      expect(articleClass).toBeDefined();

      expect(timestampableTrait?.metadata?.fqn).toBe('App\\Traits\\Timestampable');
      expect(loggableTrait?.metadata?.fqn).toBe('App\\Traits\\Loggable');
      expect(articleClass?.metadata?.fqn).toBe('App\\Traits\\Article');

      // Check trait usage relationships
      const usesRelationships = relationships.filter((r: any) =>
        r.type === RelationshipType.USES &&
        r.sourceId === articleClass?.id &&
        r.metadata?.usageType === 'trait'
      );

      expect(usesRelationships).toHaveLength(2);

      const timestampableUse = usesRelationships.find((r: any) =>
        r.targetId === timestampableTrait?.id
      );
      const loggableUse = usesRelationships.find((r: any) =>
        r.targetId === loggableTrait?.id
      );

      expect(timestampableUse).toBeDefined();
      expect(loggableUse).toBeDefined();

      expect(timestampableUse?.metadata?.targetFqn).toBe('App\\Traits\\Timestampable');
      expect(loggableUse?.metadata?.targetFqn).toBe('App\\Traits\\Loggable');
      expect(timestampableUse?.metadata?.isResolved).toBe(true);
      expect(loggableUse?.metadata?.isResolved).toBe(true);
    });
  });

  describe('Multi-namespace File Resolution', () => {
    it('should handle multiple namespaces in single file', async () => {
      const filePath = join(testDir, 'multi-namespace.php');
      const content = `<?php
namespace App\\Models {
    class User {
        public function getId() {}
    }
}

namespace App\\Services {
    use App\\Models\\User;

    class UserService {
        public function getUser(): User {
            return new User();
        }
    }
}
`;

      writeFileSync(filePath, content);

      const components = await parser.detectComponents(content, filePath);

      // Find both classes
      const userClass = components.find((c: any) =>
        c.type === ComponentType.CLASS && c.name === 'User'
      );
      const userServiceClass = components.find((c: any) =>
        c.type === ComponentType.CLASS && c.name === 'UserService'
      );

      expect(userClass).toBeDefined();
      expect(userServiceClass).toBeDefined();

      expect(userClass?.metadata?.fqn).toBe('App\\Models\\User');
      expect(userClass?.metadata?.namespace).toBe('App\\Models');

      expect(userServiceClass?.metadata?.fqn).toBe('App\\Services\\UserService');
      expect(userServiceClass?.metadata?.namespace).toBe('App\\Services');

      // Both should have unique component IDs based on FQN
      expect(userClass?.id).not.toBe(userServiceClass?.id);
      expect(userClass?.id).toContain('App\\Models\\User');
      expect(userServiceClass?.id).toContain('App\\Services\\UserService');
    });
  });

  describe('Unresolved References', () => {
    it('should create unresolved relationships when targets are not found', async () => {
      const filePath = join(testDir, 'unresolved.php');
      const content = `<?php
namespace App;

use External\\Library\\UnknownClass;

class MyClass extends UnknownClass implements MissingInterface {
    use MissingTrait;

    public function test() {}
}
`;

      writeFileSync(filePath, content);

      const components = await parser.detectComponents(content, filePath);
      const relationships = await parser.detectRelationships(components, content);

      // Find the class
      const myClass = components.find((c: any) =>
        c.type === ComponentType.CLASS && c.name === 'MyClass'
      );

      expect(myClass).toBeDefined();
      expect(myClass?.metadata?.fqn).toBe('App\\MyClass');

      // Check that unresolved relationships were created
      const extendsRelationship = relationships.find((r: any) =>
        r.type === RelationshipType.EXTENDS &&
        r.sourceId === myClass?.id
      );
      const implementsRelationship = relationships.find((r: any) =>
        r.type === RelationshipType.IMPLEMENTS &&
        r.sourceId === myClass?.id
      );
      const usesRelationship = relationships.find((r: any) =>
        r.type === RelationshipType.USES &&
        r.sourceId === myClass?.id &&
        r.metadata?.usageType === 'trait'
      );

      expect(extendsRelationship).toBeDefined();
      expect(implementsRelationship).toBeDefined();
      expect(usesRelationship).toBeDefined();

      // All should be unresolved
      expect(extendsRelationship?.metadata?.isResolved).toBe(false);
      expect(implementsRelationship?.metadata?.isResolved).toBe(false);
      expect(usesRelationship?.metadata?.isResolved).toBe(false);

      // Check target FQNs
      expect(extendsRelationship?.metadata?.targetFqn).toBe('External\\Library\\UnknownClass');
      expect(implementsRelationship?.metadata?.targetFqn).toBe('App\\MissingInterface');
      expect(usesRelationship?.metadata?.targetFqn).toBe('App\\MissingTrait');

      // Target IDs should be marked as unresolved
      expect(extendsRelationship?.targetId).toBe('UNRESOLVED:External\\Library\\UnknownClass');
      expect(implementsRelationship?.targetId).toBe('UNRESOLVED:App\\MissingInterface');
      expect(usesRelationship?.targetId).toBe('UNRESOLVED:App\\MissingTrait');
    });
  });

  describe('Function FQN Resolution', () => {
    it('should resolve function FQNs correctly', async () => {
      const filePath = join(testDir, 'functions.php');
      const content = `<?php
namespace App\\Utils;

function formatName(string $name): string {
    return ucfirst($name);
}

function calculateAge(\\DateTime $birthDate): int {
    return $birthDate->diff(new \\DateTime())->y;
}
`;

      writeFileSync(filePath, content);

      const components = await parser.detectComponents(content, filePath);

      // Find the functions
      const formatNameFunction = components.find((c: any) =>
        c.type === ComponentType.FUNCTION && c.name === 'formatName'
      );
      const calculateAgeFunction = components.find((c: any) =>
        c.type === ComponentType.FUNCTION && c.name === 'calculateAge'
      );

      expect(formatNameFunction).toBeDefined();
      expect(calculateAgeFunction).toBeDefined();

      expect(formatNameFunction?.metadata?.fqn).toBe('App\\Utils\\formatName');
      expect(calculateAgeFunction?.metadata?.fqn).toBe('App\\Utils\\calculateAge');

      // Component IDs should use FQNs
      expect(formatNameFunction?.id).toContain('App\\Utils\\formatName');
      expect(calculateAgeFunction?.id).toContain('App\\Utils\\calculateAge');
    });
  });
});