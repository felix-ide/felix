import { KBStructureDefinition } from '../types';

export const PROJECT_KB_STRUCTURE: KBStructureDefinition = {
  name: 'Project Knowledge Base',
  description: 'Comprehensive project documentation structure',
  version: '1.0.0',
  configSchema: [
    {
      key: 'devPort',
      label: 'Development Server Port',
      type: 'number',
      placeholder: 'e.g., 3000, 8080',
      defaultValue: 3000,
      required: true
    },
    {
      key: 'devUrl',
      label: 'Development URL',
      type: 'text',
      placeholder: 'e.g., http://localhost:3000',
      required: false
    },
    {
      key: 'devCommand',
      label: 'Dev Command',
      type: 'text',
      placeholder: 'e.g., npm run dev',
      defaultValue: 'npm run dev',
      required: true
    },
    {
      key: 'buildCommand',
      label: 'Build Command',
      type: 'text',
      placeholder: 'e.g., npm run build',
      defaultValue: 'npm run build',
      required: true
    },
    {
      key: 'testCommand',
      label: 'Test Command',
      type: 'text',
      placeholder: 'e.g., npm test',
      defaultValue: 'npm test',
      required: false
    },
    {
      key: 'languages',
      label: 'Primary Languages',
      type: 'multiselect',
      options: ['TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'Rust', 'C#', 'PHP', 'Ruby'],
      required: true
    },
    {
      key: 'frameworks',
      label: 'Frameworks',
      type: 'multiselect',
      options: ['React', 'Vue', 'Angular', 'Next.js', 'Express', 'NestJS', 'Django', 'Flask', 'Spring', 'Laravel'],
      required: false
    },
    {
      key: 'orm',
      label: 'ORM / Database Library',
      type: 'select',
      options: ['None', 'Prisma', 'TypeORM', 'Sequelize', 'Drizzle', 'Mongoose', 'SQLAlchemy', 'Django ORM', 'Hibernate', 'JPA', 'Entity Framework', 'Doctrine', 'Active Record', 'GORM', 'Diesel', 'Room', 'Realm'],
      required: false
    },
    {
      key: 'packageManager',
      label: 'Package Manager',
      type: 'select',
      options: ['npm', 'yarn', 'pnpm', 'bun', 'pip', 'poetry', 'pipenv', 'maven', 'gradle', 'cargo', 'go mod', 'composer', 'gem', 'nuget'],
      required: false
    },
    {
      key: 'testingFramework',
      label: 'Testing Framework',
      type: 'multiselect',
      options: ['Jest', 'Vitest', 'Mocha', 'Jasmine', 'Cypress', 'Playwright', 'Puppeteer', 'Testing Library', 'pytest', 'unittest', 'JUnit', 'TestNG', 'Mockito', 'PHPUnit', 'RSpec', 'Minitest'],
      required: false
    },
    {
      key: 'linter',
      label: 'Linter / Formatter',
      type: 'multiselect',
      options: ['ESLint', 'Prettier', 'Biome', 'TSLint', 'Pylint', 'Black', 'Flake8', 'Ruff', 'Checkstyle', 'PMD', 'RuboCop', 'PHP CodeSniffer', 'Clippy', 'gofmt', 'golangci-lint'],
      required: false
    },
    {
      key: 'stateManagement',
      label: 'State Management',
      type: 'select',
      options: ['None', 'Redux', 'Zustand', 'Jotai', 'Recoil', 'MobX', 'XState', 'Pinia', 'Vuex', 'NgRx', 'Context API'],
      required: false
    },
    {
      key: 'buildTool',
      label: 'Build Tool',
      type: 'select',
      options: ['Vite', 'Webpack', 'Rollup', 'esbuild', 'Parcel', 'Turbopack', 'tsup', 'SWC', 'Babel'],
      required: false
    },
    {
      key: 'architecturePatterns',
      label: 'Architecture Patterns',
      type: 'multiselect',
      options: ['Client-Server', 'Microservices', 'Monolithic', 'Serverless', 'Event-Driven', 'Layered', 'MVC', 'MVVM', 'Clean Architecture', 'Hexagonal'],
      required: false
    },
    {
      key: 'fileStructure',
      label: 'File Structure Pattern',
      type: 'select',
      options: [
        'Feature-based (folders by feature)',
        'Type-based (folders by file type)',
        'Domain-driven (folders by business domain)',
        'Flat (minimal nesting)',
        'Package-based (monorepo with packages)',
        'Custom'
      ],
      required: false
    },
    {
      key: 'namingConvention',
      label: 'Primary Naming Convention',
      type: 'select',
      options: ['camelCase', 'PascalCase', 'snake_case', 'kebab-case', 'Mixed (varies by type)'],
      required: false
    },
    {
      key: 'autoStartDev',
      label: 'Can AI auto-start dev server?',
      type: 'boolean',
      defaultValue: false,
      required: true
    },
    {
      key: 'dbNamingConvention',
      label: 'Database Naming Convention',
      type: 'select',
      options: ['snake_case', 'camelCase', 'PascalCase', 'kebab-case'],
      defaultValue: 'snake_case',
      required: true
    },
    {
      key: 'codeNamingConvention',
      label: 'Code Naming Convention',
      type: 'select',
      options: ['camelCase', 'PascalCase', 'snake_case'],
      defaultValue: 'camelCase',
      required: true
    }
  ],
  root: {
    title: 'Project Knowledge Base',
    description: 'Root node for project documentation',
    contentTemplate: `# Project Knowledge Base

Welcome to the project documentation. This knowledge base contains all essential information about the project architecture, development standards, and operational procedures.

## Quick Navigation

- **Project Setup** - Essential project configuration and requirements
- **Architecture** - System design and technical decisions
- **Development Standards** - Coding guidelines and best practices
- **API Documentation** - Service interfaces and contracts
- **Database Schema** - Data models and relationships
- **Testing Strategy** - Test plans and procedures
- **Deployment & Operations** - Infrastructure and deployment guides
- **Troubleshooting** - Common issues and solutions
- **Project History** - Decisions and evolution
`,
    metadata: {
      icon: 'book',
      color: 'blue'
    },
    children: [
      {
        title: 'Project Setup',
        description: 'Essential project information and configuration',
        contentTemplate: `# Project Setup

This section contains fundamental information about the project that anyone (human or AI) should know before working on the codebase.

## Quick Reference

- **Development Server Port:** [Fill in port number]
- **Dev Command:** \`npm run dev\` (or specify correct command)
- **Build Command:** \`npm run build\` (or specify correct command)
- **Test Command:** \`npm test\` (or specify correct command)
- **Primary Language(s):** [e.g., TypeScript, Python, Java]
- **Framework(s):** [e.g., React, Next.js, Express, Django]

## Environment Setup

Document required environment variables, credentials, and local setup steps here.

## Important Constraints

Document any important constraints or requirements:
- Don't run dev server automatically (if applicable)
- Required Node version
- Required dependencies
- etc.
`,
        metadata: { icon: 'shield', color: 'indigo' },
        rules: [
          {
            name: 'Project Setup & Environment',
            description: 'Essential project configuration, commands, and tech stack',
            template_rule_key: 'project-setup.environment',
            guidance_template: `# Project Setup & Environment

**Server Configuration:**
- Development server runs on port {{devPort}}{{#if devUrl}} at {{devUrl}}{{/if}}
- {{#if autoStartDev}}You MAY automatically start the dev server when needed{{else}}DO NOT automatically start the dev server unless explicitly requested{{/if}}

**Commands:**
- Dev: \`{{devCommand}}\`
- Build: \`{{buildCommand}}\`{{#if testCommand}}
- Test: \`{{testCommand}}\`{{/if}}

**Technology Stack:**
- Languages: {{languages}}{{#if frameworks}}
- Frameworks: {{frameworks}}{{/if}}{{#if orm}}
- ORM/Database: {{orm}}{{/if}}{{#if packageManager}}
- Package Manager: {{packageManager}}{{/if}}{{#if buildTool}}
- Build Tool: {{buildTool}}{{/if}}{{#if testingFramework}}
- Testing: {{testingFramework}}{{/if}}{{#if linter}}
- Linting: {{linter}}{{/if}}{{#if stateManagement}}
- State Management: {{stateManagement}}{{/if}}`,
            guidance_text: `# Project Setup & Environment

**Server Configuration:**
- Development server runs on port [not configured]
- DO NOT automatically start the dev server unless explicitly requested

**Commands:**
- Dev: [not configured]
- Build: [not configured]

**Technology Stack:**
- Languages: [not configured]`,
            rule_type: 'constraint',
            priority: 9
          },
          {
            name: 'Development Standards & Conventions',
            description: 'Naming conventions, code quality, and testing requirements',
            template_rule_key: 'project-setup.standards',
            guidance_template: `# Development Standards & Conventions

**Naming Conventions:**{{#if dbNamingConvention}}
- Database (tables, columns, fields): {{dbNamingConvention}}{{/if}}{{#if codeNamingConvention}}
- Code (variables, functions, classes): {{codeNamingConvention}}{{/if}}{{#if namingConvention}}{{^dbNamingConvention}}{{^codeNamingConvention}}
- Primary convention: {{namingConvention}}{{/codeNamingConvention}}{{/dbNamingConvention}}{{/if}}

**Code Quality:**
- Follow consistent patterns and idioms for the tech stack
- Write readable, maintainable code with clear variable/function names
- Use type safety where available (TypeScript, type hints, etc.)
- Handle errors appropriately (try/catch, error boundaries, validation)

**Testing Requirements:**
- Write tests for new features and bug fixes
- Follow project testing framework conventions{{#if testingFramework}} ({{testingFramework}}){{/if}}
- Maintain or improve test coverage`,
            guidance_text: `# Development Standards & Conventions

**Naming Conventions:**
- Use consistent naming conventions appropriate to the language

**Code Quality:**
- Follow consistent patterns and idioms for the tech stack
- Write readable, maintainable code with clear variable/function names
- Use type safety where available
- Handle errors appropriately

**Testing Requirements:**
- Write tests for new features and bug fixes
- Follow project testing framework conventions`,
            rule_type: 'pattern',
            priority: 8
          },
          {
            name: 'Architecture & Data',
            description: 'System architecture, file structure, and database configuration',
            template_rule_key: 'project-setup.architecture',
            guidance_template: `# Architecture & Data

**Architecture:**{{#if architecturePatterns}}
- Pattern: {{architecturePatterns}}{{/if}}{{#if fileStructure}}
- File Structure: {{fileStructure}}{{/if}}
- Follow established patterns and conventions in existing codebase
- Maintain separation of concerns

**Database:**{{#if databases}}
{{#each databases}}
- **{{this.role}}**: {{this.type}}{{#if this.host}} at {{this.host}}{{#if this.port}}:{{this.port}}{{/if}}{{/if}}{{#if this.name}} (DB: {{this.name}}){{/if}}{{#if this.username}} - User: {{this.username}}{{/if}}
{{/each}}{{else}}
- No databases configured yet{{/if}}{{#if orm}}
- ORM: {{orm}}{{/if}}{{#if dbNamingConvention}}
- Database naming: {{dbNamingConvention}}{{/if}}`,
            guidance_text: `# Architecture & Data

**Architecture:**
- Follow established patterns and conventions in existing codebase
- Maintain separation of concerns

**Database:**
- No databases configured yet`,
            rule_type: 'pattern',
            priority: 8
          }
        ]
      },
      {
        title: 'Architecture',
        description: 'System architecture and design decisions',
        contentTemplate: `# Architecture

## System Overview
Describe the high-level system architecture here.

## Key Components
List and describe major system components.

## Design Decisions
Document important architectural decisions and trade-offs.
`,
        metadata: { icon: 'layers', color: 'purple' },
        children: [
          {
            title: 'System Overview',
            description: 'High-level system architecture',
            contentTemplate: `# System Overview

## Architecture Diagram
\`\`\`mermaid
flowchart TD
    Client[Client Application]
    API[API Server]
    DB[(Database)]
    Cache[(Cache)]

    Client --> API
    API --> DB
    API --> Cache
\`\`\`

## Core Technologies
Document your core technologies and frameworks here.
`,
          },
          {
            title: 'Component Architecture',
            description: 'Detailed component descriptions',
            contentTemplate: '# Component Architecture\n\n## Frontend Components\n\n## Backend Services\n\n## Data Layer\n',
          },
          {
            title: 'Design Patterns',
            description: 'Patterns and practices used',
            contentTemplate: '# Design Patterns\n\n## Repository Pattern\n\n## Service Layer\n\n## Event-Driven Architecture\n',
          }
        ]
      },
      {
        title: 'Development Standards',
        description: 'Coding standards and best practices',
        contentTemplate: `# Development Standards

## Code Style Guide
Document your coding conventions and style guidelines here.

## Pull Request Process
1. Create feature branch
2. Write tests
3. Update documentation
4. Request review

## Code Review Checklist
- [ ] Tests passing
- [ ] Documentation updated
- [ ] No console errors
- [ ] Performance considered
`,
        metadata: { icon: 'check-circle', color: 'green' },
        children: [
          {
            title: 'Coding Guidelines',
            description: 'Language-specific coding standards',
            contentTemplate: '# Coding Guidelines\n\n## Naming Conventions\n\n## Code Organization\n\n## Common Patterns\n',
          },
          {
            title: 'Testing Standards',
            description: 'Testing requirements and practices',
            contentTemplate: '# Testing Standards\n\n## Unit Testing\n\n## Integration Testing\n\n## E2E Testing\n',
          }
        ]
      },
      {
        title: 'API Documentation',
        description: 'Service interfaces and contracts',
        contentTemplate: `# API Documentation

## REST Endpoints
Document your API endpoints here.

## Authentication
Describe authentication mechanisms.

## Error Handling
Standard error response formats.
`,
        metadata: { icon: 'api', color: 'orange' },
        children: [
          {
            title: 'Authentication',
            description: 'Auth endpoints and flow',
            contentTemplate: '# Authentication\n\n## Login Flow\n\n## Token Management\n\n## Permissions\n',
          },
          {
            title: 'Core Endpoints',
            description: 'Main API endpoints',
            contentTemplate: '# Core Endpoints\n\n## User Management\n\n## Data Operations\n\n## Admin Functions\n',
          },
          {
            title: 'WebSocket Events',
            description: 'Real-time communication',
            contentTemplate: '# WebSocket Events\n\n## Connection Management\n\n## Event Types\n\n## Error Handling\n',
          }
        ]
      },
      {
        title: 'Database Schema',
        description: 'Data models and relationships',
        contentTemplate: `# Database Schema

## Full System ERD
\`\`\`mermaid
erDiagram
    User {
        string id PK
        string email
        string name
        datetime created_at
    }

    Project {
        string id PK
        string name
        string user_id FK
    }

    User ||--o{ Project : owns
\`\`\`

Document your complete database schema with all entities and relationships.

## Schema Overview
- Total tables:
- Key relationships:
- Storage engine:
`,
        metadata: { icon: 'database', color: 'yellow' },
        children: [
          {
            title: 'User Management Subsystem',
            description: 'ERD for user management tables',
            contentTemplate: `# User Management Subsystem

## Subsystem ERD
\`\`\`mermaid
erDiagram
    User {
        string id PK
        string email
        string name
    }
\`\`\`

Document detailed user management schema here.
`,
          },
          {
            title: 'Core Data Subsystem',
            description: 'ERD for core application data',
            contentTemplate: `# Core Data Subsystem

## Subsystem ERD
\`\`\`mermaid
erDiagram
    Project {
        string id PK
        string name
    }
\`\`\`

Document core data tables and relationships.
`,
          },
          {
            title: 'Schema Migrations',
            description: 'Migration history and procedures',
            contentTemplate: '# Schema Migrations\n\n## Recent Migrations\n\n## Rollback Procedures\n\n## Migration Best Practices\n',
          }
        ]
      },
      {
        title: 'Testing Strategy',
        description: 'Test plans and procedures',
        contentTemplate: `# Testing Strategy

## Test Coverage Goals
- Unit Tests: 80%
- Integration Tests: Key flows
- E2E Tests: Critical paths

## Testing Tools
Document your testing tools and frameworks here.

## CI/CD Pipeline
Describe automated testing in CI/CD.
`,
        metadata: { icon: 'beaker', color: 'cyan' },
        children: [
          {
            title: 'Unit Test Patterns',
            description: 'Unit testing approaches',
            contentTemplate: '# Unit Test Patterns\n\n## Component Testing\n\n## Service Testing\n\n## Utility Testing\n',
          },
          {
            title: 'Integration Tests',
            description: 'Integration test scenarios',
            contentTemplate: '# Integration Tests\n\n## API Tests\n\n## Database Tests\n\n## External Service Mocks\n',
          },
          {
            title: 'E2E Test Scenarios',
            description: 'End-to-end test cases',
            contentTemplate: '# E2E Test Scenarios\n\n## User Flows\n\n## Admin Flows\n\n## Error Scenarios\n',
          }
        ]
      },
      {
        title: 'Deployment & Operations',
        description: 'Infrastructure and deployment guides',
        contentTemplate: `# Deployment & Operations

## Infrastructure Overview
Describe your infrastructure setup.

## Deployment Process
Step-by-step deployment guide.

## Monitoring & Alerts
System monitoring and alerting setup.
`,
        metadata: { icon: 'server', color: 'red' },
        children: [
          {
            title: 'Infrastructure',
            description: 'Infrastructure components',
            contentTemplate: '# Infrastructure\n\n## Cloud Resources\n\n## Network Architecture\n\n## Security Groups\n',
          },
          {
            title: 'CI/CD Pipeline',
            description: 'Continuous deployment setup',
            contentTemplate: '# CI/CD Pipeline\n\n## Build Process\n\n## Test Stage\n\n## Deploy Stage\n',
          },
          {
            title: 'Monitoring',
            description: 'System monitoring and alerts',
            contentTemplate: '# Monitoring\n\n## Metrics\n\n## Logging\n\n## Alerting Rules\n',
          }
        ]
      },
      {
        title: 'Troubleshooting',
        description: 'Common issues and solutions',
        contentTemplate: `# Troubleshooting Guide

## Common Issues
Document frequently encountered problems.

## Debug Procedures
Step-by-step debugging guides.

## Support Contacts
Who to contact for different issues.
`,
        metadata: { icon: 'bug', color: 'pink' },
        children: [
          {
            title: 'Common Errors',
            description: 'Frequently seen errors',
            contentTemplate: '# Common Errors\n\n## Build Errors\n\n## Runtime Errors\n\n## Database Errors\n',
          },
          {
            title: 'Performance Issues',
            description: 'Performance troubleshooting',
            contentTemplate: '# Performance Issues\n\n## Slow Queries\n\n## Memory Leaks\n\n## API Bottlenecks\n',
          },
          {
            title: 'Recovery Procedures',
            description: 'Disaster recovery steps',
            contentTemplate: '# Recovery Procedures\n\n## Database Recovery\n\n## Service Recovery\n\n## Data Restoration\n',
          }
        ]
      },
      {
        title: 'Project History',
        description: 'Project decisions and evolution',
        contentTemplate: `# Project History

## Major Milestones
Track significant project events.

## Architecture Decisions
Document ADRs (Architecture Decision Records).

## Lessons Learned
Retrospectives and improvements.
`,
        metadata: { icon: 'clock', color: 'gray' },
        children: [
          {
            title: 'Release Notes',
            description: 'Version history and changes',
            contentTemplate: '# Release Notes\n\n## Latest Release\n\n## Previous Releases\n\n## Upcoming Features\n',
          },
          {
            title: 'ADRs',
            description: 'Architecture Decision Records',
            contentTemplate: '# Architecture Decision Records\n\n## ADR Template\n\n## Recent Decisions\n',
          },
          {
            title: 'Retrospectives',
            description: 'Team retrospectives and learnings',
            contentTemplate: '# Retrospectives\n\n## Recent Retrospectives\n\n## Action Items\n\n## Improvements Made\n',
          }
        ]
      }
    ]
  }
};