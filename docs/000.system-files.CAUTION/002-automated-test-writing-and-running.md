# Automated Test Writing and Running

## Overview

This document outlines our comprehensive approach to automated testing in the AIgent Smith system. It explains how we integrate testing into the development workflow, provide different testing layers, and automate test creation and execution at various stages of development.

## Core Testing Philosophy

Our testing philosophy centers on these key principles:

1. **Test-Driven Validation**: Tests serve as both specifications and validations of intended behavior.
2. **Layered Testing Approach**: Different test types verify different aspects of the system.
3. **Automation at Multiple Stages**: Tests are automatically generated, run, and validated.
4. **Integration with Development Flow**: Testing is a core part of our project planning and implementation.
5. **Comprehensive Coverage**: We aim for complete coverage across components and integration points.

## Testing Layers

We implement testing in distinct layers, each serving different purposes and operating at different levels of abstraction:

### 1. Unit Tests

**Purpose**: Verify that individual components work as expected in isolation.

**Characteristics**:
- Focus on a single class, method, or function
- Mock dependencies to isolate the component being tested
- Fast execution and minimal setup
- Direct calls to API without full system initialization

**Automation Approach**:
- Automatically generated based on interface definitions and usage patterns
- One test class per implementation class
- Tests for expected behavior, edge cases, and error handling
- Run on each build and during CI/CD

**Example**:
```javascript
// Unit test for ComponentModel
test('ComponentModel initializes with correct data', () => {
  const mockData = { id: 'comp1', name: 'TestComponent', type: 'class' };
  const model = new ComponentModel({ initialData: mockData });
  
  expect(model.data.id).toBe('comp1');
  expect(model.data.name).toBe('TestComponent');
});
```

### 2. Functional Tests

**Purpose**: Verify that system features and components work correctly together.

#### 2.1 Terminal-Based Functional Tests

**Characteristics**:
- Run in command-line environment
- Test business logic and integration of components
- No UI dependency, but test end-to-end functionality
- Can be scripted and automated with minimal setup

**Automation Approach**:
- Generated from feature specifications and component interactions
- Script-based test runners that verify outputs against expected results
- Output collected via console.log and file system
- Run during integration testing phase

**Example**:
```javascript
// Terminal-based functional test for code indexer
async function testCodeIndexerFunctionality() {
  const indexer = new CodeIndexer();
  const testDir = './test-fixtures/simple-project';
  
  await indexer.indexDirectory(testDir);
  const components = indexer.getComponents();
  
  console.assert(components.length === 5, 
    `Expected 5 components, got ${components.length}`);
  
  const classComponents = components.filter(c => c.type === 'class');
  console.assert(classComponents.length === 2, 
    `Expected 2 classes, got ${classComponents.length}`);
}
```

#### 2.2 Headless App Tests

**Characteristics**:
- Require application launch but not visual UI interaction
- Test application lifecycle and core functionality
- Verify interactions between multiple components and systems
- Load app, perform operations, check results, and exit

**Automation Approach**:
- Generated based on use cases and feature requirements
- Utilize headless browser environment when necessary
- Output collected through console, data exports, or fixtures
- Run during feature integration and release preparation

**Example**:
```javascript
// Headless app test for model linking
async function testModelLinking() {
  // Start app in test mode
  const app = await launchAppHeadless({ testMode: true });
  
  try {
    // Load test project
    await app.loadProject('./test-fixtures/complex-project');
    
    // Run indexing
    await app.runOperation('index-code');
    
    // Export indexed data
    const data = await app.exportData('component-index');
    
    // Verify relationships were correctly identified
    const relationships = data.relationships;
    const hasDependency = relationships.some(r => 
      r.type === 'depends_on' && 
      r.source === 'UserService' && 
      r.target === 'DatabaseClient'
    );
    
    console.assert(hasDependency, 
      'Expected dependency relationship between UserService and DatabaseClient');
  } finally {
    // Clean up app
    await app.close();
  }
}
```

#### 2.3 UI-Interactive Tests

**Characteristics**:
- Test full UI interactions and workflows
- Verify user experience and UI behavior
- Simulate user actions and check UI responses
- Test integration of all system layers including UI

**Automation Approach**:
- Generated from user stories and UI specifications
- Use headless browser with automation frameworks (Puppeteer, Playwright)
- Record user interactions then replay with assertions
- Combine with visual testing for UI appearance verification
- Run during feature completion and regression testing

**Example**:
```javascript
// UI-interactive test for code navigation
async function testCodeNavigation() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:8080/?test=true');
    
    // Load test project
    await page.click('#load-project');
    await page.waitForSelector('#component-tree.loaded');
    
    // Click on a component in the tree
    await page.click('#component-tree .component[data-id="UserService"]');
    
    // Wait for the graph to focus on that component
    await page.waitForFunction(() => {
      const selectedNode = document.querySelector('#graph-view .node.selected');
      return selectedNode && selectedNode.getAttribute('data-id') === 'UserService';
    });
    
    // Verify relationships are shown
    const relationshipCount = await page.evaluate(() => {
      return document.querySelectorAll('#graph-view .edge').length;
    });
    
    console.assert(relationshipCount > 0, 
      'Expected relationships to be shown in the graph');
  } finally {
    await browser.close();
  }
}
```

### 3. Integration Tests

**Purpose**: Verify that different parts of the system work together correctly.

**Characteristics**:
- Focus on interactions between components and subsystems
- Test flows that cross architectural boundaries
- Verify contract compliance between components
- Often require complex setup and teardown

**Automation Approach**:
- Generated based on architectural design and component connections
- Identify integration points from architecture documents
- Create tests that verify behavior across boundaries
- Run during integration phases and release preparation

**Example**:
```javascript
// Integration test between code indexer and AI model
async function testIndexerAIModelIntegration() {
  // Set up indexer
  const indexer = new CodeIndexer();
  const testDir = './test-fixtures/simple-project';
  await indexer.indexDirectory(testDir);
  
  // Set up AI model with mock
  const aiModel = new MockAIModel();
  
  // Set up context generator
  const contextGenerator = new ContextGenerator({
    indexer,
    aiModel
  });
  
  // Generate context for a query
  const context = await contextGenerator.generateContext('How does UserService work?');
  
  // Verify context includes relevant components
  const hasUserService = context.includes('UserService');
  console.assert(hasUserService, 'Context should include UserService information');
  
  // Verify model interaction
  const modelCalls = aiModel.getInteractions();
  console.assert(modelCalls.length > 0, 'AI model should have been called');
}
```

### 4. End-to-End Tests

**Purpose**: Verify that the entire system works correctly from user input to final output.

**Characteristics**:
- Test complete user workflows and scenarios
- Verify behavior across all system layers
- Include external dependencies and services
- Often longer running and more complex

**Automation Approach**:
- Generated from user stories and acceptance criteria
- Create scenarios that exercise full system functionality
- May use UI automation, API calls, or combination
- Run during release preparation and system validation

**Example**:
```javascript
// End-to-end test for a complete workflow
async function testCompleteUserWorkflow() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    // Start application
    await page.goto('http://localhost:8080');
    
    // Load project
    await page.click('#load-project-button');
    await page.waitForSelector('#file-picker');
    await page.setInputFiles('#file-picker', './test-fixtures/e2e-project');
    await page.click('#confirm-load');
    
    // Wait for indexing to complete
    await page.waitForSelector('#indexing-complete', { timeout: 30000 });
    
    // Navigate to code map
    await page.click('#code-map-tab');
    
    // Search for a component
    await page.type('#search-input', 'AuthenticationService');
    await page.keyboard.press('Enter');
    
    // Verify component is found and selected
    await page.waitForSelector('#component-detail-panel');
    const componentName = await page.$eval('#component-name', el => el.textContent);
    console.assert(componentName === 'AuthenticationService', 
      'Expected AuthenticationService to be selected');
    
    // Run AI query
    await page.type('#ai-query-input', 'How does authentication work?');
    await page.click('#submit-query');
    
    // Verify response received
    await page.waitForSelector('#ai-response', { timeout: 30000 });
    const hasResponse = await page.evaluate(() => {
      const response = document.querySelector('#ai-response');
      return response && response.textContent.length > 100;
    });
    
    console.assert(hasResponse, 'Expected AI to provide a substantive response');
  } finally {
    await browser.close();
  }
}
```

## Test Generation Process

We automate test creation as part of our development workflow:

### 1. During Planning Phase

- Identify test scenarios based on requirements
- Define expected behaviors for components
- Create test outlines in planning documents
- Generate test cases from interface specifications
- Document edge cases and error scenarios

**Example Planning Output**:
```
## Component Tests for CodeMapModel
- Should initialize with empty data
- Should load components and relationships
- Should generate graph data with correct structure
- Should apply filters to components
- Should search components by name and type
- Should handle empty data gracefully
- Should emit events when data changes
```

### 2. During Interface Design

- Generate test skeletons from interface definitions
- Create test doubles (mocks, stubs) for dependencies
- Define contract tests between components
- Implement basic state tests based on interface properties
- Create test harnesses for integration points

**Example Generated Test Skeleton**:
```javascript
// Generated from ICodeMapModel interface
describe('CodeMapModel', () => {
  describe('initialization', () => {
    it('should initialize with empty state', () => {
      // TODO: Verify default state
    });
  });
  
  describe('loadData', () => {
    it('should load components correctly', () => {
      // TODO: Verify components loaded
    });
    
    it('should load relationships correctly', () => {
      // TODO: Verify relationships loaded
    });
    
    it('should emit dataLoaded event', () => {
      // TODO: Verify event emitted
    });
  });
  
  // More test skeletons based on interface methods...
});
```

### 3. During Implementation

- Expand test skeletons with actual expectations
- Implement test fixtures and data generators
- Add performance and resource utilization tests
- Create integration tests based on actual dependencies
- Verify implementation against interface requirements

**Example Implementation-Phase Test**:
```javascript
describe('CodeMapModel', () => {
  let model;
  let testData;
  
  beforeEach(() => {
    model = new CodeMapModel();
    testData = {
      components: [
        { id: 'c1', name: 'Component1', type: 'class' },
        { id: 'c2', name: 'Component2', type: 'function' }
      ],
      relationships: [
        { id: 'r1', from: 'c1', to: 'c2', type: 'calls' }
      ]
    };
  });
  
  describe('loadData', () => {
    it('should load components correctly', () => {
      model.loadData(testData);
      expect(model.components.size).toBe(2);
      expect(model.components.get('c1').name).toBe('Component1');
    });
    
    it('should emit dataLoaded event', () => {
      const spy = jest.fn();
      model.on('dataLoaded', spy);
      model.loadData(testData);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining(testData));
    });
  });
});
```

### 4. During Feature Integration

- Create scenarios that test feature workflows
- Implement UI interaction tests
- Verify integration with other components
- Generate regression tests for existing functionality
- Create performance benchmarks for integrated features

**Example Integration-Phase Test**:
```javascript
describe('Code Navigation Feature', () => {
  let model, componentBrowserView, codeMapView;
  let componentBrowserPresenter, codeMapPresenter;
  
  beforeEach(async () => {
    // Set up model and views
    model = new CodeMapModel();
    componentBrowserView = new ComponentBrowserView({
      container: document.getElementById('component-browser')
    });
    codeMapView = new CodeMapView({
      container: document.getElementById('code-map')
    });
    
    // Create presenters and connect
    componentBrowserPresenter = new ComponentBrowserPresenter({
      model, view: componentBrowserView
    });
    codeMapPresenter = new CodeMapPresenter({
      model, view: codeMapView
    });
    
    // Load test data
    await model.loadData(getTestProjectData());
  });
  
  it('should synchronize selection between views', () => {
    // Select component in browser
    componentBrowserView.selectComponent('c1');
    
    // Verify code map selection is updated
    expect(codeMapView.selectedNodeId).toBe('c1');
    
    // Select different component in code map
    codeMapView.selectNode('c2');
    
    // Verify component browser selection is updated
    expect(componentBrowserView.selectedComponentId).toBe('c2');
  });
});
```

## Test Automation and CI/CD Integration

Our test automation system is tightly integrated into our development workflow and CI/CD pipeline:

### Local Development

- **Pre-Commit Hooks**: Run unit tests and linting before commit
- **Watch Mode**: Automatically run tests during development
- **Test Explorer**: Integrated with IDE for test discovery and running
- **Visual Testing Tools**: Interactive UI for exploring test results

### Continuous Integration

- **Automatic Triggering**: Run tests on push and pull requests
- **Parallel Test Execution**: Run tests in parallel for faster feedback
- **Test Categorization**: Separate quick tests from long-running tests
- **Test Reports**: Generate detailed reports with coverage analysis
- **Status Badges**: Show test status on repository and PRs

### Release Process

- **Regression Suite**: Run full test suite before release
- **Performance Testing**: Verify system performance meets requirements
- **Compatibility Testing**: Test on multiple platforms and environments
- **Deployment Verification**: Run tests on deployed/staged system
- **Rollback Triggers**: Automatic rollback if critical tests fail

## Test Infrastructure

The test infrastructure includes:

### Test Runners

- **Node.js Test Runner**: For unit and API tests
- **Puppeteer/Playwright**: For UI and browser tests
- **Custom Test Harness**: For specialized system testing

### Testing Frameworks

- **Jest**: For unit and component tests
- **Mocha/Chai**: For functional tests
- **Custom Framework**: For end-to-end and specialized tests

### Mock and Stub Libraries

- **Sinon**: For function and behavior mocking
- **Mock Service Worker**: For API mocking
- **Custom Mocks**: For specialized components

### Reporting and Analysis

- **Coverage Reports**: Code coverage analysis
- **Performance Dashboards**: Track performance metrics over time
- **Visual Regression Tools**: Compare UI changes
- **Test History Database**: Track test results over time

## Example: Complete Test Lifecycle for Code Navigation Feature

This section walks through the complete test lifecycle for the Code Navigation feature:

### 1. Planning Phase Test Definition

```markdown
# Test Plan for Code Navigation Feature

## Unit Tests

### CodeMapModel
- Initialize with empty state
- Load components and relationships
- Generate graph data
- Apply filters to components
- Search components by query
- Focus on specific component

### ComponentBrowserView
- Render component tree
- Handle component selection
- Apply filters to visible components
- Expand/collapse component tree nodes
- Display component details

### CodeMapPresenter
- Initialize with model and view
- Update view when model changes
- Handle selection synchronization
- Apply filter changes to model

## Functional Tests

### Terminal-Based
- Load code index and verify component count
- Search components and verify results
- Generate graph representation and verify structure

### Headless App
- Load project and verify indexing
- Verify component browsing without UI
- Measure performance metrics

### UI-Interactive
- Verify component tree rendering
- Test component selection and highlighting
- Verify synchronization between views
- Test search functionality
- Verify filter application

## Integration Tests

- Verify CodeMapModel with real data
- Test ComponentBrowserView with CodeMapPresenter
- Verify CodeMapView with CodeMapPresenter
- Test synchronization between different views

## End-to-End Tests

- Complete workflow from project loading to code browsing
- Search and filter components in UI
- Navigate component relationships
- Export code map visualizations
```

### 2. Interface Design Test Generation

```javascript
// Generated from ICodeMapModel interface
describe('CodeMapModel', () => {
  describe('loadData', () => {
    // Test loading data
  });
  
  describe('getComponents', () => {
    // Test retrieving components
  });
  
  describe('getGraphData', () => {
    // Test graph data generation
  });
  
  describe('searchComponents', () => {
    // Test search functionality
  });
  
  describe('setFilters', () => {
    // Test filter application
  });
  
  describe('focusOnComponent', () => {
    // Test component focus
  });
  
  describe('events', () => {
    // Test event emission
  });
});

// More test skeletons for other components...
```

### 3. Implementation Tests

```javascript
// Actual implementation test for CodeMapModel
describe('CodeMapModel', () => {
  let model;
  let testData;
  
  beforeEach(() => {
    model = new CodeMapModel();
    testData = createTestData(); // Helper to create test fixtures
  });
  
  describe('loadData', () => {
    it('should load components correctly', () => {
      model.loadData(testData);
      expect(model.components.size).toBe(testData.components.length);
      
      // Verify a specific component was loaded
      const component = model.components.get('class1');
      expect(component).toBeDefined();
      expect(component.name).toBe('UserManager');
    });
    
    it('should load relationships correctly', () => {
      model.loadData(testData);
      expect(model.relationships.size).toBe(testData.relationships.length);
      
      // Verify a specific relationship was loaded
      const relationship = model.relationships.get('rel1');
      expect(relationship).toBeDefined();
      expect(relationship.from).toBe('method1');
      expect(relationship.to).toBe('function1');
    });
    
    it('should emit dataLoaded event', () => {
      const spy = jest.fn();
      model.on('dataLoaded', spy);
      model.loadData(testData);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        components: expect.any(Array),
        relationships: expect.any(Array)
      }));
    });
  });
  
  // More tests for other methods...
});
```

### 4. Functional/Integration Tests

```javascript
// Terminal-based functional test
async function testCodeNavigation() {
  const model = new CodeMapModel();
  const testData = loadTestProject('./fixtures/test-project');
  
  // Load data
  model.loadData(testData);
  console.log(`Loaded ${model.components.size} components`);
  
  // Test search
  const searchResults = model.searchComponents('user');
  console.log(`Search found ${searchResults.length} components`);
  
  // Verify specific component found
  const hasUserManager = searchResults.some(c => c.name === 'UserManager');
  console.assert(hasUserManager, 'Search should find UserManager');
  
  // Test filtering
  model.setFilters({ types: new Set(['class']) });
  const graphData = model.getGraphData();
  console.log(`Filtered graph has ${graphData.nodes.length} nodes`);
  
  // Verify only classes included
  const allClasses = graphData.nodes.every(n => n.type === 'class');
  console.assert(allClasses, 'Filter should include only classes');
}

// UI Integration test with Puppeteer
async function testCodeNavigationUI() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:8080/test-page.html');
    
    // Load test data
    await page.evaluate(() => {
      const model = new CodeMapModel();
      const testData = createTestData();
      model.loadData(testData);
      
      // Create views
      const componentBrowserView = new ComponentBrowserView({
        container: document.getElementById('component-browser-container')
      });
      
      const codeMapView = new CodeMapView({
        container: document.getElementById('code-map-container')
      });
      
      // Create presenters
      const componentBrowserPresenter = new ComponentBrowserPresenter({
        model, view: componentBrowserView
      });
      
      const codeMapPresenter = new CodeMapPresenter({
        model, view: codeMapView
      });
      
      // Store in window for test access
      window.testContext = {
        model,
        componentBrowserView,
        codeMapView,
        componentBrowserPresenter,
        codeMapPresenter
      };
    });
    
    // Test component selection
    await page.click('.component-item[data-id="class1"]');
    
    // Verify selection in both views
    const isSelectedInBrowser = await page.evaluate(() => 
      window.testContext.componentBrowserView.selectedComponentId === 'class1'
    );
    
    const isSelectedInMap = await page.evaluate(() => 
      window.testContext.codeMapView.selectedNodeId === 'class1'
    );
    
    console.assert(isSelectedInBrowser, 'Component should be selected in browser');
    console.assert(isSelectedInMap, 'Component should be selected in map');
    
  } finally {
    await browser.close();
  }
}
```

### 5. End-to-End Tests

```javascript
// End-to-End workflow test
async function testCompleteWorkflow() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:8080');
    
    // Log in if needed
    await page.type('#username', 'testuser');
    await page.type('#password', 'password');
    await page.click('#login-button');
    
    // Load project
    await page.click('#load-project');
    await page.waitForSelector('#project-picker');
    await page.click('#test-project');
    await page.click('#confirm-project');
    
    // Wait for indexing
    await page.waitForSelector('#indexing-complete', { timeout: 30000 });
    
    // Verify component browser populated
    const componentCount = await page.evaluate(() => 
      document.querySelectorAll('#component-browser .component-item').length
    );
    console.assert(componentCount > 0, 'Component browser should show components');
    
    // Search for component
    await page.type('#search-input', 'Authentication');
    await page.keyboard.press('Enter');
    
    // Select component from search results
    await page.click('.search-result[data-id="AuthService"]');
    
    // Verify component details shown
    const detailsVisible = await page.evaluate(() => {
      const details = document.querySelector('#component-details');
      return details && details.textContent.includes('AuthService');
    });
    console.assert(detailsVisible, 'Component details should be shown');
    
    // Check code map visualization
    const mapHasNodes = await page.evaluate(() => 
      document.querySelectorAll('#code-map svg circle').length > 0
    );
    console.assert(mapHasNodes, 'Code map should visualize components');
    
    // Verify AuthService node is highlighted
    const isHighlighted = await page.evaluate(() => {
      const node = document.querySelector('circle[data-id="AuthService"]');
      return node && node.classList.contains('selected');
    });
    console.assert(isHighlighted, 'AuthService node should be highlighted');
    
  } finally {
    await browser.close();
  }
}
```

## Test Maintenance and Evolution

Our approach to maintaining and evolving tests:

### Automated Test Maintenance

- Automatic detection of interface changes that affect tests
- Test generation from updated interfaces
- Validation of test coverage changes
- Notification when implementation changes break tests

### Test Evolution with Features

- Incremental test updates during feature development
- Version control of test scripts alongside code
- Migration scripts for test databases and fixtures
- Documentation updates linking features to tests

### Test Quality Assurance

- Meta-testing to verify test quality
- Regular review of test coverage and effectiveness
- Flaky test detection and remediation
- Performance analysis of test suite

## Conclusion

This testing approach provides multiple layers of verification for our software, ensuring that it meets requirements and functions correctly at all levels. By integrating testing throughout the development lifecycle and automating test creation and execution, we maintain high quality while keeping the testing effort manageable.

The system allows for flexibility in testing different aspects of the software while providing a comprehensive coverage of functionality from unit to end-to-end levels. Through the use of modern testing tools and practices, we create a robust testing framework that evolves with the software and provides timely feedback about quality at all stages of development.