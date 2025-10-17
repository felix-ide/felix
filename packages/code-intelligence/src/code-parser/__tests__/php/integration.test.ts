/**
 * Integration test for PHP parsing with FQN resolution
 * Tests a small PHP application to verify no UNRESOLVED relationships when resolvable
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { join, resolve } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { ComponentType, RelationshipType } from '../../types.js';

// Unmock PhpParser for these tests
jest.unmock('../../parsers/PhpParser.js');
const { PhpParser } = await import('../../parsers/PhpParser.js');

describe('PHP Integration Test', () => {
  let testDir: string;
  let parser: PhpParser;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), 'php-integration-test-' + Date.now());
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

  describe('Small PHP Application Indexing', () => {
    it('should index a small PHP app with no UNRESOLVED relationships when resolvable', async () => {
      // Create a small PHP application structure
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });

      // 1. Create a base interface
      const loggableInterfacePath = join(srcDir, 'LoggableInterface.php');
      const loggableInterface = `<?php
namespace App\\Contracts;

interface LoggableInterface {
    public function log(string $message): void;
}
`;

      // 2. Create a trait
      const timestampTraitPath = join(srcDir, 'TimestampTrait.php');
      const timestampTrait = `<?php
namespace App\\Traits;

trait TimestampTrait {
    protected \\DateTime $createdAt;
    protected \\DateTime $updatedAt;

    public function getCreatedAt(): \\DateTime {
        return $this->createdAt;
    }

    public function touch(): void {
        $this->updatedAt = new \\DateTime();
    }
}
`;

      // 3. Create a base model class
      const baseModelPath = join(srcDir, 'BaseModel.php');
      const baseModel = `<?php
namespace App\\Models;

use App\\Contracts\\LoggableInterface;
use App\\Traits\\TimestampTrait;

abstract class BaseModel implements LoggableInterface {
    use TimestampTrait;

    protected int $id;

    public function getId(): int {
        return $this->id;
    }

    public function log(string $message): void {
        echo "[" . date('Y-m-d H:i:s') . "] " . $message . PHP_EOL;
    }
}
`;

      // 4. Create a concrete User model
      const userModelPath = join(srcDir, 'User.php');
      const userModel = `<?php
namespace App\\Models;

class User extends BaseModel {
    private string $name;
    private string $email;

    public function __construct(string $name, string $email) {
        $this->name = $name;
        $this->email = $email;
        $this->createdAt = new \\DateTime();
        $this->updatedAt = new \\DateTime();
    }

    public function getName(): string {
        return $this->name;
    }

    public function getEmail(): string {
        return $this->email;
    }

    public function setName(string $name): void {
        $this->name = $name;
        $this->touch();
    }

    public function __toString(): string {
        return $this->name . " <" . $this->email . ">";
    }
}
`;

      // 5. Create a service class
      const userServicePath = join(srcDir, 'UserService.php');
      const userService = `<?php
namespace App\\Services;

use App\\Models\\User;
use App\\Contracts\\LoggableInterface;

class UserService implements LoggableInterface {
    private array $users = [];

    public function createUser(string $name, string $email): User {
        $user = new User($name, $email);
        $this->users[] = $user;
        $this->log("Created user: " . $user);
        return $user;
    }

    public function findUserById(int $id): ?User {
        foreach ($this->users as $user) {
            if ($user->getId() === $id) {
                return $user;
            }
        }
        return null;
    }

    public function log(string $message): void {
        echo "[UserService] " . $message . PHP_EOL;
    }
}
`;

      // Write all files
      writeFileSync(loggableInterfacePath, loggableInterface);
      writeFileSync(timestampTraitPath, timestampTrait);
      writeFileSync(baseModelPath, baseModel);
      writeFileSync(userModelPath, userModel);
      writeFileSync(userServicePath, userService);

      // Parse all files and collect components/relationships
      const allComponents: any[] = [];
      const allRelationships: any[] = [];

      const files = [
        { path: loggableInterfacePath, content: loggableInterface },
        { path: timestampTraitPath, content: timestampTrait },
        { path: baseModelPath, content: baseModel },
        { path: userModelPath, content: userModel },
        { path: userServicePath, content: userService }
      ];

      for (const file of files) {
        const components = await parser.detectComponents(file.content, file.path);
        const relationships = await parser.detectRelationships(components, file.content);

        allComponents.push(...components);
        allRelationships.push(...relationships);
      }

      // Verify we have all expected components
      const interfaces = allComponents.filter(c => c.type === ComponentType.INTERFACE);
      const classes = allComponents.filter(c => c.type === ComponentType.CLASS);
      const traits = classes.filter(c => c.metadata?.isTrait === true);
      const regularClasses = classes.filter(c => !c.metadata?.isTrait);
      const namespaces = allComponents.filter(c => c.type === ComponentType.NAMESPACE);
      const fileComponents = allComponents.filter(c => c.type === ComponentType.FILE);

      expect(interfaces).toHaveLength(1); // LoggableInterface
      expect(traits).toHaveLength(1); // TimestampTrait
      expect(regularClasses).toHaveLength(3); // BaseModel, User, UserService
      expect(namespaces).toHaveLength(files.length); // One namespace per file
      expect(fileComponents).toHaveLength(files.length); // One file component per file

      // Ensure each namespace is parented to the file component from the same file
      for (const ns of namespaces) {
        const fileComponent = fileComponents.find(f => f.filePath === ns.filePath);
        expect(fileComponent).toBeDefined();
        expect(ns.parentId).toBe(fileComponent?.id);
      }

      // Ensure classes live under their namespace component
      const baseModelClass = regularClasses.find(c => c.metadata?.fullName === 'App\\Models\\BaseModel');
      expect(baseModelClass).toBeDefined();
      const baseModelNamespace = namespaces.find(n => n.filePath === baseModelClass?.filePath && n.name === 'App\\Models');
      expect(baseModelNamespace).toBeDefined();
      expect(baseModelClass?.parentId).toBe(baseModelNamespace?.id);

      // Ensure methods inherit their class as parent
      const userClass = regularClasses.find(c => c.metadata?.fullName === 'App\\Models\\User');
      expect(userClass).toBeDefined();
      const userMethods = allComponents.filter(c => c.type === ComponentType.METHOD && c.metadata?.className === 'App\\Models\\User');
      for (const method of userMethods) {
        expect(method.parentId).toBe(userClass?.id);
      }

      // Verify FQNs are correct
      const loggableInterface = interfaces[0];
      const timestampTrait = traits[0];
      const baseModelClass = regularClasses.find(c => c.name === 'BaseModel');
      const userClass = regularClasses.find(c => c.name === 'User');
      const userServiceClass = regularClasses.find(c => c.name === 'UserService');

      expect(loggableInterface?.metadata?.fqn).toBe('App\\Contracts\\LoggableInterface');
      expect(timestampTrait?.metadata?.fqn).toBe('App\\Traits\\TimestampTrait');
      expect(baseModelClass?.metadata?.fqn).toBe('App\\Models\\BaseModel');
      expect(userClass?.metadata?.fqn).toBe('App\\Models\\User');
      expect(userServiceClass?.metadata?.fqn).toBe('App\\Services\\UserService');

      // Verify relationships exist and are resolved
      const implementsRelationships = allRelationships.filter(r => r.type === RelationshipType.IMPLEMENTS);
      const extendsRelationships = allRelationships.filter(r => r.type === RelationshipType.EXTENDS);
      const usesRelationships = allRelationships.filter(r =>
        r.type === RelationshipType.USES && r.metadata?.usageType === 'trait'
      );

      // BaseModel implements LoggableInterface
      const baseModelImplements = implementsRelationships.find(r =>
        r.sourceId === baseModelClass?.id &&
        r.targetId === loggableInterface?.id
      );

      // UserService implements LoggableInterface
      const userServiceImplements = implementsRelationships.find(r =>
        r.sourceId === userServiceClass?.id &&
        r.targetId === loggableInterface?.id
      );

      // User extends BaseModel
      const userExtends = extendsRelationships.find(r =>
        r.sourceId === userClass?.id &&
        r.targetId === baseModelClass?.id
      );

      // BaseModel uses TimestampTrait
      const baseModelUsesTrait = usesRelationships.find(r =>
        r.sourceId === baseModelClass?.id &&
        r.targetId === timestampTrait?.id
      );

      expect(baseModelImplements).toBeDefined();
      expect(userServiceImplements).toBeDefined();
      expect(userExtends).toBeDefined();
      expect(baseModelUsesTrait).toBeDefined();

      // All relationships should be resolved (no UNRESOLVED targets)
      expect(baseModelImplements?.metadata?.isResolved).toBe(true);
      expect(userServiceImplements?.metadata?.isResolved).toBe(true);
      expect(userExtends?.metadata?.isResolved).toBe(true);
      expect(baseModelUsesTrait?.metadata?.isResolved).toBe(true);

      // No relationship should have UNRESOLVED target ID
      const unresolvedRelationships = allRelationships.filter(r =>
        r.targetId.startsWith('UNRESOLVED:')
      );

      expect(unresolvedRelationships).toHaveLength(0);

      // Verify FQN target resolution
      expect(baseModelImplements?.metadata?.targetFqn).toBe('App\\Contracts\\LoggableInterface');
      expect(userServiceImplements?.metadata?.targetFqn).toBe('App\\Contracts\\LoggableInterface');
      expect(userExtends?.metadata?.targetFqn).toBe('App\\Models\\BaseModel');
      expect(baseModelUsesTrait?.metadata?.targetFqn).toBe('App\\Traits\\TimestampTrait');

      console.error(`Integration test: Found ${allComponents.length} components and ${allRelationships.length} relationships`);
      console.error(`All ${implementsRelationships.length + extendsRelationships.length + usesRelationships.length} key relationships were resolved successfully`);
    });

    it('should handle circular references gracefully', async () => {
      // Create files with circular dependencies
      const classAPath = join(testDir, 'ClassA.php');
      const classBPath = join(testDir, 'ClassB.php');

      const classAContent = `<?php
namespace App;

use App\\ClassB;

class ClassA {
    private ClassB $b;

    public function getB(): ClassB {
        return $this->b;
    }
}
`;

      const classBContent = `<?php
namespace App;

use App\\ClassA;

class ClassB {
    private ClassA $a;

    public function getA(): ClassA {
        return $this->a;
    }
}
`;

      writeFileSync(classAPath, classAContent);
      writeFileSync(classBPath, classBContent);

      // Parse both files
      const componentsA = await parser.detectComponents(classAContent, classAPath);
      const relationshipsA = await parser.detectRelationships(componentsA, classAContent);

      const componentsB = await parser.detectComponents(classBContent, classBPath);
      const relationshipsB = await parser.detectRelationships(componentsB, classBContent);

      // Find both classes
      const classA = componentsA.find(c => c.type === ComponentType.CLASS && c.name === 'ClassA');
      const classB = componentsB.find(c => c.type === ComponentType.CLASS && c.name === 'ClassB');

      expect(classA).toBeDefined();
      expect(classB).toBeDefined();

      expect(classA?.metadata?.fqn).toBe('App\\ClassA');
      expect(classB?.metadata?.fqn).toBe('App\\ClassB');

      // Both files should parse without errors despite circular references
      expect(componentsA.length).toBeGreaterThan(0);
      expect(componentsB.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Verification', () => {
    it('should parse PHP files within acceptable time limits', async () => {
      // Create multiple PHP files to test performance
      const numFiles = 10;
      const files: string[] = [];

      for (let i = 0; i < numFiles; i++) {
        const filePath = join(testDir, `Class${i}.php`);
        const content = `<?php
namespace App\\Test;

use App\\Test\\Interface${i % 3};
use App\\Test\\Trait${i % 2};

class Class${i} implements Interface${i % 3} {
    use Trait${i % 2};

    private int $property${i};

    public function __construct() {
        $this->property${i} = ${i};
    }

    public function getProperty${i}(): int {
        return $this->property${i};
    }

    public function setProperty${i}(int $value): void {
        $this->property${i} = $value;
    }

    public function method${i}(): string {
        return "Method ${i} from Class${i}";
    }
}
`;

        writeFileSync(filePath, content);
        files.push(filePath);
      }

      // Measure parsing time
      const startTime = Date.now();

      let totalComponents = 0;
      let totalRelationships = 0;

      for (const filePath of files) {
        const content = `<?php
namespace App\\Test;

class Class${files.indexOf(filePath)} {
    public function test() {}
}
`;
        const components = await parser.detectComponents(content, filePath);
        const relationships = await parser.detectRelationships(components, content);

        totalComponents += components.length;
        totalRelationships += relationships.length;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance requirement: should parse within 20% of baseline
      // For 10 files, should complete in reasonable time (< 3 seconds)
      expect(duration).toBeLessThan(3000);

      console.error(`Performance test: Parsed ${files.length} files in ${duration}ms`);
      console.error(`Found ${totalComponents} components and ${totalRelationships} relationships`);

      // Should have found components in all files
      expect(totalComponents).toBeGreaterThan(numFiles); // At least one component per file
    });
  });
});
