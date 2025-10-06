# Felix UI

A modern React-based experience for navigating projects inside Felix—the interface layer built to visualize everything the Felix backend indexes and understands.

## Features

- **Project Selection Gate**: Automatic MCP server connection and project setup
- **VS Code-style Navigation**: Icon-based sidebar navigation between sections
- **Section-based Architecture**: Each section owns its full layout space
- **Real-time Collaboration**: Live indicators for AI activity and changes
- **Document Editor**: Multi-tab support with CodeMirror and Mermaid rendering
- **Notes & Tasks**: Hierarchical task management with code linking
- **Smart Rules**: Context-aware coding rules beyond Cursor
- **WebGL Visualization**: Force-directed graphs for large codebases

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Start the Felix MCP server** (in another terminal):
   ```bash
   cd ../server
   npm run serve
   ```

4. **Open your browser** to `http://localhost:3000`

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v3 + Radix UI primitives
- **State Management**: Zustand (simple, performant)
- **3D Graphics**: Three.js + React Three Fiber (coming in Phase 3)
- **Editor**: CodeMirror 6 for rich text editing
- **Icons**: Lucide React
- **Build Tool**: Vite for fast development

## Architecture

### Component Structure
```
src/
├── components/
│   ├── layout/           # App shell and navigation
│   ├── sections/         # Main content sections
│   ├── ui/              # Reusable UI components
│   └── shared/          # Shared components
├── hooks/               # Custom React hooks
├── services/            # External service integrations
├── stores/              # Zustand state stores
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── styles/              # Global styles and themes
```

### Key Components

- **App.tsx**: Main application with project selection gate
- **ProjectSetup.tsx**: Auto-start CLI serve, MCP connection
- **IconNavBar.tsx**: VS Code style navigation sidebar
- **SectionRouter.tsx**: Routes between main content sections
- **mcpClient.ts**: MCP communication service
- **appStore.ts**: Global application state
- **projectStore.ts**: Project-specific state

## Development Phases

### ✅ Phase 1: Backend Foundation (Week 1-2)
- Multi-database architecture with SQLite ATTACH
- MCP server with enhanced endpoints
- Notes, Tasks, Rules models and services

### 🚧 Phase 2: UI Foundation & Project Setup (Week 3-4)
- ✅ **Week 3**: React architecture, project flow, basic stores
- 🔄 **Week 4**: Core sections, document editor, CRUD interfaces

### 📋 Phase 3: Explore Section & WebGL Graphs (Week 5-6)
- Explore sub-navigation and views
- WebGL visualization with Three.js

### 📋 Phase 4: Advanced Features & Real-time (Week 7-8)
- Multi-layer linking system
- Real-time collaboration with WebSockets

## Project Setup Flow

1. **App Launch**: Automatically detects and connects to MCP server
2. **MCP Connection**: Establishes connection on port 3001
3. **Project Selection**: User chooses project directory
4. **Project Setup**: Uses MCP to set active project
5. **Auto-indexing**: Indexes codebase if needed
6. **Main Interface**: Navigation becomes available

## Section Overview

- **🔍 Explore**: Search, components, relationships, file view
- **📝 Notes**: Knowledge capture with multi-layer linking
- **✅ Tasks**: Hierarchical task management with dependencies
- **⚙️ Rules**: Context-aware coding rules and automation
- **📖 Documents**: Multi-tab editor with live preview
- **📈 Activity**: Real-time collaboration feed
- **📊 Server Log**: Development and debugging info

## MCP Integration

The Felix UI communicates with the Felix backend via the Model Context Protocol (MCP):

- **Project Management**: Set/get current project, indexing control
- **Search & Exploration**: Semantic search across codebase
- **Notes Management**: CRUD operations with entity linking
- **Task Management**: Hierarchical tasks with dependencies
- **Rules System**: Intelligent coding rules and patterns
- **Context Generation**: Enhanced context with metadata

## Development Commands

```bash
# Development
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

## Contributing

This UI is part of the Felix platform. See the main project README for contribution guidelines.

## License

Unlicensed — license to be determined.
