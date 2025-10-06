# Project Plan to Code Process

## Overview

This document outlines our systematic approach to transforming project requirements into high-quality, well-tested code. Our process creates a clear path from initial user requirements through planning, design, implementation, and testing, with well-defined phases and deliverables at each stage.

## Core Philosophy

Our development philosophy is built on these principles:

1. **Incremental Refinement**: Start with high-level concepts and progressively refine into detailed implementations
2. **Clear Interfaces First**: Define clear boundaries and contracts before implementation details
3. **Architecture Before Code**: Establish architectural patterns and relationships before writing code
4. **Test-Driven Development**: Create tests alongside or before code to validate behavior
5. **Iterative Validation**: Continuously validate design decisions against requirements
6. **Documentation Integration**: Documentation is integral to the development process, not an afterthought

## The Phased Development Process

Our development process consists of six distinct phases, each with specific goals, activities, and deliverables:

### Phase 1: Requirements Analysis and Initial Planning

**Goal**: Understand user needs and establish high-level project scope.

**Activities**:
- Analyze user requirements and goals
- Identify key features and functionality
- Establish project constraints and boundaries
- Define success criteria and metrics
- Create initial user stories or use cases

**Deliverables**:
- User requirements document
- High-level feature list
- Project scope document
- Initial success criteria
- Preliminary timeline

**Example**:
```markdown
# Code Navigation Feature Requirements

## User Needs
- Users need to understand complex code relationships
- Users need to locate specific components quickly
- Users need to visualize dependencies between components

## Key Features
- Code component browser with search and filtering
- Relationship visualization with interactive graph
- Component details viewer with source code display
- Code search with semantic understanding

## Success Criteria
- Users can find specific components in under 30 seconds
- System can visualize projects with 1000+ components
- Search returns relevant results for 90% of queries
```

### Phase 2: Architectural Design and Pattern Selection

**Goal**: Create a solid architectural foundation using established design patterns.

**Activities**:
- Identify appropriate architectural styles and patterns
- Define major components and their relationships
- Establish system boundaries and external interfaces
- Select appropriate design patterns for each component
- Create high-level data models

**Deliverables**:
- System architecture document
- Component diagram with relationships
- Design pattern selections with rationales
- Interface definitions (preliminary)
- System constraints and quality attributes

**Example**:
```markdown
# Code Navigation Architecture

## Architectural Style
- Model-View-Presenter (MVP) pattern for UI components
- Repository pattern for data access
- Observer pattern for state synchronization

## Major Components
1. **Code Data Repository**
   - Stores indexed code components and relationships
   - Provides query and filtering capabilities
   - Pattern: Repository

2. **Component Model Layer**
   - Represents code components and relationships
   - Manages component state and events
   - Pattern: Observer, Composite

3. **Visualization Layer**
   - Renders code components and relationships
   - Handles user interactions with visualizations
   - Patterns: Strategy (for different visualizations), Bridge

4. **UI Components**
   - Component browser using tree structure
   - Component details panel
   - Relationship graph
   - Patterns: MVP, Composite

## Component Relationships
- Code Repository ← Component Models (uses)
- Component Models ← Presenters (observes)
- Presenters ↔ Views (bidirectional)
- Views → UI Components (composes)
```

### Phase 3: Technical Specification and Database Schema

**Goal**: Define detailed technical requirements, technologies, libraries, and data structures.

**Activities**:
- Select specific technologies and libraries
- Design database schemas or data structures
- Define detailed APIs and interfaces
- Create technical specifications for each component
- Establish performance and security requirements
- Identify potential technical challenges

**Deliverables**:
- Technology stack specification
- Database schema design
- Detailed API specifications
- Interface contracts
- Performance requirements
- Technical risk assessment

**Example**:
```markdown
# Code Navigation Technical Specification

## Technology Stack
- **Frontend**: JavaScript/TypeScript with SVG for visualizations
- **Data Storage**: In-memory with persistence to SQLite
- **Parsing**: Use Acorn for JavaScript parsing
- **Search**: Custom inverted index implementation
- **Visualization**: D3.js for graph visualization

## Libraries and Dependencies
- **d3.js**: For relationship graph visualization
- **acorn.js**: For code parsing and AST generation
- **better-sqlite3**: For persistent storage
- **event-emitter**: For event-based communication

## Database Schema

### Components Table
```sql
CREATE TABLE components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_path TEXT,
  start_line INTEGER,
  start_column INTEGER,
  end_line INTEGER,
  end_column INTEGER,
  parent_id TEXT,
  metadata TEXT,
  source_code TEXT,
  FOREIGN KEY (parent_id) REFERENCES components(id)
);
```

### Relationships Table
```sql
CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  type TEXT NOT NULL,
  metadata TEXT,
  FOREIGN KEY (source_id) REFERENCES components(id),
  FOREIGN KEY (target_id) REFERENCES components(id)
);
```

## API Specifications

### CodeMapModel API
- `loadData(components, relationships)`: Load component data
- `getComponents()`: Get all components
- `getGraphData()`: Get data formatted for visualization
- `searchComponents(query)`: Search components by name/properties
- `setFilters(filters)`: Apply filters to components
- `focusOnComponent(id)`: Set focus to specific component

### ComponentBrowserView API
- `setComponents(components)`: Set components to display
- `selectComponent(id)`: Select a specific component
- `expandComponent(id)`: Expand a component to show children
- `collapseComponent(id)`: Collapse a component to hide children
```

### Phase 4: Test Planning and Validation

**Goal**: Create a comprehensive testing strategy and validation approach.

**Activities**:
- Define testing approach for all layers
- Create test plans for each component
- Define integration test scenarios
- Establish acceptance criteria for features
- Design test infrastructure requirements
- Define test data and fixtures needed

**Deliverables**:
- Testing strategy document
- Unit test specifications
- Integration test specifications
- End-to-end test scenarios
- Performance test plan
- Test data requirements

**Example**:
```markdown
# Code Navigation Testing Strategy

## Testing Approach
- Unit testing for models, presenters, and utilities
- Component testing for individual views
- Integration testing for presenter-view interactions
- End-to-end testing for complete user workflows

## Unit Test Specifications

### CodeMapModel Tests
- Initialize with empty data
- Load components and relationships correctly
- Apply filters correctly
- Search components with different queries
- Generate graph data with correct structure
- Focus on components and notify listeners

### ComponentBrowserView Tests
- Render component tree correctly
- Handle component selection events
- Expand and collapse tree nodes
- Apply search filters to visible components
- Show component details for selected component

## Integration Test Specifications
- Selection in component browser updates code map
- Search filters apply to both views simultaneously
- Component details update with selections in either view
- Graph layout changes affect code map but not component list

## End-to-End Test Scenarios
1. User loads project and indexes code
2. User searches for a component by name
3. User selects component from search results
4. Component details are displayed
5. Related components are highlighted in graph
6. User navigates through relationships
7. User applies filters to visualization

## Test Data
- Simple test project with ~20 components and relationships
- Complex test project with 100+ components
- Edge case project with circular dependencies
- Performance test project with 1000+ components
```

### Phase 5: Implementation Planning and Code Structure

**Goal**: Establish detailed implementation plan with file structures and class skeletons.

**Activities**:
- Create file structure and module organization
- Define class/component skeletons with methods
- Establish coding standards and conventions
- Create implementation sequence/dependency order
- Develop mock implementations for interfaces
- Set up development environment and tooling

**Deliverables**:
- File and directory structure
- Class skeletons with method signatures
- Interface implementations with mocks
- Implementation sequence plan
- Development environment configuration
- Coding standards document

**Example**:
```markdown
# Code Navigation Implementation Plan

## File Structure
```
/tools/felix/
  /implementations/
    /ui/
      /models/
        CodeMapModel.js
        ComponentModel.js
        RelationshipModel.js
        index.js
      /views/
        CodeMapView.js
        ComponentBrowserView.js
        ComponentDetailView.js
        index.js
      /presenters/
        CodeMapPresenter.js
        ComponentBrowserPresenter.js
        index.js
  /test/
    test-code-navigation-models.js
    test-code-navigation-views.js
    test-code-navigation-integration.js
    ui-test-page.html
    run-ui-tests.js
```

## Class Skeletons

### CodeMapModel
```javascript
/**
 * Model for code map visualization.
 */
class CodeMapModel extends EventEmitter {
  /**
   * Create a new CodeMapModel.
   * @param {Object} options - Model configuration
   */
  constructor(options = {}) {
    super();
    this.components = new Map();
    this.relationships = new Map();
    this.filters = {
      types: new Set(['file', 'class', 'function', 'method']),
      searchQuery: '',
      focusedComponent: null
    };
  }
  
  /**
   * Load component and relationship data.
   * @param {Object} data - Data to load
   */
  loadData(data) {
    // TODO: Implementation
  }
  
  /**
   * Get all components.
   * @returns {Array} Array of components
   */
  getComponents() {
    // TODO: Implementation
  }
  
  /**
   * Get graph data for visualization.
   * @returns {Object} Graph data with nodes and edges
   */
  getGraphData() {
    // TODO: Implementation
  }
  
  /**
   * Search components by query.
   * @param {string} query - Search query
   * @returns {Array} Matching components
   */
  searchComponents(query) {
    // TODO: Implementation
  }
  
  /**
   * Set filters for components.
   * @param {Object} filters - Filter criteria
   */
  setFilters(filters) {
    // TODO: Implementation
  }
  
  /**
   * Focus on a specific component.
   * @param {string} componentId - Component ID to focus
   */
  focusOnComponent(componentId) {
    // TODO: Implementation
  }
}
```

## Implementation Sequence
1. Implement base model classes
   - CodeMapModel skeleton with events
   - ComponentModel with basic properties
   - RelationshipModel with source/target handling
   
2. Implement view skeletons
   - CodeMapView with basic rendering
   - ComponentBrowserView with tree structure
   - ComponentDetailView with info display
   
3. Connect models and views with presenters
   - CodeMapPresenter for visualization
   - ComponentBrowserPresenter for component handling
   
4. Implement model functionality
   - Data loading and processing
   - Filtering and searching
   - Event emission for changes
   
5. Implement view functionality
   - Rendering components and relationships
   - Handling user interactions
   - Displaying details and context
   
6. Create integration tests and fine-tune interactions
```

### Phase 6: Full Implementation

**Goal**: Implement the complete solution according to the established design.

**Activities**:
- Implement core functionality according to plan
- Write unit tests alongside implementation
- Refine interfaces as needed during implementation
- Document code with inline comments
- Perform code reviews and quality checks
- Integrate components and verify interactions

**Deliverables**:
- Complete implementation code
- Unit tests with high coverage
- Updated interface documentation
- Code review results
- Integration verification

**Example**:
```javascript
/**
 * Model for code map visualization.
 * Manages component data and relationships for display.
 */
class CodeMapModel extends EventEmitter {
  /**
   * Create a new CodeMapModel.
   * @param {Object} options - Model configuration
   * @param {ComponentRegistry} options.componentRegistry - Optional registry to use
   * @param {KnowledgeGraph} options.knowledgeGraph - Optional graph to use
   */
  constructor(options = {}) {
    super();
    this.componentRegistry = options.componentRegistry || null;
    this.knowledgeGraph = options.knowledgeGraph || null;
    
    // Store components and relationships
    this.components = new Map();
    this.relationships = new Map();
    
    // Default filters
    this.filters = {
      types: new Set(['file', 'class', 'function', 'method']),
      searchQuery: '',
      selectedComponents: new Set(),
      excludedComponents: new Set(),
      focusedComponent: null,
      maxRelationshipDepth: 2
    };
    
    // Display options
    this.displayOptions = {
      showFiles: true,
      showClasses: true,
      showFunctions: true,
      showMethods: true,
      groupByNamespace: true,
      maxDepth: 3,
      layout: 'hierarchical',
      showLabels: true
    };
    
    // Layout options
    this.layoutOptions = {
      hierarchical: {
        levelSeparation: 150,
        nodeSpacing: 100,
        direction: 'UD'
      },
      forceDirected: {
        springLength: 100,
        springCoeff: 0.0008,
        gravity: -1.2
      },
      radial: {
        radius: 300,
        startAngle: 0,
        endAngle: 2 * Math.PI
      }
    };
    
    // Performance caching
    this._cachedGraph = null;
    this._lastUpdateTime = 0;
  }
  
  /**
   * Load component and relationship data.
   * @param {Object} data - The data to load
   * @param {Array} data.components - Components to load
   * @param {Array} data.relationships - Relationships to load
   * @fires dataLoaded
   */
  loadData({ components = [], relationships = [] }) {
    // Clear existing data
    this.components.clear();
    this.relationships.clear();
    
    // Load components
    for (const component of components) {
      this.components.set(component.id, component);
    }
    
    // Load relationships
    for (const relationship of relationships) {
      this.relationships.set(relationship.id, relationship);
    }
    
    // Reset cache
    this._cachedGraph = null;
    
    // Emit events
    this.emit('dataLoaded', { components, relationships });
    this.emit('componentsChanged');
  }
  
  /**
   * Get all components.
   * @returns {Array} Array of components
   */
  getComponents() {
    return Array.from(this.components.values());
  }
  
  /**
   * Get graph data for visualization.
   * @returns {Object} Graph data with nodes and edges
   */
  getGraphData() {
    // Use cached data if available and not stale
    if (this._cachedGraph) {
      return this._cachedGraph;
    }
    
    // Create nodes from components
    const nodes = Array.from(this.components.values())
      .filter(component => this._filterComponent(component))
      .map(component => ({
        id: component.id,
        label: component.name,
        group: component.type,
        type: component.type,
        title: component.description || component.name
      }));
    
    // Create edges from relationships
    const edges = Array.from(this.relationships.values())
      .filter(relationship => {
        // Filter by component visibility
        const sourceVisible = nodes.some(node => node.id === relationship.from);
        const targetVisible = nodes.some(node => node.id === relationship.to);
        return sourceVisible && targetVisible;
      })
      .map(relationship => ({
        id: relationship.id,
        from: relationship.from,
        to: relationship.to,
        arrows: 'to',
        label: relationship.type,
        title: relationship.description || relationship.type,
        type: relationship.type
      }));
    
    // Cache the result
    this._cachedGraph = { nodes, edges };
    this._lastUpdateTime = Date.now();
    
    return this._cachedGraph;
  }
  
  /**
   * Check if a component passes current filters.
   * @param {Object} component - Component to check
   * @returns {boolean} True if component passes filters
   * @private
   */
  _filterComponent(component) {
    // Type filter
    if (!this.filters.types.has(component.type)) {
      return false;
    }
    
    // Search query filter
    if (this.filters.searchQuery) {
      const query = this.filters.searchQuery.toLowerCase();
      const nameMatch = component.name.toLowerCase().includes(query);
      const descMatch = component.description && 
                        component.description.toLowerCase().includes(query);
      
      if (!nameMatch && !descMatch) {
        return false;
      }
    }
    
    // Excluded components filter
    if (this.filters.excludedComponents.has(component.id)) {
      return false;
    }
    
    // Focus filter - if focus is set, only show related components
    if (this.filters.focusedComponent && 
        this.filters.focusedComponent !== component.id) {
      // Show only if related within maxRelationshipDepth
      if (!this._isRelatedToFocus(component.id, this.filters.maxRelationshipDepth)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Check if a component is related to the focused component.
   * @param {string} componentId - Component ID to check
   * @param {number} maxDepth - Maximum relationship depth
   * @returns {boolean} True if related to focus
   * @private
   */
  _isRelatedToFocus(componentId, maxDepth) {
    // Simple implementation - in a real system, this would use a graph algorithm
    if (maxDepth <= 0) return false;
    if (componentId === this.filters.focusedComponent) return true;
    
    // Check direct relationships
    for (const relationship of this.relationships.values()) {
      if (relationship.from === this.filters.focusedComponent && 
          relationship.to === componentId) {
        return true;
      }
      
      if (relationship.to === this.filters.focusedComponent && 
          relationship.from === componentId) {
        return true;
      }
    }
    
    // For deeper relationships, we would implement a breadth-first search
    // This is simplified for the example
    
    return false;
  }
  
  /**
   * Search components by query.
   * @param {string} query - Search query
   * @returns {Array} Matching components
   */
  searchComponents(query) {
    if (!query) return [];
    
    const searchQuery = query.toLowerCase();
    return Array.from(this.components.values())
      .filter(component => {
        const nameMatch = component.name.toLowerCase().includes(searchQuery);
        const descMatch = component.description && 
                          component.description.toLowerCase().includes(searchQuery);
        return nameMatch || descMatch;
      })
      .sort((a, b) => {
        // Sort by relevance (name matches first, then description matches)
        const aNameMatch = a.name.toLowerCase().includes(searchQuery);
        const bNameMatch = b.name.toLowerCase().includes(searchQuery);
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        // If same match type, sort alphabetically
        return a.name.localeCompare(b.name);
      });
  }
  
  /**
   * Set filters for components.
   * @param {Object} filters - Filter criteria
   * @fires filtersChanged
   */
  setFilters(filters = {}) {
    // Update filters with provided values
    if (filters.types !== undefined) {
      this.filters.types = filters.types instanceof Set 
        ? filters.types 
        : new Set(filters.types);
    }
    
    if (filters.searchQuery !== undefined) {
      this.filters.searchQuery = filters.searchQuery;
    }
    
    if (filters.selectedComponents !== undefined) {
      this.filters.selectedComponents = filters.selectedComponents instanceof Set
        ? filters.selectedComponents
        : new Set(filters.selectedComponents);
    }
    
    if (filters.excludedComponents !== undefined) {
      this.filters.excludedComponents = filters.excludedComponents instanceof Set
        ? filters.excludedComponents
        : new Set(filters.excludedComponents);
    }
    
    if (filters.focusedComponent !== undefined) {
      this.filters.focusedComponent = filters.focusedComponent;
    }
    
    if (filters.maxRelationshipDepth !== undefined) {
      this.filters.maxRelationshipDepth = filters.maxRelationshipDepth;
    }
    
    // Invalidate cache
    this._cachedGraph = null;
    
    // Emit events
    this.emit('filtersChanged', this.filters);
  }
  
  /**
   * Focus on a specific component.
   * @param {string} componentId - Component ID to focus
   * @fires componentSelected
   */
  focusOnComponent(componentId) {
    if (!this.components.has(componentId)) return;
    
    // Update focus filter
    this.filters.focusedComponent = componentId;
    
    // Invalidate cache
    this._cachedGraph = null;
    
    // Emit events
    this.emit('componentSelected', componentId);
    this.emit('filtersChanged', this.filters);
  }
  
  /**
   * Get details for a specific component.
   * @param {string} componentId - Component ID
   * @returns {Object|null} Component details or null if not found
   */
  getComponentDetails(componentId) {
    const component = this.components.get(componentId);
    if (!component) return null;
    
    // Get relationships for this component
    const relationships = Array.from(this.relationships.values())
      .filter(rel => rel.from === componentId || rel.to === componentId)
      .map(rel => {
        const isOutgoing = rel.from === componentId;
        const otherId = isOutgoing ? rel.to : rel.from;
        const otherComponent = this.components.get(otherId);
        
        return {
          ...rel,
          direction: isOutgoing ? 'outgoing' : 'incoming',
          otherComponent: otherComponent ? {
            id: otherComponent.id,
            name: otherComponent.name,
            type: otherComponent.type
          } : { id: otherId, name: 'Unknown', type: 'unknown' }
        };
      });
    
    // Return enhanced component details
    return {
      ...component,
      relationships
    };
  }
  
  /**
   * Set display options for visualization.
   * @param {Object} options - Display options
   * @fires displayOptionsChanged
   */
  setDisplayOptions(options = {}) {
    // Update options with provided values
    Object.assign(this.displayOptions, options);
    
    // Invalidate cache
    this._cachedGraph = null;
    
    // Emit events
    this.emit('displayOptionsChanged', this.displayOptions);
  }
}
```

**Example Unit Test**:
```javascript
const assert = require('assert').strict;
const { CodeMapModel } = require('../implementations/ui/models');

describe('CodeMapModel', () => {
  let model;
  let testData;
  
  beforeEach(() => {
    model = new CodeMapModel();
    testData = {
      components: [
        { id: 'c1', name: 'Component1', type: 'class', description: 'A test class' },
        { id: 'c2', name: 'Component2', type: 'function', description: 'A test function' },
        { id: 'c3', name: 'UserService', type: 'class', description: 'Handles user operations' }
      ],
      relationships: [
        { id: 'r1', from: 'c1', to: 'c2', type: 'calls', description: 'Component1 calls Component2' },
        { id: 'r2', from: 'c3', to: 'c1', type: 'extends', description: 'UserService extends Component1' }
      ]
    };
  });
  
  describe('loadData', () => {
    it('should load components correctly', () => {
      model.loadData(testData);
      assert.equal(model.components.size, 3);
      assert.equal(model.components.get('c1').name, 'Component1');
    });
    
    it('should load relationships correctly', () => {
      model.loadData(testData);
      assert.equal(model.relationships.size, 2);
      assert.equal(model.relationships.get('r1').type, 'calls');
    });
    
    it('should emit dataLoaded event', (done) => {
      model.once('dataLoaded', (data) => {
        assert.deepEqual(data.components, testData.components);
        assert.deepEqual(data.relationships, testData.relationships);
        done();
      });
      
      model.loadData(testData);
    });
  });
  
  describe('getGraphData', () => {
    beforeEach(() => {
      model.loadData(testData);
    });
    
    it('should return nodes for all components', () => {
      const graph = model.getGraphData();
      assert.equal(graph.nodes.length, 3);
    });
    
    it('should return edges for all relationships', () => {
      const graph = model.getGraphData();
      assert.equal(graph.edges.length, 2);
    });
    
    it('should format nodes correctly', () => {
      const graph = model.getGraphData();
      const node = graph.nodes.find(n => n.id === 'c1');
      
      assert.equal(node.label, 'Component1');
      assert.equal(node.group, 'class');
      assert.equal(node.title, 'A test class');
    });
    
    it('should apply type filters', () => {
      model.setFilters({ types: new Set(['class']) });
      const graph = model.getGraphData();
      
      assert.equal(graph.nodes.length, 2);
      assert.equal(graph.nodes[0].type, 'class');
      assert.equal(graph.nodes[1].type, 'class');
    });
  });
  
  describe('searchComponents', () => {
    beforeEach(() => {
      model.loadData(testData);
    });
    
    it('should find components by name', () => {
      const results = model.searchComponents('Component');
      assert.equal(results.length, 2);
    });
    
    it('should find components by description', () => {
      const results = model.searchComponents('user');
      assert.equal(results.length, 1);
      assert.equal(results[0].id, 'c3');
    });
    
    it('should return empty array for no matches', () => {
      const results = model.searchComponents('nonexistent');
      assert.equal(results.length, 0);
    });
    
    it('should prioritize name matches over description matches', () => {
      // Add a component with 'user' in the name
      testData.components.push({
        id: 'c4', name: 'UserController', type: 'class', description: 'Controller'
      });
      model.loadData(testData);
      
      const results = model.searchComponents('user');
      assert.equal(results.length, 2);
      assert.equal(results[0].id, 'c4'); // Name match should come first
    });
  });
  
  // Additional tests for other methods...
});
```

### Phase 7: Integration and System Testing

**Goal**: Verify that components work together correctly and the system meets requirements.

**Activities**:
- Integrate all components
- Perform integration testing
- Conduct system-level testing
- Validate against requirements
- Perform performance testing
- Fix bugs and issues found during testing

**Deliverables**:
- Integrated system
- Test results and reports
- Performance metrics
- Issue resolutions
- Updated documentation

**Example**:
```javascript
// Integration test for code navigation components
describe('Code Navigation Integration', () => {
  let container;
  let model;
  let componentBrowserView;
  let codeMapView;
  let componentBrowserPresenter;
  let codeMapPresenter;
  
  beforeEach(() => {
    // Set up container
    container = document.createElement('div');
    container.innerHTML = `
      <div id="component-browser"></div>
      <div id="code-map"></div>
    `;
    document.body.appendChild(container);
    
    // Create model and views
    model = new CodeMapModel();
    componentBrowserView = new ComponentBrowserView({
      container: container.querySelector('#component-browser')
    });
    codeMapView = new CodeMapView({
      container: container.querySelector('#code-map')
    });
    
    // Create presenters
    componentBrowserPresenter = new ComponentBrowserPresenter({ model, view: componentBrowserView });
    codeMapPresenter = new CodeMapPresenter({ model, view: codeMapView });
    
    // Load test data
    model.loadData(createTestData());
  });
  
  afterEach(() => {
    // Clean up
    document.body.removeChild(container);
  });
  
  it('should synchronize selection between views', () => {
    // Select component in browser
    componentBrowserView.selectComponent('c1');
    
    // Verify code map selection is updated
    assert.equal(codeMapView.selectedNodeId, 'c1');
    
    // Select different component in code map
    codeMapView.selectNode('c2');
    
    // Verify component browser selection is updated
    assert.equal(componentBrowserView.selectedComponentId, 'c2');
  });
  
  it('should apply filters to both views', () => {
    // Initial component count
    const initialComponents = componentBrowserView.container.querySelectorAll('.component-item').length;
    const initialNodes = codeMapView.nodesGroup.querySelectorAll('circle').length;
    
    // Apply filter
    model.setFilters({ types: new Set(['class']) });
    
    // Get updated counts
    const filteredComponents = componentBrowserView.container.querySelectorAll('.component-item').length;
    const filteredNodes = codeMapView.nodesGroup.querySelectorAll('circle').length;
    
    // Verify counts reduced
    assert.ok(filteredComponents < initialComponents);
    assert.ok(filteredNodes < initialNodes);
    
    // Verify only classes remain
    const remainingNodes = codeMapView.nodesGroup.querySelectorAll('circle');
    for (const node of remainingNodes) {
      const nodeId = node.dataset.id;
      const component = model.components.get(nodeId);
      assert.equal(component.type, 'class');
    }
  });
  
  it('should update on search', () => {
    // Search for components
    model.setFilters({ searchQuery: 'user' });
    
    // Verify only matching components are visible
    const visibleItems = componentBrowserView.container.querySelectorAll('.component-item:not([style*="display: none"])');
    assert.equal(visibleItems.length, 1);
    assert.equal(visibleItems[0].textContent, 'UserService');
    
    // Verify graph updated as well
    const visibleNodes = codeMapView.nodesGroup.querySelectorAll('circle');
    assert.equal(visibleNodes.length, 1);
  });
  
  // More integration tests...
});

// End-to-end test with Puppeteer
async function testCodeNavigationE2E() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to test page
    await page.goto('http://localhost:8080/test-page.html');
    
    // Wait for page to initialize
    await page.waitForSelector('#component-browser .component-item');
    
    // Count initial components
    const initialComponentCount = await page.evaluate(() => {
      return document.querySelectorAll('#component-browser .component-item').length;
    });
    
    // Search for a component
    await page.type('#search-input', 'user');
    await page.keyboard.press('Enter');
    
    // Wait for search to complete
    await page.waitForTimeout(100);
    
    // Count filtered components
    const filteredComponentCount = await page.evaluate(() => {
      return document.querySelectorAll('#component-browser .component-item:not([style*="display: none"])').length;
    });
    
    console.assert(filteredComponentCount < initialComponentCount,
      `Expected fewer components after search: ${filteredComponentCount} vs ${initialComponentCount}`);
    
    // Click on the UserService component
    await page.click('#component-browser .component-item[data-id="c3"]');
    
    // Verify component details shown
    const detailsVisible = await page.evaluate(() => {
      const details = document.querySelector('#component-details');
      return details && details.textContent.includes('UserService');
    });
    
    console.assert(detailsVisible, 'Component details should be visible');
    
    // Verify node selected in graph
    const nodeSelected = await page.evaluate(() => {
      const node = document.querySelector('#code-map circle[data-id="c3"]');
      return node && node.getAttribute('stroke') === '#1890ff';
    });
    
    console.assert(nodeSelected, 'Node should be selected in graph');
    
  } finally {
    await browser.close();
  }
}
```

## Refinement and Iteration

Throughout all phases, we maintain an iterative approach to refinement:

### Continuous Validation

- After each phase, validate outputs against requirements
- Confirm alignment with stakeholder expectations
- Adjust scope or direction if needed
- Document design decisions and tradeoffs

### Feedback Integration

- Gather feedback at each phase
- Incorporate feedback into subsequent phases
- Revisit earlier phases when necessary
- Maintain traceability from requirements to implementation

### Knowledge Capture

- Document insights gained during each phase
- Capture reasons for design decisions
- Record lessons learned and best practices
- Update project documentation continuously

## The Layered Planning Process

Our approach creates a layered planning process where each phase builds on the foundation established by previous phases:

### Layer 1: Conceptual (Phase 1-2)
- High-level concepts and architecture
- Major components and their relationships
- Design patterns and architectural styles
- System boundaries and constraints

### Layer 2: Technical (Phase 3-4)
- Detailed technical specifications
- Interface contracts and API designs
- Data structures and schemas
- Testing strategies and validation approaches

### Layer 3: Implementation (Phase 5-6)
- File structures and organization
- Class definitions and method signatures
- Algorithm designs and business logic
- Coding patterns and conventions

### Layer 4: Integration (Phase 7)
- Component connections and interactions
- System configuration and deployment
- Performance optimization and tuning
- Validation against requirements

## Automated Process Support

To streamline this process, we utilize automation at various stages:

### Automated Test Generation
- Generate test skeletons from interface definitions
- Create test data from schema definitions
- Generate integration tests from component connections
- Create performance tests from requirements

### Automated Documentation
- Generate API documentation from code
- Create sequence diagrams from design patterns
- Generate class diagrams from implementation
- Create traceability matrices from requirements

### Implementation Scaffolding
- Generate class skeletons from interfaces
- Create method stubs from contracts
- Generate database code from schemas
- Create UI components from wireframes

## Example: Complete Project Planning Flow

Here's how a complete project flows through our process:

### Initial Requirement
```
We need a way to visualize code components and their relationships to help developers understand complex projects.
```

### Phase 1: Requirements Analysis
```markdown
# Code Navigation Requirements

## User Needs
- Developers need to understand complex codebases quickly
- Developers need to find specific components and their relationships
- Developers need to visualize architecture and dependencies

## Key Features
- Code component browser with search and filtering
- Relationship visualization with interactive graph
- Component details viewer with source code display

## Success Criteria
- Users can find specific components in under 30 seconds
- System can visualize projects with 1000+ components
- Search returns relevant results for 90% of queries
```

### Phase 2: Architectural Design
```markdown
# Code Navigation Architecture

## Architectural Style
- Model-View-Presenter (MVP) pattern for UI components
- Repository pattern for data access
- Observer pattern for state synchronization

## Major Components
1. **Code Map Model**
   - Stores code components and relationships
   - Provides filtering and searching
   - Manages component state
   - Pattern: Observer, Repository

2. **Component Browser**
   - Displays component hierarchy
   - Allows navigation and selection
   - Shows component details
   - Pattern: MVP, Composite

3. **Code Map Visualization**
   - Renders visual representation of code
   - Supports different visualization strategies
   - Provides interactive navigation
   - Pattern: Strategy, Bridge
```

### Phase 3: Technical Specification
```markdown
# Code Navigation Technical Specification

## Technology Stack
- TypeScript/JavaScript for core implementation
- SVG for graph visualization
- Browser DOM for UI components
- In-memory storage with SQLite persistence

## Data Model

### Component
```typescript
interface Component {
  id: string;
  name: string;
  type: 'file' | 'class' | 'function' | 'method';
  description?: string;
  location?: {
    file: string;
    start: { line: number, column: number };
    end: { line: number, column: number };
  };
  parentId?: string;
  sourceCode?: string;
  metadata?: Record<string, any>;
}
```

### Relationship
```typescript
interface Relationship {
  id: string;
  from: string;
  to: string;
  type: string;
  description?: string;
  metadata?: Record<string, any>;
}
```

## Core APIs

### CodeMapModel
```typescript
interface CodeMapModel {
  // Data management
  loadData(data: { components: Component[], relationships: Relationship[] }): void;
  getComponents(): Component[];
  getComponentDetails(id: string): ComponentDetails | null;
  
  // Graph data
  getGraphData(): { nodes: Node[], edges: Edge[] };
  
  // Filtering and search
  searchComponents(query: string): Component[];
  setFilters(filters: Filters): void;
  
  // Focus and selection
  focusOnComponent(id: string): void;
  
  // Events
  on(event: 'dataLoaded' | 'componentsChanged' | 'filtersChanged' | 'componentSelected', 
     handler: Function): void;
  off(event: string, handler: Function): void;
}
```
```

### Phase 4: Test Planning
```markdown
# Code Navigation Test Plan

## Unit Tests

### CodeMapModel Tests
- Initialize with empty state
- Load components and relationships
- Filter components by type and query
- Search components with different queries
- Generate graph data with correct structure
- Focus on components and notify listeners

## Integration Tests

### Model-View Integration
- Selection in component browser updates code map
- Filter changes apply to both views
- Search results display in both views
- Component details update with selections

## End-to-End Tests

### Complete User Workflow
1. User loads code project
2. User searches for a component
3. User selects component from results
4. Component details are displayed
5. Related components are highlighted
6. User navigates through relationships
```

### Phase 5: Implementation Planning
```markdown
# Code Navigation Implementation Plan

## File Structure
```
/tools/felix/
  /implementations/
    /ui/
      /models/
        CodeMapModel.js
        ComponentModel.js
        RelationshipModel.js
        index.js
      /views/
        CodeMapView.js
        ComponentBrowserView.js
        index.js
      /presenters/
        CodeMapPresenter.js
        ComponentBrowserPresenter.js
        index.js
  /test/
    test-code-navigation-models.js
    test-code-navigation-views.js
    test-code-navigation-integration.js
```

## Implementation Sequence
1. Create model layer first
   - CodeMapModel with data handling
   - ComponentModel for individual components
   - RelationshipModel for relationships
   
2. Create view skeletons
   - CodeMapView with basic rendering
   - ComponentBrowserView with tree display
   
3. Connect with presenters
   - CodeMapPresenter for visualization
   - ComponentBrowserPresenter for component tree
   
4. Add testing infrastructure
   - Unit tests for models
   - Component tests for views
   - Integration tests for the system
```

### Phase 6: Full Implementation
```javascript
/**
 * Model for code map visualization.
 * Manages component data and relationships for display.
 */
class CodeMapModel extends EventEmitter {
  constructor(options = {}) {
    super();
    this.components = new Map();
    this.relationships = new Map();
    this.filters = {
      types: new Set(['file', 'class', 'function', 'method']),
      searchQuery: '',
      focusedComponent: null
    };
  }
  
  loadData({ components = [], relationships = [] }) {
    // Clear existing data
    this.components.clear();
    this.relationships.clear();
    
    // Load components
    for (const component of components) {
      this.components.set(component.id, component);
    }
    
    // Load relationships
    for (const relationship of relationships) {
      this.relationships.set(relationship.id, relationship);
    }
    
    // Emit events
    this.emit('dataLoaded', { components, relationships });
    this.emit('componentsChanged');
  }
  
  // More implementation...
}
```

### Phase 7: Integration Testing
```javascript
// Integration test for component selection synchronization
describe('Code Navigation Integration', () => {
  let model, componentBrowserView, codeMapView;
  let componentBrowserPresenter, codeMapPresenter;
  
  beforeEach(() => {
    // Set up test environment
    model = new CodeMapModel();
    componentBrowserView = new ComponentBrowserView({
      container: document.getElementById('component-browser')
    });
    codeMapView = new CodeMapView({
      container: document.getElementById('code-map')
    });
    
    // Create presenters
    componentBrowserPresenter = new ComponentBrowserPresenter({
      model, view: componentBrowserView
    });
    codeMapPresenter = new CodeMapPresenter({
      model, view: codeMapView
    });
    
    // Load test data
    model.loadData(createTestData());
  });
  
  it('should synchronize selection between views', () => {
    // Select in component browser
    componentBrowserView.selectComponent('c1');
    
    // Verify code map selection is updated
    expect(codeMapView.selectedNodeId).toBe('c1');
    
    // Select in code map
    codeMapView.selectNode('c2');
    
    // Verify component browser selection is updated
    expect(componentBrowserView.selectedComponentId).toBe('c2');
  });
});
```

## Conclusion

Our project plan to code process provides a structured, incremental approach to software development that ensures high-quality, maintainable code that meets requirements. By breaking development into well-defined phases with clear deliverables, we create a repeatable process that can be applied to projects of various sizes and complexities.

The key benefits of this approach include:

1. **Clear Traceability**: Every line of code can be traced back to requirements
2. **Reduced Risk**: Early planning identifies issues before implementation
3. **Improved Quality**: Testing strategy is integrated throughout the process
4. **Better Maintainability**: Architecture-first approach leads to cleaner code
5. **Enhanced Collaboration**: Clear deliverables facilitate team communication
6. **Consistent Results**: Standardized process leads to consistent quality

By following this process, we create software that is not only functional but also well-designed, tested, and maintainable.