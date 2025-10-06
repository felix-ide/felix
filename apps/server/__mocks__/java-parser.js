/**
 * Mock for java-parser module to prevent Jest errors
 * The real java-parser uses ES modules which Jest has trouble with
 */

module.exports = {
  parse: function(javaCode) {
    // Return a minimal AST structure that won't break tests
    return {
      name: 'compilationUnit',
      children: {
        ordinaryCompilationUnit: []
      }
    };
  }
};