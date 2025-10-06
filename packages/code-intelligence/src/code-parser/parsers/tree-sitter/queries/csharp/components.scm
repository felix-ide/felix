;; C# components queries for Tree-sitter
;; These queries extract semantic components from C# source code

;; Compilation unit (root)
(compilation_unit) @compilation_unit.csharp

;; Namespace declarations
(namespace_declaration
  name: (qualified_name) @namespace_name
  body: (declaration_list) @namespace_body) @namespace.declaration

(namespace_declaration
  name: (identifier) @namespace_name
  body: (declaration_list) @namespace_body) @namespace.simple

;; File-scoped namespace (C# 10+)
(file_scoped_namespace_declaration
  name: (qualified_name) @file_namespace_name) @namespace.file_scoped

;; Using statements
(using_directive
  (qualified_name) @using_namespace) @using.namespace

(using_directive
  (name_equals (identifier) @using_alias)
  (qualified_name) @using_target) @using.alias

(using_directive
  (qualified_name) @global_using_namespace) @using.global

;; Class declarations
(class_declaration
  name: (identifier) @class_name
  type_parameters: (type_parameter_list)? @class_generics
  bases: (base_list)? @class_base_list
  body: (declaration_list) @class_body) @class.declaration

;; Interface declarations
(interface_declaration
  name: (identifier) @interface_name
  type_parameters: (type_parameter_list)? @interface_generics
  bases: (base_list)? @interface_base_list
  body: (declaration_list) @interface_body) @interface.declaration

;; Struct declarations
(struct_declaration
  name: (identifier) @struct_name
  type_parameters: (type_parameter_list)? @struct_generics
  bases: (base_list)? @struct_interfaces
  body: (declaration_list) @struct_body) @struct.declaration

;; Record declarations (C# 9+)
(record_declaration
  name: (identifier) @record_name
  type_parameters: (type_parameter_list)? @record_generics
  bases: (base_list)? @record_base_list
  body: (declaration_list)? @record_body) @record.declaration

;; Enum declarations
(enum_declaration
  name: (identifier) @enum_name
  bases: (base_list)? @enum_base_type
  body: (enum_member_declaration_list) @enum_body) @enum.declaration

;; Delegate declarations
(delegate_declaration
  type: (_) @delegate_return_type
  name: (identifier) @delegate_name
  parameters: (parameter_list) @delegate_parameters) @delegate.declaration

;; Method declarations
(method_declaration
  type: (_) @method_return_type
  name: (identifier) @method_name
  type_parameters: (type_parameter_list)? @method_generics
  parameters: (parameter_list) @method_parameters
  body: (_)? @method_body) @method.declaration

;; Constructor declarations
(constructor_declaration
  name: (identifier) @constructor_name
  parameters: (parameter_list) @constructor_parameters
  initializer: (constructor_initializer)? @constructor_initializer
  body: (block) @constructor_body) @constructor.declaration

;; Destructor declarations
(destructor_declaration
  name: (identifier) @destructor_name
  body: (block) @destructor_body) @destructor.declaration

;; Operator declarations
(operator_declaration
  type: (_) @operator_return_type
  parameters: (parameter_list) @operator_parameters
  body: (_)? @operator_body) @operator.declaration

;; Conversion operator declarations
(conversion_operator_declaration
  type: (_) @conversion_target_type
  parameters: (parameter_list) @conversion_parameters
  body: (_)? @conversion_body) @operator.conversion

;; Property declarations
(property_declaration
  type: (_) @property_type
  name: (identifier) @property_name
  accessor_list: (accessor_list) @property_accessors) @property.declaration

;; Indexer declarations
(indexer_declaration
  type: (_) @indexer_type
  parameters: (bracket_parameter_list) @indexer_parameters
  accessor_list: (accessor_list) @indexer_accessors) @indexer.declaration

;; Event declarations
(event_declaration
  type: (_) @event_type
  name: (identifier) @event_name
  accessor_list: (accessor_list)? @event_accessors) @event.declaration

;; Event field declarations
(event_field_declaration
  type: (_) @event_field_type
  (variable_declarator
    name: (identifier) @event_field_name)) @event.field

;; Field declarations
(field_declaration
  type: (_) @field_type
  (variable_declarator
    name: (identifier) @field_name
    initializer: (equals_value_clause)? @field_initializer)) @field.declaration

;; Constant declarations
(constant_declaration
  type: (_) @constant_type
  (variable_declarator
    name: (identifier) @constant_name
    initializer: (equals_value_clause) @constant_value)) @field.constant

;; Local variable declarations
(local_declaration_statement
  type: (_) @local_type
  (variable_declarator
    name: (identifier) @local_name
    initializer: (equals_value_clause)? @local_initializer)) @variable.local

;; Parameter declarations
(parameter
  type: (_) @parameter_type
  name: (identifier) @parameter_name
  default_value: (equals_value_clause)? @parameter_default) @parameter.declaration

;; Generic type parameters
(type_parameter
  name: (identifier) @type_parameter_name
  constraints: (type_parameter_constraints_clause)? @type_parameter_constraints) @parameter.type

;; Accessor declarations (getters/setters)
(accessor_declaration
  body: (_)? @accessor_body) @accessor.declaration

;; Lambda expressions
(lambda_expression
  parameters: (_)? @lambda_parameters
  body: (_) @lambda_body) @function.lambda

;; Anonymous method expressions
(anonymous_method_expression
  parameters: (parameter_list)? @anonymous_parameters
  body: (block) @anonymous_body) @function.anonymous

;; Local function declarations
(local_function_statement
  type: (_) @local_function_return_type
  name: (identifier) @local_function_name
  parameters: (parameter_list) @local_function_parameters
  body: (_) @local_function_body) @function.local

;; Nested types
(class_declaration
  body: (declaration_list
    (class_declaration
      name: (identifier) @nested_class_name))) @class.nested

(class_declaration
  body: (declaration_list
    (interface_declaration
      name: (identifier) @nested_interface_name))) @interface.nested

(class_declaration
  body: (declaration_list
    (struct_declaration
      name: (identifier) @nested_struct_name))) @struct.nested

(class_declaration
  body: (declaration_list
    (enum_declaration
      name: (identifier) @nested_enum_name))) @enum.nested

;; Enum members
(enum_member_declaration
  name: (identifier) @enum_member_name
  value: (equals_value_clause)? @enum_member_value) @enum.member

;; Generic constraints
(type_parameter_constraints_clause
  name: (identifier) @constrained_type_parameter
  constraints: (type_parameter_constraint_list) @type_constraints) @constraint.generic

;; Attributes
(attribute_list
  (attribute
    name: (_) @attribute_name
    arguments: (attribute_argument_list)? @attribute_arguments)) @attribute.declaration

;; Expression bodied members
(property_declaration
  type: (_) @expression_property_type
  name: (identifier) @expression_property_name
  body: (arrow_expression_clause) @expression_property_body) @property.expression

(method_declaration
  type: (_) @expression_method_return_type
  name: (identifier) @expression_method_name
  parameters: (parameter_list) @expression_method_parameters
  body: (arrow_expression_clause) @expression_method_body) @method.expression

;; Auto-implemented properties
(property_declaration
  type: (_) @auto_property_type
  name: (identifier) @auto_property_name
  accessor_list: (accessor_list
    (accessor_declaration) @auto_getter
    (accessor_declaration) @auto_setter)) @property.auto

;; Primary constructor parameters (Records and C# 12+)
(record_declaration
  parameters: (parameter_list) @record_primary_parameters) @record.primary_constructor

(class_declaration
  parameters: (parameter_list) @class_primary_parameters) @class.primary_constructor

;; Pattern matching constructs
(switch_expression
  (switch_expression_arm
    pattern: (_) @switch_pattern
    expression: (_) @switch_expression)) @expression.switch

;; Query expressions (LINQ)
(query_expression
  body: (query_body) @query_body) @expression.query

;; Object and collection initializers
(object_creation_expression
  type: (_) @object_type
  initializer: (initializer_expression) @object_initializer) @expression.object_creation

;; Anonymous types
(anonymous_object_creation_expression
  initializer: (anonymous_object_initializer) @anonymous_initializer) @expression.anonymous_object

;; Tuple expressions
(tuple_expression
  (argument
    expression: (_) @tuple_element)) @expression.tuple

;; Deconstruction
(declaration_pattern
  type: (_) @deconstruction_type
  designation: (tuple_pattern) @deconstruction_pattern) @pattern.deconstruction

;; Using declarations (C# 8+)
(using_statement
  resource: (local_declaration_statement) @using_resource) @statement.using_declaration

;; Top-level statements (C# 9+)
(compilation_unit
  (global_statement) @global_statement) @statement.top_level

;; Nullable reference types
(nullable_type
  underlying_type: (_) @nullable_underlying_type) @type.nullable

;; Range expressions (C# 8+)
(range_expression
  left: (_)? @range_start
  right: (_)? @range_end) @expression.range

;; Index expressions (C# 8+)
(prefix_unary_expression
  operator: "^" @index_from_end_operator
  operand: (_) @index_from_end_value) @expression.index_from_end

;; With expressions (C# 9+)
(with_expression
  expression: (_) @with_target
  initializer: (with_initializer_expression) @with_initializer) @expression.with