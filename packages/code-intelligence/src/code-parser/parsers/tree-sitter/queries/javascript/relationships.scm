;; JavaScript relationships queries for Tree-sitter
;; These queries extract relationships between JavaScript components

;; Function calls
(call_expression
  function: (identifier) @caller
  arguments: (arguments) @call_arguments) @function_call

;; Method calls
(call_expression
  function: (member_expression
    object: (identifier) @call_object
    property: (property_identifier) @called_method)
  arguments: (arguments) @method_arguments) @method_call

;; Constructor calls
(new_expression
  constructor: (identifier) @constructor
  arguments: (arguments)? @constructor_args) @constructor_call

;; Class inheritance
(class_declaration
  name: (identifier) @child_class
  superclass: (class_heritage
    (identifier) @parent_class)) @inheritance_relationship

;; Function parameter usage
(function_declaration
  name: (identifier) @function_name
  parameters: (formal_parameters
    (identifier) @parameter)) @function_parameters

;; Variable assignments
(assignment_expression
  left: (identifier) @assignment_target
  right: (_) @assignment_source) @assignment_relationship

;; Object property access
(member_expression
  object: (identifier) @object_name
  property: (property_identifier) @property_identifier) @property_access

;; Import relationships
(import_statement
  (import_clause
    (named_imports
      (import_specifier
        name: (identifier) @imported_name)))
  source: (string) @import_source) @import_relationship

;; Default import relationships
(import_statement
  (import_clause
    (identifier) @default_import)
  source: (string) @import_source) @default_import_relationship

;; Export relationships
(export_statement
  (export_clause
    (export_specifier
      name: (identifier) @exported_name))) @export_relationship

;; Variable declarations with function expressions
(variable_declaration
  (variable_declarator
    name: (identifier) @variable_name
    value: (function_expression) @function_value)) @function_assignment

;; Arrow function assignments
(variable_declaration
  (variable_declarator
    name: (identifier) @variable_name
    value: (arrow_function) @arrow_value)) @arrow_assignment

;; Object method definitions
(object
  (pair
    key: (property_identifier) @method_name
    value: (function_expression) @method_function)) @object_method

;; Class method contains relationships
(class_declaration
  name: (identifier) @class_name
  body: (class_body
    (method_definition
      name: (property_identifier) @method_name) @class_method)) @class_contains_method

;; Function contains variable declarations
(function_declaration
  name: (identifier) @function_name
  body: (statement_block
    (variable_declaration
      (variable_declarator
        name: (identifier) @local_variable)))) @function_contains_variable

;; Closure relationships
(function_expression
  body: (statement_block
    (expression_statement
      (assignment_expression
        left: (identifier) @closure_variable)))) @closure_relationship

;; JSX component usage
(jsx_element
  open_tag: (jsx_opening_element
    name: (jsx_identifier) @jsx_component)) @jsx_component_usage

;; JSX prop relationships
(jsx_opening_element
  name: (jsx_identifier) @jsx_element
  (jsx_attribute
    name: (property_identifier) @jsx_prop)) @jsx_prop_relationship

;; Event handler relationships
(jsx_attribute
  name: (property_identifier) @event_prop (#match? @event_prop "^on[A-Z]")
  value: (jsx_expression
    (identifier) @event_handler)) @event_handler_relationship

;; Template literal expressions
(template_literal
  (template_substitution
    (identifier) @template_variable)) @template_usage

;; Destructuring assignments
(assignment_expression
  left: (object_pattern
    (pair_pattern
      key: (property_identifier) @destructured_key
      value: (identifier) @destructured_variable))
  right: (identifier) @destructured_source) @destructuring_relationship

;; Array destructuring
(assignment_expression
  left: (array_pattern
    (identifier) @array_element)
  right: (identifier) @array_source) @array_destructuring

;; Async/await relationships
(call_expression
  function: (identifier) @awaited_function (#match? @awaited_function "await")) @await_relationship

;; Promise chains
(call_expression
  function: (member_expression
    object: (call_expression) @promise_source
    property: (property_identifier) @promise_method (#match? @promise_method "then|catch|finally"))) @promise_chain

;; Module re-exports
(export_statement
  (export_clause
    (export_specifier
      name: (identifier) @reexported_name))
  source: (string) @reexport_source) @reexport_relationship

;; Namespace access
(member_expression
  object: (identifier) @namespace
  property: (property_identifier) @namespace_member) @namespace_access

;; Type relationships (TypeScript)
(interface_declaration
  name: (type_identifier) @interface_name
  body: (object_type
    (property_signature
      name: (property_identifier) @interface_property))) @interface_property_relationship

;; Type implementations
(class_declaration
  name: (identifier) @implementing_class
  (class_heritage
    "implements" @implements_keyword
    (identifier) @implemented_interface)) @implementation_relationship

;; Generic type relationships
(type_parameters
  (type_parameter
    name: (type_identifier) @type_parameter)) @generic_parameter

;; Type annotations
(variable_declaration
  (variable_declarator
    name: (identifier) @typed_variable
    type: (type_annotation
      (_) @variable_type))) @type_annotation_relationship

;; Function return type relationships
(function_declaration
  name: (identifier) @typed_function
  return_type: (type_annotation
    (_) @return_type)) @return_type_relationship

;; Callback relationships
(call_expression
  function: (identifier) @callback_function
  arguments: (arguments
    (function_expression) @callback)) @callback_relationship

;; Higher-order function relationships
(call_expression
  function: (member_expression
    object: (identifier) @array_object
    property: (property_identifier) @array_method (#match? @array_method "map|filter|reduce|forEach"))
  arguments: (arguments
    (arrow_function) @iterator_function)) @higher_order_relationship

;; Dependency injection patterns
(call_expression
  function: (identifier) @injector_function
  arguments: (arguments
    (array
      (string) @dependency_name))) @dependency_injection

;; Module pattern relationships
(assignment_expression
  left: (member_expression
    object: (identifier) @module_exports (#eq? @module_exports "module")
    property: (property_identifier) @exports_property (#eq? @exports_property "exports"))
  right: (_) @exported_value) @commonjs_export