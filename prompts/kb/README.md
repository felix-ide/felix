# Knowledge Base Prompts

This directory contains system prompts for working with the Project Knowledge Base feature.

## Available Prompts

### `initialize-project.md`
Used when first populating a KB after template creation. Guides the AI to scan the codebase and extract relevant project information to fill out the KB structure.

**Usage**: After creating a KB from template, run this prompt to have the AI populate it with actual project data.

## Future Prompts

Ideas for additional KB prompts:
- `update-api-docs.md` - Scan for new/changed API endpoints
- `update-dependencies.md` - Check for dependency updates and security issues
- `generate-onboarding.md` - Create onboarding docs from KB data
- `sync-with-code.md` - Detect drift between KB and actual code
