# Initialize Project Knowledge Base

You are tasked with populating a newly created Project Knowledge Base by analyzing the codebase and extracting relevant information.

## Your Goal

Fill out the KB structure with accurate, concise information about this project based on what you discover in the codebase.

## KB Structure

The KB has been created with the following sections. For each section, update the content with specific information about THIS project:

### 1. Architecture
- **System Overview**: Describe the overall architecture (monorepo? microservices? client-server?)
- **Component Architecture**: List the main components/modules and their responsibilities
- **Design Patterns**: Identify key patterns used (repository pattern, singleton, factory, etc.)

### 2. Development Standards
- **Languages & Frameworks**: What languages and frameworks are used? Check package.json, requirements.txt, go.mod, etc.
- **Code Style**: Are there linting rules? Prettier config? TypeScript strict mode?
- **Testing Standards**: What test frameworks are used? Where are tests located?

### 3. API Documentation
- **Endpoints**: List API routes (scan route files)
- **Authentication**: How does auth work? JWT? Session? API keys?
- **WebSocket Events**: If applicable, document socket.io or WS events

### 4. Database Schema
- **Tables/Entities**: List database entities (check TypeORM entities, Prisma schema, SQL files)
- **Key Relationships**: How are entities related?
- **Migrations**: Where are migrations stored?

### 5. Development Environment
- **Build Commands**: Extract from package.json scripts or Makefile
- **Dev Server**: What port? How to run dev mode?
- **Environment Variables**: Check .env.example or config files
- **Dependencies**: Key dependencies and their purpose

### 6. Testing Strategy
- **Test Types**: Unit, integration, e2e?
- **Test Commands**: How to run tests?
- **Coverage**: Is there coverage reporting?

### 7. Deployment
- **Infrastructure**: Docker? Kubernetes? Serverless?
- **CI/CD**: GitHub Actions? Jenkins? What's in .github/workflows?
- **Environments**: Dev, staging, prod?

### 8. Project History
- **Recent Changes**: Check recent commits
- **Version**: Current version from package.json or similar

## How to Populate

For each section:
1. **Scan relevant files** (package.json, tsconfig.json, route files, entity files, etc.)
2. **Extract actual values** (don't make assumptions)
3. **Update the KB node content** with the discovered information
4. **Be concise** - bullet points and short paragraphs

## Important Notes

- Only include information you can **verify** from the codebase
- If something doesn't exist (e.g., no WebSocket), note "Not applicable"
- Focus on **current state**, not aspirations
- Update mermaid diagrams to reflect **actual** architecture
- Leave placeholders if you need the user to fill in sensitive info (API keys, production URLs, etc.)

## Output Format

For each KB section, provide:
```json
{
  "node_id": "note_xxx",
  "updates": {
    "content": "Updated markdown content here...",
    "metadata": {
      "populated": true,
      "last_scan": "2025-10-13",
      "confidence": "high|medium|low"
    }
  }
}
```

Start by scanning the project structure and then systematically populate each section.
