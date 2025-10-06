;; C# relationships queries for Tree-sitter
;; These queries extract relationships between C# components

;; Class inheritance
(class_declaration
  name: (identifier) @child_class
  bases: (base_list
    (_) @parent_class)) @inheritance_relationship

;; Interface implementation
(class_declaration
  name: (identifier) @implementing_class
  bases: (base_list
    (_) @implemented_interface)) @implementation_relationship

(struct_declaration
  name: (identifier) @implementing_struct
  bases: (base_list
    (_) @implemented_interface)) @struct_implementation_relationship

;; Interface inheritance
(interface_declaration
  name: (identifier) @child_interface
  bases: (base_list
    (_) @parent_interface)) @interface_inheritance_relationship

;; Method calls
(invocation_expression
  expression: (identifier) @called_method
  arguments: (argument_list) @method_arguments) @method_call

;; Member access method calls
(invocation_expression
  expression: (member_access_expression
    expression: (_) @call_target
    name: (identifier) @called_method)
  arguments: (argument_list) @method_arguments) @member_method_call

;; Static method calls
(invocation_expression
  expression: (member_access_expression
    expression: (identifier) @static_class
    name: (identifier) @static_method)) @static_method_call

;; Constructor calls
(object_creation_expression
  type: (_) @constructor_type
  arguments: (argument_list)? @constructor_arguments) @constructor_call

;; Base constructor calls
(constructor_initializer
  "base" @base_keyword
  arguments: (argument_list) @base_constructor_arguments) @base_constructor_call

;; This constructor calls
(constructor_initializer
  "this" @this_keyword
  arguments: (argument_list) @this_constructor_arguments) @this_constructor_call

;; Field access
(member_access_expression
  expression: (_) @field_owner
  name: (identifier) @accessed_field) @field_access

;; Property access
(member_access_expression
  expression: (_) @property_owner
  name: (identifier) @accessed_property) @property_access

;; Event subscription
(assignment_expression
  left: (member_access_expression
    expression: (_) @event_source
    name: (identifier) @event_name)
  operator: "+="
  right: (_) @event_handler) @event_subscription

;; Event unsubscription
(assignment_expression
  left: (member_access_expression
    expression: (_) @event_source
    name: (identifier) @event_name)
  operator: "-="
  right: (_) @event_handler) @event_unsubscription

;; Delegate assignment
(assignment_expression
  left: (identifier) @delegate_variable
  right: (_) @delegate_target) @delegate_assignment

;; Using directives (namespace imports)
(using_directive
  (qualified_name) @using_namespace) @namespace_import

;; Using alias directives
(using_directive
  (name_equals (identifier) @alias_name)
  (qualified_name) @alias_target) @namespace_alias

;; Generic type constraints
(type_parameter_constraints_clause
  name: (identifier) @constrained_type
  constraints: (type_parameter_constraint_list
    (_) @constraint_type)) @generic_constraint

;; Type parameter usage
(generic_name
  name: (identifier) @generic_type
  type_argument_list: (type_argument_list
    (_) @type_argument)) @generic_usage

;; Attribute application
(attribute_list
  (attribute
    name: (_) @attribute_type)) @attribute_application

;; Variable assignments
(assignment_expression
  left: (identifier) @assignment_target
  right: (_) @assignment_source) @variable_assignment

;; Field assignments
(assignment_expression
  left: (member_access_expression
    expression: (_) @field_object
    name: (identifier) @assigned_field)
  right: (_) @field_value) @field_assignment

;; Property assignments
(assignment_expression
  left: (member_access_expression
    expression: (_) @property_object
    name: (identifier) @assigned_property)
  right: (_) @property_value) @property_assignment

;; Array/indexer access
(element_access_expression
  expression: (_) @indexed_object
  argument_list: (bracket_argument_list) @index_arguments) @indexer_access

;; Cast expressions
(cast_expression
  type: (_) @cast_target_type
  expression: (_) @cast_expression) @type_cast

;; As expressions
(binary_expression
  left: (_) @as_expression
  operator: "as"
  right: (_) @as_target_type) @type_as_cast

;; Is expressions
(binary_expression
  left: (_) @is_expression
  operator: "is"
  right: (_) @is_pattern) @type_check

;; Typeof expressions
(typeof_expression
  type: (_) @typeof_target) @type_reflection

;; Lambda expressions captured variables
(lambda_expression
  body: (block
    (local_declaration_statement
      (variable_declarator
        name: (identifier) @lambda_local_variable)))) @lambda_closure

;; Exception handling
(try_statement
  body: (block) @try_body
  (catch_clause
    type: (_)? @catch_exception_type
    body: (block) @catch_body)*
  (finally_clause
    body: (block) @finally_body)?) @exception_handling

;; Throw statements
(throw_statement
  expression: (_)? @thrown_exception) @exception_throw

;; Async/await relationships
(await_expression
  expression: (_) @awaited_expression) @async_await

;; Yield statements
(yield_statement
  expression: (_)? @yielded_value) @yield_return

;; Lock statements
(lock_statement
  expression: (_) @lock_object
  body: (_) @lock_body) @synchronization_lock

;; Using statements
(using_statement
  resource: (_) @using_resource
  body: (_) @using_body) @resource_management

;; Foreach loops
(foreach_statement
  type: (_) @foreach_element_type
  name: (identifier) @foreach_variable
  expression: (_) @foreach_collection
  body: (_) @foreach_body) @collection_iteration

;; LINQ query relationships
(query_expression
  from_clause: (from_clause
    type: (_)? @query_element_type
    name: (identifier) @query_variable
    expression: (_) @query_source)) @linq_query

;; LINQ method chaining
(invocation_expression
  expression: (member_access_expression
    expression: (_) @linq_source
    name: (identifier) @linq_method (#match? @linq_method "Where|Select|SelectMany|OrderBy|GroupBy|Join|Any|All|First|Last|Count|Sum|Average|Min|Max"))
  arguments: (argument_list) @linq_arguments) @linq_method_chain

;; Pattern matching in switch expressions
(switch_expression
  expression: (_) @switch_target
  (switch_expression_arm
    pattern: (_) @switch_pattern
    expression: (_) @switch_result)) @pattern_match

;; Null coalescing
(binary_expression
  left: (_) @null_coalescing_left
  operator: "??"
  right: (_) @null_coalescing_right) @null_coalescing_relationship

;; Null conditional access
(conditional_access_expression
  expression: (_) @null_conditional_target
  access: (_) @null_conditional_access) @null_conditional_relationship

;; String interpolation
(interpolated_string_expression
  (interpolation
    expression: (_) @interpolated_expression)) @string_interpolation

;; Tuple deconstruction
(assignment_expression
  left: (tuple_expression) @tuple_deconstruction_target
  right: (_) @tuple_deconstruction_source) @tuple_deconstruction

;; Record with expressions
(with_expression
  expression: (_) @with_source
  initializer: (with_initializer_expression) @with_modifications) @record_with_relationship

;; Primary constructor parameter usage
(class_declaration
  parameters: (parameter_list
    (parameter
      name: (identifier) @primary_constructor_parameter))
  body: (declaration_list
    (field_declaration
      (variable_declarator
        name: (identifier) @field_from_parameter)))) @primary_constructor_field

;; Partial class relationships
(class_declaration
  modifiers: (modifier_list
    "partial" @partial_modifier)
  name: (identifier) @partial_class_name) @partial_class_declaration

;; Extension method relationships
(method_declaration
  modifiers: (modifier_list
    "static" @static_modifier)
  parameters: (parameter_list
    (parameter
      modifiers: (modifier_list
        "this" @this_modifier)
      type: (_) @extended_type
      name: (identifier) @this_parameter))) @extension_method

;; Operator overloading
(operator_declaration
  type: (_) @operator_return_type
  parameters: (parameter_list
    (parameter
      type: (_) @operator_parameter_type))) @operator_overload

;; Implicit/explicit operators
(conversion_operator_declaration
  modifiers: (modifier_list
    ("implicit" @implicit_modifier | "explicit" @explicit_modifier))
  type: (_) @conversion_target_type
  parameters: (parameter_list
    (parameter
      type: (_) @conversion_source_type))) @conversion_operator

;; Namespace contains relationships
(namespace_declaration
  name: (_) @namespace_name
  body: (declaration_list
    (class_declaration
      name: (identifier) @namespace_class))) @namespace_contains_class

(namespace_declaration
  name: (_) @namespace_name
  body: (declaration_list
    (interface_declaration
      name: (identifier) @namespace_interface))) @namespace_contains_interface

;; Class contains relationships
(class_declaration
  name: (identifier) @containing_class
  body: (declaration_list
    (method_declaration
      name: (identifier) @contained_method))) @class_contains_method

(class_declaration
  name: (identifier) @containing_class
  body: (declaration_list
    (property_declaration
      name: (identifier) @contained_property))) @class_contains_property

(class_declaration
  name: (identifier) @containing_class
  body: (declaration_list
    (field_declaration
      (variable_declarator
        name: (identifier) @contained_field)))) @class_contains_field

;; Generic type definitions and usages
(class_declaration
  name: (identifier) @generic_class
  type_parameters: (type_parameter_list
    (type_parameter
      name: (identifier) @class_type_parameter))) @generic_class_definition

(method_declaration
  name: (identifier) @generic_method
  type_parameters: (type_parameter_list
    (type_parameter
      name: (identifier) @method_type_parameter))) @generic_method_definition

;; Assembly attribute relationships
(global_attribute_list
  (attribute
    name: (_) @assembly_attribute)) @assembly_attribute_application