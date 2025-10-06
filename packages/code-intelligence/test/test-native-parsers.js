#!/usr/bin/env node

import { TreeSitterPythonParser } from '../dist/code-parser/parsers/tree-sitter/TreeSitterPythonParser.js';
import { TreeSitterPhpParser } from '../dist/code-parser/parsers/tree-sitter/TreeSitterPhpParser.js';
import { TreeSitterJavaParser } from '../dist/code-parser/parsers/tree-sitter/TreeSitterJavaParser.js';

async function testNativeParsers() {
  console.log('🧪 Testing Native Tree-sitter Parsers Directly\n');
  console.log('=' .repeat(60));

  // Test Python Parser
  console.log('\n📋 Python Parser Test');
  console.log('-'.repeat(40));

  const pythonParser = new TreeSitterPythonParser();
  const pythonCode = `
class Calculator:
    """A simple calculator class."""

    def __init__(self):
        self.result = 0

    def add(self, a: float, b: float) -> float:
        """Add two numbers."""
        return a + b

    @staticmethod
    def multiply(a: float, b: float) -> float:
        """Multiply two numbers."""
        return a * b
`;

  try {
    const pythonResult = await pythonParser.parseContent(pythonCode, 'test.py');
    console.log(`✅ Python parsing successful`);
    console.log(`  Components: ${pythonResult.components.length}`);
    console.log(`  Relationships: ${pythonResult.relationships.length}`);

    pythonResult.components.forEach(comp => {
      console.log(`  - ${comp.type}: ${comp.name} (L${comp.location.startLine}-${comp.location.endLine})`);
    });

    // Test syntax validation
    const errors = await pythonParser.validateSyntax(pythonCode);
    console.log(`  Syntax errors: ${errors.length}`);
  } catch (error) {
    console.log(`❌ Python parser error: ${error.message}`);
    console.log(error.stack);
  }

  // Test PHP Parser
  console.log('\n📋 PHP Parser Test');
  console.log('-'.repeat(40));

  const phpParser = new TreeSitterPhpParser();
  const phpCode = `<?php
namespace App\\Services;

class UserService {
    private $db;

    public function __construct($database) {
        $this->db = $database;
    }

    public function getUser($id) {
        return $this->db->find($id);
    }

    private function validate($data) {
        return !empty($data);
    }
}

trait LoggerTrait {
    public function log($message) {
        echo $message;
    }
}

interface UserInterface {
    public function getUser($id);
}
`;

  try {
    const phpResult = await phpParser.parseContent(phpCode, 'test.php');
    console.log(`✅ PHP parsing successful`);
    console.log(`  Components: ${phpResult.components.length}`);
    console.log(`  Relationships: ${phpResult.relationships.length}`);

    phpResult.components.forEach(comp => {
      console.log(`  - ${comp.type}: ${comp.name} (L${comp.location.startLine}-${comp.location.endLine})`);
    });

    // Test syntax validation
    const errors = await phpParser.validateSyntax(phpCode);
    console.log(`  Syntax errors: ${errors.length}`);
  } catch (error) {
    console.log(`❌ PHP parser error: ${error.message}`);
    console.log(error.stack);
  }

  // Test Java Parser
  console.log('\n📋 Java Parser Test');
  console.log('-'.repeat(40));

  const javaParser = new TreeSitterJavaParser();
  const javaCode = `
package com.example;

import java.util.List;
import java.util.ArrayList;

public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    public User getUser(Long id) {
        return repository.findById(id);
    }

    private boolean validateUser(User user) {
        return user != null && user.getName() != null;
    }
}

interface UserRepository {
    User findById(Long id);
    List<User> findAll();
}
`;

  try {
    const javaResult = await javaParser.parseContent(javaCode, 'test.java');
    console.log(`✅ Java parsing successful`);
    console.log(`  Components: ${javaResult.components.length}`);
    console.log(`  Relationships: ${javaResult.relationships.length}`);

    javaResult.components.forEach(comp => {
      console.log(`  - ${comp.type}: ${comp.name} (L${comp.location.startLine}-${comp.location.endLine})`);
    });

    // Test syntax validation
    const errors = await javaParser.validateSyntax(javaCode);
    console.log(`  Syntax errors: ${errors.length}`);
  } catch (error) {
    console.log(`❌ Java parser error: ${error.message}`);
    console.log(error.stack);
  }

  console.log('\n✅ Direct parser tests complete!');
}

testNativeParsers().catch(console.error);