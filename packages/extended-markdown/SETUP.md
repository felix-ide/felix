# Setup Guide for Extended Markdown Package

## Publishing to GitHub Packages

This package is configured to publish to GitHub Packages as a private package under the `@felix` scope.

### Initial Setup

1. **Move this package to its own repository**:
   ```bash
   git clone git@github.com:aigent/extended-markdown.git
   cd extended-markdown
   ```

2. **Copy the package files**:
   - Copy all files from `packages/extended-markdown/` to the root of the new repository
   - Make sure `.github/workflows/publish.yml` is in the correct location

3. **Commit and push**:
   ```bash
   git add .
   git commit -m "Initial package setup"
   git push origin main
   ```

### Publishing a New Version

1. **Update the version** in `package.json`:
   ```json
   "version": "1.0.1"
   ```

2. **Commit the version change**:
   ```bash
   git add package.json
   git commit -m "Bump version to 1.0.1"
   git push origin main
   ```

3. **Create and push a tag**:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

The GitHub Action will automatically:
- Build the package
- Run tests (if any)
- Publish to GitHub Packages

### Installing the Package

To use this package in other projects:

1. **Create a `.npmrc` file** in your project root:
   ```
   @felix:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NPM_TOKEN}
   ```

2. **Set up authentication**:
   - Create a GitHub Personal Access Token with `read:packages` scope
   - Add it to your environment: `export NPM_TOKEN=your_token_here`

3. **Install the package**:
   ```bash
   npm install @felix/extended-markdown
   ```

### Using in CI/CD

For GitHub Actions in other repositories, add this to your workflow:

```yaml
- name: Configure npm
  run: |
    echo "@felix:registry=https://npm.pkg.github.com" >> ~/.npmrc
    echo "//npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_TOKEN }}" >> ~/.npmrc
```

### Development Workflow

1. **Local development**:
   ```bash
   npm install
   npm run dev  # Watch mode for development
   ```

2. **Building**:
   ```bash
   npm run build
   ```

3. **Testing locally**:
   ```bash
   npm link
   # In another project:
   npm link @felix/extended-markdown
   ```

### Package Structure

```
extended-markdown/
├── .github/
│   └── workflows/
│       └── publish.yml      # GitHub Action for publishing
├── src/
│   ├── core/               # Framework-agnostic core
│   │   └── parser.ts
│   ├── react/              # React components
│   │   ├── ExtendedMarkdownRenderer.tsx
│   │   └── renderers/
│   │       ├── MermaidRenderer.tsx
│   │       └── ExcalidrawRenderer.tsx
│   └── index.ts            # Main exports
├── package.json
├── tsup.config.ts          # Build configuration
├── README.md               # Usage documentation
└── SETUP.md               # This file
```
