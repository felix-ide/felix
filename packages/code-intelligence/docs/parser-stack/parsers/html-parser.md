# HTML Parser

The HTML parser provides comprehensive analysis of HTML documents with support for embedded languages (JavaScript, CSS, PHP), modern web frameworks (Vue, Angular), and template systems.

## Overview

- **Language Support**: HTML, XHTML, XML
- **File Extensions**: `.html`, `.htm`, `.xhtml`, `.vue`
- **Parser Type**: AST-based with delegation
- **Parsing Level**: Structural with semantic delegation
- **Mixed-Language**: Yes (JavaScript, CSS, PHP)
- **Incremental**: Yes (via Tree-sitter)
- **LSP Support**: Not available (LSP integrations deferred)

## Features

### Core HTML Support

- **Document Structure**: DOCTYPE, html, head, body parsing
- **Element Hierarchy**: Nested element relationships
- **Attributes**: ID, class, data attributes, event handlers
- **Text Content**: Text nodes and CDATA sections
- **Comments**: HTML comment extraction
- **Forms**: Form elements and validation attributes

### Embedded Language Support

The HTML parser automatically detects and delegates to appropriate parsers for:

- **JavaScript**: `<script>` tags and inline event handlers
- **CSS**: `<style>` tags and inline styles
- **PHP**: Mixed PHP/HTML content
- **Template Languages**: Handlebars, Jinja2, etc.

### Framework Detection

- **Vue.js**: Single File Components (SFCs)
- **Angular**: Component templates
- **React**: JSX in script tags
- **Web Components**: Custom element definitions

## Configuration Options

### Parser Options

```typescript
interface HtmlParserOptions extends ParserOptions {
  // Language delegation
  enableJavaScriptParsing?: boolean;  // Parse <script> content
  enableCssParsing?: boolean;         // Parse <style> content
  enablePhpParsing?: boolean;         // Parse embedded PHP

  // Framework detection
  detectVue?: boolean;                // Detect Vue SFC patterns
  detectAngular?: boolean;            // Detect Angular templates
  detectWebComponents?: boolean;      // Detect custom elements

  // Content extraction
  extractTextContent?: boolean;       // Extract text nodes
  extractAttributes?: boolean;        // Extract all attributes
  extractComments?: boolean;          // Extract HTML comments

  // Validation
  validateHtml?: boolean;             // Validate HTML structure
  strictMode?: boolean;               // Strict HTML parsing
}
```

### Usage Examples

```typescript
import { ParserFactory } from '@felix/code-intelligence/code-parser';

const factory = new ParserFactory();

// Basic HTML parsing
const htmlResult = await factory.parseDocument('/index.html');

// Vue Single File Component
const vueResult = await factory.parseDocument('/Component.vue', undefined, {
  parserOptions: {
    detectVue: true,
    enableJavaScriptParsing: true,
    enableCssParsing: true
  }
});

// PHP template
const phpResult = await factory.parseDocument('/template.php', undefined, {
  parserOptions: {
    enablePhpParsing: true,
    enableJavaScriptParsing: true
  }
});
```

## Component Types

### HTML Elements

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Page</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header id="main-header" class="header primary">
        <nav class="navigation">
            <ul>
                <li><a href="/" data-page="home">Home</a></li>
                <li><a href="/about" data-page="about">About</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section class="content">
            <h1>Welcome</h1>
            <p>This is the main content area.</p>
        </section>
    </main>

    <footer>
        <p>&copy; 2024 My Website</p>
    </footer>
</body>
</html>
```

**Extracted Components:**
- Document declaration (`ComponentType.MODULE`)
- HTML elements (`ComponentType.UNKNOWN` with element metadata)
- Attributes (`ComponentType.PROPERTY`)
- Text content (`ComponentType.VARIABLE` for significant text)

### Embedded JavaScript

```html
<script type="text/javascript">
    // Global configuration
    const CONFIG = {
        apiUrl: 'https://api.example.com',
        version: '1.0.0'
    };

    // Utility functions
    function initializeApp() {
        console.log('App initialized');
        setupEventListeners();
        loadUserData();
    }

    function setupEventListeners() {
        document.addEventListener('DOMContentLoaded', initializeApp);

        // Form submission
        const form = document.getElementById('contact-form');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
    }

    async function loadUserData() {
        try {
            const response = await fetch(`${CONFIG.apiUrl}/user`);
            const user = await response.json();
            displayUser(user);
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    function displayUser(user) {
        const userElement = document.getElementById('user-info');
        if (userElement) {
            userElement.innerHTML = `
                <h2>${user.name}</h2>
                <p>${user.email}</p>
            `;
        }
    }
</script>
```

**Extracted Components:**
- JavaScript constants (`ComponentType.CONSTANT`)
- JavaScript functions (`ComponentType.FUNCTION`)
- DOM element references (`ComponentType.VARIABLE`)
- Event handlers (`ComponentType.METHOD`)

### Embedded CSS

```html
<style>
    /* Global styles */
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
    }

    /* Header styles */
    .header {
        background: #2c3e50;
        color: white;
        padding: 1rem 0;
    }

    .header.primary {
        background: #3498db;
    }

    /* Navigation */
    .navigation ul {
        list-style: none;
        display: flex;
        justify-content: center;
    }

    .navigation li {
        margin: 0 1rem;
    }

    .navigation a {
        color: white;
        text-decoration: none;
        transition: color 0.3s ease;
    }

    .navigation a:hover {
        color: #ecf0f1;
    }

    /* Responsive design */
    @media (max-width: 768px) {
        .navigation ul {
            flex-direction: column;
        }

        .navigation li {
            margin: 0.5rem 0;
        }
    }
</style>
```

**Extracted Components:**
- CSS rules (`ComponentType.UNKNOWN` with rule metadata)
- Selectors (`ComponentType.PROPERTY`)
- Media queries (`ComponentType.MODULE`)
- CSS properties (`ComponentType.PROPERTY`)

### Vue Single File Components

```vue
<template>
  <div class="user-profile">
    <div v-if="loading" class="loading">
      Loading user data...
    </div>

    <div v-else-if="error" class="error">
      Error: {{ error.message }}
    </div>

    <div v-else class="user-content">
      <img :src="user.avatar" :alt="user.name" class="avatar">
      <h1>{{ user.name }}</h1>
      <p>{{ user.email }}</p>

      <button @click="editUser" class="edit-btn">
        Edit Profile
      </button>

      <UserForm
        v-if="editing"
        :user="user"
        @save="handleSave"
        @cancel="editing = false"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from 'vue';
import UserForm from './UserForm.vue';
import { useUserApi } from '@/composables/useUserApi';

export default defineComponent({
  name: 'UserProfile',

  components: {
    UserForm
  },

  props: {
    userId: {
      type: Number,
      required: true
    }
  },

  setup(props, { emit }) {
    const { getUser, updateUser } = useUserApi();

    const user = ref(null);
    const loading = ref(true);
    const error = ref(null);
    const editing = ref(false);

    const displayName = computed(() => {
      return user.value ? `${user.value.firstName} ${user.value.lastName}` : '';
    });

    const loadUser = async () => {
      try {
        loading.value = true;
        user.value = await getUser(props.userId);
        error.value = null;
      } catch (err) {
        error.value = err;
      } finally {
        loading.value = false;
      }
    };

    const editUser = () => {
      editing.value = true;
    };

    const handleSave = async (updatedUser) => {
      try {
        user.value = await updateUser(props.userId, updatedUser);
        editing.value = false;
        emit('user-updated', user.value);
      } catch (err) {
        error.value = err;
      }
    };

    onMounted(() => {
      loadUser();
    });

    return {
      user,
      loading,
      error,
      editing,
      displayName,
      editUser,
      handleSave
    };
  }
});
</script>

<style scoped>
.user-profile {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
}

.error {
  color: #e74c3c;
}

.edit-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.edit-btn:hover {
  background: #2980b9;
}
</style>
```

**Extracted Components:**
- Vue template structure (`ComponentType.MODULE`)
- Vue component definition (`ComponentType.CLASS`)
- Vue directives (`ComponentType.DECORATOR`)
- Computed properties (`ComponentType.PROPERTY`)
- Methods (`ComponentType.METHOD`)
- Template sections (`ComponentType.MODULE`)
- Scoped styles (`ComponentType.MODULE`)

## Relationship Types

### Element Hierarchy

```html
<div class="container">
    <header class="main-header">
        <nav>
            <ul class="menu">
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
            </ul>
        </nav>
    </header>
</div>
```

**Extracted Relationships:**
- `CONTAINS`: Parent-child element relationships
- `REFERENCES`: ID and class references
- `USES`: CSS class usage

### Cross-Language Relationships

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .highlight { background: yellow; }
    </style>
</head>
<body>
    <div id="content" class="highlight">Content</div>

    <script>
        // JavaScript accessing HTML elements
        const contentDiv = document.getElementById('content');
        contentDiv.addEventListener('click', function() {
            this.classList.toggle('highlight');
        });
    </script>
</body>
</html>
```

**Extracted Relationships:**
- `ACCESSES`: JavaScript accessing HTML elements by ID
- `MODIFIES`: JavaScript modifying CSS classes
- `USES`: CSS styling HTML elements

### Framework Relationships

```vue
<!-- Vue template -->
<template>
  <UserCard
    v-for="user in users"
    :key="user.id"
    :user="user"
    @edit="handleEdit"
  />
</template>

<script>
import UserCard from './UserCard.vue';

export default {
  components: {
    UserCard
  },

  methods: {
    handleEdit(user) {
      // Handle edit
    }
  }
};
</script>
```

**Extracted Relationships:**
- `IMPORTS`: Component imports
- `USES`: Template component usage
- `CALLS`: Event handler relationships

## Mixed-Language Processing

### Delegation Chain

The HTML parser uses a delegation pattern for embedded languages:

```typescript
// HTML parser automatically delegates to:
1. JavaScript parser for <script> content
2. CSS parser for <style> content
3. PHP parser for embedded PHP code
4. Vue parser for .vue files
```

### Language Boundary Detection

```html
<!-- HTML context -->
<div class="container">
    <style>
        /* CSS context starts here */
        .container {
            background: blue;
        }
        /* CSS context ends */
    </style>

    <script>
        // JavaScript context starts here
        console.log('Hello from JavaScript');

        function initApp() {
            document.querySelector('.container').style.color = 'red';
        }
        // JavaScript context ends
    </script>

    <?php
        // PHP context starts here
        echo "<p>Hello from PHP</p>";
        $users = getUserList();
        // PHP context ends
    ?>
</div>
```

**Language Boundaries:**
- HTML: Default context
- CSS: Between `<style>` and `</style>` tags
- JavaScript: Between `<script>` and `</script>` tags
- PHP: Between `<?php` and `?>` tags

## Framework-Specific Features

### Vue Single File Components

The parser recognizes Vue SFC structure:

```typescript
interface VueSFCResult {
  template: {
    components: IComponent[];
    directives: IComponent[];
    bindings: IRelationship[];
  };
  script: {
    components: IComponent[];
    props: IComponent[];
    methods: IComponent[];
    computed: IComponent[];
    lifecycle: IComponent[];
  };
  style: {
    rules: IComponent[];
    scoped: boolean;
  };
}
```

### Angular Templates

```html
<!-- Angular component template -->
<div class="user-list">
  <h2>{{ title }}</h2>

  <div *ngFor="let user of users; trackBy: trackUser"
       class="user-item"
       [class.selected]="selectedUser?.id === user.id"
       (click)="selectUser(user)">

    <img [src]="user.avatar" [alt]="user.name">
    <span>{{ user.name }}</span>

    <button (click)="editUser(user)"
            [disabled]="!canEdit">
      Edit
    </button>
  </div>

  <app-user-form
    *ngIf="showForm"
    [user]="selectedUser"
    (save)="handleSave($event)"
    (cancel)="showForm = false">
  </app-user-form>
</div>
```

**Angular-Specific Components:**
- Directives (`*ngFor`, `*ngIf`)
- Property bindings (`[property]`)
- Event bindings (`(event)`)
- Two-way bindings (`[(ngModel)]`)
- Component selectors (`app-user-form`)

## Performance Considerations

### Large HTML Files

```typescript
// For large HTML files, use Tree-sitter
const result = await factory.parseDocument('/large/page.html', undefined, {
  preferTreeSitter: true
});

// Or disable expensive delegations
const result = await factory.parseDocument('/complex/template.html', undefined, {
  parserOptions: {
    enableJavaScriptParsing: false,
    enableCssParsing: false
  }
});
```

### Selective Parsing

```typescript
// Parse only HTML structure
const htmlOnly = await factory.parseDocument('/template.html', undefined, {
  segmentationOnly: true
});

// Parse with specific delegations
const selective = await factory.parseDocument('/page.html', undefined, {
  parserOptions: {
    enableJavaScriptParsing: true,
    enableCssParsing: false,
    enablePhpParsing: false
  }
});
```

## Error Handling

### HTML Validation

```typescript
const result = await factory.parseDocument('/page.html', undefined, {
  parserOptions: {
    validateHtml: true,
    strictMode: true
  }
});

// Check for HTML validation errors
const htmlErrors = result.errors.filter(e => e.source === 'html');
htmlErrors.forEach(error => {
  console.error(`HTML error at line ${error.location?.startLine}: ${error.message}`);
});
```

### Mixed-Language Errors

```typescript
const result = await factory.parseDocument('/template.html');

// Separate errors by language
const htmlErrors = result.errors.filter(e => e.source === 'html');
const jsErrors = result.errors.filter(e => e.source === 'javascript');
const cssErrors = result.errors.filter(e => e.source === 'css');

console.log(`HTML errors: ${htmlErrors.length}`);
console.log(`JavaScript errors: ${jsErrors.length}`);
console.log(`CSS errors: ${cssErrors.length}`);
```

## Best Practices

### 1. Choose Appropriate Parsing Depth

```typescript
// For template analysis - enable all delegations
const fullAnalysis = await factory.parseDocument('/template.html', undefined, {
  parserOptions: {
    enableJavaScriptParsing: true,
    enableCssParsing: true,
    enablePhpParsing: true
  }
});

// For structure only - disable delegations
const structureOnly = await factory.parseDocument('/page.html', undefined, {
  parserOptions: {
    enableJavaScriptParsing: false,
    enableCssParsing: false
  }
});
```

### 2. Handle Framework-Specific Content

```typescript
// Vue SFC analysis
if (filePath.endsWith('.vue')) {
  const result = await factory.parseDocument(filePath, undefined, {
    parserOptions: {
      detectVue: true,
      enableJavaScriptParsing: true,
      enableCssParsing: true
    }
  });

  // Extract Vue-specific components
  const vueComponents = result.components.filter(c =>
    c.metadata?.framework === 'vue'
  );
}

// Angular template analysis
if (isAngularTemplate(filePath)) {
  const result = await factory.parseDocument(filePath, undefined, {
    parserOptions: {
      detectAngular: true
    }
  });

  // Extract Angular directives
  const directives = result.components.filter(c =>
    c.type === ComponentType.DECORATOR &&
    c.metadata?.framework === 'angular'
  );
}
```

### 3. Cross-Language Relationship Analysis

```typescript
const result = await factory.parseDocument('/mixed/template.html');

// Find JavaScript-HTML relationships
const jsHtmlRels = result.relationships.filter(rel => {
  const source = result.components.find(c => c.id === rel.sourceId);
  const target = result.components.find(c => c.id === rel.targetId);

  return (source?.language === 'javascript' && target?.language === 'html') ||
         (source?.language === 'html' && target?.language === 'javascript');
});

// Find CSS-HTML relationships
const cssHtmlRels = result.relationships.filter(rel => {
  const source = result.components.find(c => c.id === rel.sourceId);
  const target = result.components.find(c => c.id === rel.targetId);

  return (source?.language === 'css' && target?.language === 'html') ||
         (source?.language === 'html' && target?.language === 'css');
});
```

The HTML parser provides comprehensive analysis of modern web documents, with intelligent delegation to embedded languages and framework-specific pattern recognition. Its mixed-language capabilities make it ideal for analyzing complex web applications with multiple technologies.
