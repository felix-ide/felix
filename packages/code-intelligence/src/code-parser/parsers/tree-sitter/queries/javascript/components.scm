;; JavaScript components queries for Tree-sitter
;; These queries extract semantic components from JavaScript/TypeScript code

;; Program root
(program) @program.javascript

;; Function declarations
(function_declaration
  name: (identifier) @function_name
  parameters: (formal_parameters) @function_params
  body: (statement_block) @function_body) @function.declaration

;; Function expressions
(function_expression
  name: (identifier)? @function_name
  parameters: (formal_parameters) @function_params
  body: (statement_block) @function_body) @function.expression

;; Arrow functions
(arrow_function
  parameters: (formal_parameters) @arrow_params
  body: (_) @arrow_body) @function.arrow

(arrow_function
  parameter: (identifier) @arrow_param
  body: (_) @arrow_body) @function.arrow_single

;; Method definitions
(method_definition
  name: (property_identifier) @method_name
  parameters: (formal_parameters) @method_params
  body: (statement_block) @method_body) @method.definition

;; Class declarations
(class_declaration
  name: (identifier) @class_name
  superclass: (class_heritage)? @class_superclass
  body: (class_body) @class_body) @class.declaration

;; Class expressions
(class_expression
  name: (identifier)? @class_name
  superclass: (class_heritage)? @class_superclass
  body: (class_body) @class_body) @class.expression

;; Constructor methods
(method_definition
  name: (property_identifier) @constructor_name (#eq? @constructor_name "constructor")
  parameters: (formal_parameters) @constructor_params
  body: (statement_block) @constructor_body) @method.constructor

;; Getter methods
(method_definition
  "get" @getter_keyword
  name: (property_identifier) @getter_name
  body: (statement_block) @getter_body) @method.getter

;; Setter methods
(method_definition
  "set" @setter_keyword
  name: (property_identifier) @setter_name
  parameters: (formal_parameters) @setter_params
  body: (statement_block) @setter_body) @method.setter

;; Variable declarations
(variable_declaration
  (variable_declarator
    name: (identifier) @variable_name
    value: (_)? @variable_value)) @variable.declaration

;; Const declarations
(lexical_declaration
  "const" @const_keyword
  (variable_declarator
    name: (identifier) @const_name
    value: (_) @const_value)) @variable.const

;; Let declarations
(lexical_declaration
  "let" @let_keyword
  (variable_declarator
    name: (identifier) @let_name
    value: (_)? @let_value)) @variable.let

;; Object expressions
(object
  (pair
    key: (property_identifier) @object_key
    value: (_) @object_value)) @object.literal

;; Object patterns (destructuring)
(object_pattern
  (pair_pattern
    key: (property_identifier) @pattern_key
    value: (identifier) @pattern_value)) @pattern.object

;; Array patterns (destructuring)
(array_pattern
  (identifier) @array_element) @pattern.array

;; Import declarations
(import_statement
  source: (string) @import_source) @import.statement

;; Named imports
(import_statement
  (import_clause
    (named_imports
      (import_specifier
        name: (identifier) @import_name
        alias: (identifier)? @import_alias)))) @import.named

;; Default imports
(import_statement
  (import_clause
    (identifier) @default_import)) @import.default

;; Namespace imports
(import_statement
  (import_clause
    (namespace_import
      (identifier) @namespace_name))) @import.namespace

;; Export declarations
(export_statement
  declaration: (_) @export_declaration) @export.declaration

;; Named exports
(export_statement
  (export_clause
    (export_specifier
      name: (identifier) @export_name
      alias: (identifier)? @export_alias))) @export.named

;; Default exports
(export_statement
  "default" @default_keyword
  value: (_) @default_export) @export.default

;; Re-exports
(export_statement
  source: (string) @reexport_source) @export.reexport

;; Interface declarations (TypeScript)
(interface_declaration
  name: (type_identifier) @interface_name
  body: (object_type) @interface_body) @interface.declaration

;; Type alias declarations (TypeScript)
(type_alias_declaration
  name: (type_identifier) @type_name
  value: (_) @type_value) @type.alias

;; Enum declarations (TypeScript)
(enum_declaration
  name: (identifier) @enum_name
  body: (enum_body) @enum_body) @enum.declaration

;; Namespace declarations (TypeScript)
(module_declaration
  name: (identifier) @namespace_name
  body: (statement_block) @namespace_body) @namespace.declaration

;; JSX elements
(jsx_element
  open_tag: (jsx_opening_element
    name: (jsx_identifier) @jsx_tag_name)
  children: (_)* @jsx_children
  close_tag: (jsx_closing_element)?) @jsx.element

;; JSX self-closing elements
(jsx_self_closing_element
  name: (jsx_identifier) @jsx_self_tag_name
  (jsx_attribute)* @jsx_attributes) @jsx.self_closing

;; JSX fragments
(jsx_fragment
  children: (_)* @fragment_children) @jsx.fragment

;; Function calls
(call_expression
  function: (identifier) @call_function
  arguments: (arguments) @call_arguments) @call.expression

;; Member calls
(call_expression
  function: (member_expression
    object: (_) @call_object
    property: (property_identifier) @call_method)
  arguments: (arguments) @call_arguments) @call.member

;; New expressions
(new_expression
  constructor: (identifier) @constructor_name
  arguments: (arguments)? @constructor_arguments) @expression.new

;; Assignment expressions
(assignment_expression
  left: (identifier) @assignment_target
  right: (_) @assignment_value) @expression.assignment

;; Binary expressions
(binary_expression
  left: (_) @binary_left
  operator: (_) @binary_operator
  right: (_) @binary_right) @expression.binary

;; Unary expressions
(unary_expression
  operator: (_) @unary_operator
  argument: (_) @unary_argument) @expression.unary

;; Conditional expressions
(conditional_expression
  condition: (_) @condition
  consequence: (_) @consequence
  alternative: (_) @alternative) @expression.conditional

;; Template literals
(template_literal
  (template_string) @template_string
  (template_substitution)* @template_substitution) @literal.template

;; Regular expressions
(regex) @literal.regex

;; Comments
(comment) @comment

;; Try-catch statements
(try_statement
  body: (statement_block) @try_body
  handler: (catch_clause)? @catch_handler
  finalizer: (finally_clause)? @finally_block) @statement.try

;; For loops
(for_statement
  initializer: (_)? @for_init
  condition: (_)? @for_condition
  increment: (_)? @for_increment
  body: (_) @for_body) @statement.for

;; For-in loops
(for_in_statement
  left: (_) @for_in_left
  right: (_) @for_in_right
  body: (_) @for_in_body) @statement.for_in

;; For-of loops
(for_of_statement
  left: (_) @for_of_left
  right: (_) @for_of_right
  body: (_) @for_of_body) @statement.for_of

;; While loops
(while_statement
  condition: (_) @while_condition
  body: (_) @while_body) @statement.while

;; If statements
(if_statement
  condition: (_) @if_condition
  consequence: (_) @if_consequence
  alternative: (_)? @if_alternative) @statement.if

;; Switch statements
(switch_statement
  discriminant: (_) @switch_discriminant
  body: (switch_body
    (switch_case)* @switch_cases)) @statement.switch