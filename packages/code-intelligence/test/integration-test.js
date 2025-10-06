#!/usr/bin/env node

import { ParserFactory } from '../dist/code-parser/ParserFactory.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = './test-files';

async function setupTestFiles() {
  // Clean and create test directory
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {}
  mkdirSync(TEST_DIR, { recursive: true });

  // Create test files for each language
  const testFiles = {
    'example.js': `
// JavaScript test file
import React from 'react';
import { useState } from 'react';

export class UserService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async getUser(id) {
    const response = await this.apiClient.get(\`/users/\${id}\`);
    return response.data;
  }
}

const Component = ({ name }) => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Hello {name}</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
};

export default Component;
`,
    'example.py': `
#!/usr/bin/env python3
"""Python test module for parser integration."""

import asyncio
from typing import List, Optional
from dataclasses import dataclass

@dataclass
class User:
    """User data class."""
    id: int
    name: str
    email: str

    def get_display_name(self) -> str:
        """Get formatted display name."""
        return f"{self.name} <{self.email}>"

class UserService:
    """Service for managing users."""

    def __init__(self, db_connection):
        self.db = db_connection
        self._cache = {}

    async def get_user(self, user_id: int) -> Optional[User]:
        """Fetch user by ID."""
        if user_id in self._cache:
            return self._cache[user_id]

        result = await self.db.fetch_one(
            "SELECT * FROM users WHERE id = ?", user_id
        )
        if result:
            user = User(**result)
            self._cache[user_id] = user
            return user
        return None

    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format."""
        return "@" in email

async def main():
    """Main entry point."""
    service = UserService(None)
    user = await service.get_user(1)
    if user:
        print(user.get_display_name())

if __name__ == "__main__":
    asyncio.run(main())
`,
    'example.php': `<?php
namespace App\\Services;

use App\\Models\\User;
use App\\Repositories\\UserRepository;

/**
 * User service class
 */
class UserService
{
    private UserRepository $repository;
    private array $cache = [];

    public function __construct(UserRepository $repository)
    {
        $this->repository = $repository;
    }

    /**
     * Get user by ID
     *
     * @param int $id
     * @return User|null
     */
    public function getUser(int $id): ?User
    {
        if (isset($this->cache[$id])) {
            return $this->cache[$id];
        }

        $user = $this->repository->find($id);
        if ($user) {
            $this->cache[$id] = $user;
        }

        return $user;
    }

    /**
     * Create a new user
     */
    public function createUser(array $data): User
    {
        $user = new User();
        $user->name = $data['name'];
        $user->email = $data['email'];

        return $this->repository->save($user);
    }

    private function validateEmail(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
}

trait CacheableTrait
{
    protected array $cache = [];

    protected function getCached(string $key)
    {
        return $this->cache[$key] ?? null;
    }

    protected function setCached(string $key, $value): void
    {
        $this->cache[$key] = $value;
    }
}
`,
    'example.java': `package com.example.services;

import com.example.models.User;
import com.example.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Optional;
import java.util.HashMap;
import java.util.Map;

/**
 * Service class for user operations
 */
@Service
public class UserService {
    private final UserRepository repository;
    private final Map<Long, User> cache = new HashMap<>();

    @Autowired
    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    /**
     * Get user by ID
     * @param id User ID
     * @return Optional containing user if found
     */
    public Optional<User> getUser(Long id) {
        if (cache.containsKey(id)) {
            return Optional.of(cache.get(id));
        }

        Optional<User> user = repository.findById(id);
        user.ifPresent(u -> cache.put(id, u));

        return user;
    }

    /**
     * Create a new user
     */
    public User createUser(String name, String email) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);

        return repository.save(user);
    }

    private boolean validateEmail(String email) {
        return email != null && email.contains("@");
    }

    // Inner class for statistics
    public static class UserStats {
        private int totalUsers;
        private int activeUsers;

        public UserStats(int total, int active) {
            this.totalUsers = total;
            this.activeUsers = active;
        }

        public double getActivePercentage() {
            return (double) activeUsers / totalUsers * 100;
        }
    }
}

interface UserOperations {
    Optional<User> getUser(Long id);
    User createUser(String name, String email);
    void deleteUser(Long id);
}
`,
    'example.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Page</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 8px;
        }
    </style>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>Welcome</h1>
            <p>This is a test page with embedded styles and scripts</p>
        </header>

        <main id="content">
            <section class="features">
                <h2>Features</h2>
                <ul id="feature-list"></ul>
            </section>
        </main>
    </div>

    <script>
        // Embedded JavaScript
        class FeatureManager {
            constructor(containerId) {
                this.container = document.getElementById(containerId);
                this.features = [];
            }

            addFeature(name, description) {
                this.features.push({ name, description });
                this.render();
            }

            render() {
                const list = this.container;
                list.innerHTML = '';

                this.features.forEach(feature => {
                    const li = document.createElement('li');
                    li.innerHTML = \`<strong>\${feature.name}</strong>: \${feature.description}\`;
                    list.appendChild(li);
                });
            }
        }

        const manager = new FeatureManager('feature-list');
        manager.addFeature('Fast', 'Lightning fast performance');
        manager.addFeature('Secure', 'Enterprise-grade security');
        manager.addFeature('Scalable', 'Scales with your needs');
    </script>

    <script src="app.js"></script>
</body>
</html>
`,
    'example.css': `/* Global styles */
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --text-color: #333;
    --bg-color: #f5f5f5;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    color: var(--text-color);
    background-color: var(--bg-color);
    line-height: 1.6;
}

/* Container styles */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header styles */
.header {
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    color: white;
    padding: 3rem 2rem;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.header h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
}

/* Feature section */
.features {
    margin-top: 3rem;
    padding: 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.features h2 {
    color: var(--primary-color);
    margin-bottom: 1.5rem;
}

.features ul {
    list-style: none;
    padding-left: 0;
}

.features li {
    padding: 1rem;
    margin-bottom: 0.5rem;
    background: var(--bg-color);
    border-radius: 4px;
    transition: transform 0.2s ease;
}

.features li:hover {
    transform: translateX(5px);
}

/* Media queries */
@media (max-width: 768px) {
    .header h1 {
        font-size: 2rem;
    }

    .container {
        padding: 0 15px;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.fade-in {
    animation: fadeIn 0.5s ease-out;
}
`
  };

  // Write test files
  for (const [filename, content] of Object.entries(testFiles)) {
    writeFileSync(join(TEST_DIR, filename), content);
  }

  return Object.keys(testFiles).map(f => join(TEST_DIR, f));
}

async function testParserIntegration() {
  console.log('🧪 Comprehensive Parser Integration Test\n');
  console.log('=' .repeat(60));

  const factory = new ParserFactory();
  const testFiles = await setupTestFiles();

  // Test 1: Verify parser selection and priority
  console.log('\n📋 Test 1: Parser Selection and Priority');
  console.log('-'.repeat(40));

  for (const filePath of testFiles) {
    const detection = factory.detectLanguage(filePath);
    if (detection) {
      console.log(`\n${filePath}:`);
      console.log(`  Language: ${detection.language}`);
      console.log(`  Parser: ${detection.parser.constructor.name}`);
      console.log(`  Detection: ${detection.detectionMethod}`);
      console.log(`  Confidence: ${detection.confidence}`);

      // Check if Tree-sitter parser is being used
      const isTreeSitter = detection.parser.constructor.name.startsWith('TreeSitter');
      console.log(`  Tree-sitter: ${isTreeSitter ? '✅ Yes' : '❌ No (using legacy)'}`);
    }
  }

  // Test 2: Parse with parseDocument (full segmentation flow)
  console.log('\n\n📋 Test 2: Full Document Parsing with Segmentation');
  console.log('-'.repeat(40));

  for (const filePath of testFiles) {
    console.log(`\nParsing ${filePath}:`);

    try {
      const result = await factory.parseDocument(filePath, undefined, {
        enableSegmentation: true,
        enableInitialLinking: true,
        enableAggregation: true
      });

      console.log(`  ✅ Parsing successful`);
      console.log(`  Components: ${result.components.length}`);
      console.log(`  Relationships: ${result.relationships.length}`);
      console.log(`  Parsing level: ${result.metadata.parsingLevel}`);
      console.log(`  Backend: ${result.metadata.backend}`);
      console.log(`  Blocks: ${result.segmentation.blocks.length}`);
      console.log(`  Segmentation backend: ${result.segmentation.metadata.backend}`);

      // Show component types found
      const componentTypes = [...new Set(result.components.map(c => c.type))];
      console.log(`  Component types: ${componentTypes.join(', ')}`);

      // Show first few components
      if (result.components.length > 0) {
        console.log(`  Sample components:`);
        result.components.slice(0, 3).forEach(comp => {
          console.log(`    - ${comp.type}: ${comp.name} (L${comp.location.startLine}-${comp.location.endLine})`);
        });
      }

      // Check for parsing metadata
      if (result.components.length > 0 && result.components[0].metadata) {
        const meta = result.components[0].metadata;
        if (meta.parsingLevel) {
          console.log(`  Component parsing level: ${meta.parsingLevel}`);
        }
        if (meta.backend) {
          console.log(`  Component backend: ${meta.backend}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  // Test 3: Multi-language parsing (HTML with embedded JS/CSS)
  console.log('\n\n📋 Test 3: Multi-language Parsing (HTML with embedded content)');
  console.log('-'.repeat(40));

  const htmlFile = join(TEST_DIR, 'example.html');
  console.log(`\nParsing ${htmlFile} with embedded content:`);

  try {
    const result = await factory.parseDocument(htmlFile, undefined, {
      enableSegmentation: true
    });

    // Check for different language blocks
    const languages = [...new Set(result.segmentation.blocks.map(b => b.language))];
    console.log(`  Languages detected: ${languages.join(', ')}`);

    // Check for embedded script/style components
    const scriptComponents = result.components.filter(c =>
      c.metadata?.tagName === 'script' || c.type === 'MODULE'
    );
    const styleComponents = result.components.filter(c =>
      c.metadata?.tagName === 'style' || c.type === 'ANNOTATION'
    );

    console.log(`  Script blocks: ${scriptComponents.length}`);
    console.log(`  Style blocks: ${styleComponents.length}`);

    // Check if delegation worked (JS components within HTML)
    const jsComponents = result.components.filter(c =>
      c.language === 'javascript' || c.name === 'FeatureManager'
    );
    console.log(`  JavaScript components found: ${jsComponents.length}`);

    if (jsComponents.length > 0) {
      console.log(`  ✅ Tree-sitter delegation working (found embedded JS)`);
    } else {
      console.log(`  ⚠️  No embedded JS components found (delegation may not be working)`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  // Test 4: Verify segmentation pipeline
  console.log('\n\n📋 Test 4: Segmentation Pipeline');
  console.log('-'.repeat(40));

  const BlockScanner = (await import('../dist/code-parser/services/BlockScanner.js')).BlockScanner;
  const scanner = BlockScanner.getInstance();

  // Test segmentation on each file
  for (const filePath of testFiles.slice(0, 3)) { // Test first 3 files
    console.log(`\nScanning ${filePath}:`);
    try {
      const result = await scanner.scanFile(filePath);
      console.log(`  ✅ Segmentation successful`);
      console.log(`  Backend: ${result.metadata.backend}`);
      console.log(`  Blocks: ${result.blocks.length}`);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  // Test 5: Performance comparison
  console.log('\n\n📋 Test 5: Performance Comparison');
  console.log('-'.repeat(40));

  for (const filePath of testFiles.slice(0, 3)) {
    console.log(`\n${filePath}:`);

    // Time Tree-sitter parsing
    const start1 = Date.now();
    await factory.parseFile(filePath);
    const treeSitterTime = Date.now() - start1;

    // Time full document parsing with segmentation
    const start2 = Date.now();
    await factory.parseDocument(filePath);
    const fullParseTime = Date.now() - start2;

    console.log(`  Direct parse: ${treeSitterTime}ms`);
    console.log(`  Full document parse: ${fullParseTime}ms`);
    console.log(`  Overhead: ${fullParseTime - treeSitterTime}ms`);
  }

  // Clean up
  console.log('\n\n🧹 Cleaning up test files...');
  rmSync(TEST_DIR, { recursive: true, force: true });

  console.log('\n✅ Integration tests complete!');
}

testParserIntegration().catch(console.error);
