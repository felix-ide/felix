// Test file for JavaScript module patterns and imports/exports

// Import variations (these would work in actual module environment)
// import defaultImport from './classes.js';
// import { namedImport } from './functions.js';
// import * as namespace from './variables.js';
// import defaultExport, { named1, named2 } from './mixed.js';
// import { original as renamed } from './aliases.js';

// CommonJS imports
const classes = require('./classes');
const { BasicClass, StaticClass } = require('./classes');
const functions = require('./functions');

// Dynamic imports (returns Promise)
async function dynamicImports() {
  const module1 = await import('./classes.js');
  const module2 = await import('./functions.js');
  return { module1, module2 };
}

// Conditional imports
function conditionalImport(condition) {
  if (condition) {
    return require('./classes');
  } else {
    return require('./functions');
  }
}

// Try-catch imports
let optionalModule;
try {
  optionalModule = require('optional-module');
} catch (e) {
  console.log('Optional module not available');
}

// Module pattern (closure-based)
const ModulePattern = (function() {
  // Private variables
  let privateVar = 'private';
  const privateConst = 42;
  
  // Private functions
  function privateFunction() {
    return privateVar;
  }
  
  // Public API
  return {
    publicMethod() {
      return privateFunction();
    },
    
    getPrivateConst() {
      return privateConst;
    },
    
    setPrivateVar(value) {
      privateVar = value;
    }
  };
})();

// Revealing module pattern
const RevealingModule = (function() {
  let counter = 0;
  
  function increment() {
    counter++;
  }
  
  function decrement() {
    counter--;
  }
  
  function getCount() {
    return counter;
  }
  
  // Reveal public methods
  return {
    up: increment,
    down: decrement,
    count: getCount
  };
})();

// Namespace pattern
const MyNamespace = MyNamespace || {};

MyNamespace.SubModule = {
  property: 'value',
  method() {
    return 'namespace method';
  }
};

MyNamespace.AnotherModule = (function() {
  return {
    feature() {
      return 'another feature';
    }
  };
})();

// AMD-style module (for RequireJS compatibility)
if (typeof define === 'function' && define.amd) {
  define(['dependency1', 'dependency2'], function(dep1, dep2) {
    return {
      moduleMethod() {
        return 'AMD module';
      }
    };
  });
}

// UMD pattern (Universal Module Definition)
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(['exports'], factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    // CommonJS
    factory(exports);
  } else {
    // Browser globals
    factory((root.myModule = {}));
  }
}(typeof self !== 'undefined' ? self : this, function(exports) {
  exports.universalMethod = function() {
    return 'works everywhere';
  };
}));

// ES6 export variations
export default class DefaultExport {
  constructor() {
    this.type = 'default';
  }
}

export class NamedExport1 {
  constructor() {
    this.type = 'named1';
  }
}

export class NamedExport2 {
  constructor() {
    this.type = 'named2';
  }
}

// Export existing bindings
const existingVar = 'existing';
const existingFunc = () => 'function';

export { existingVar, existingFunc };

// Export with renaming
const internalName = 'internal';
export { internalName as externalName };

// Re-export from another module
export { BasicClass as ReexportedClass } from './classes';
export * from './functions';
export * as functionsNamespace from './functions';

// Export list at bottom
const export1 = 'export1';
const export2 = 'export2';
const export3 = 'export3';

export {
  export1,
  export2,
  export3,
  ModulePattern,
  RevealingModule,
  MyNamespace
};

// CommonJS exports
module.exports = {
  ModulePattern,
  RevealingModule,
  MyNamespace,
  dynamicImports,
  conditionalImport
};

// Mixed CommonJS and ES6 (compatibility layer)
module.exports.default = DefaultExport;
module.exports.NamedExport1 = NamedExport1;
module.exports.NamedExport2 = NamedExport2;