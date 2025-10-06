;; CSS relationships queries for Tree-sitter
;; These queries extract relationships between CSS components

;; Stylesheet contains rules
(stylesheet
  (rule_set) @rule) @stylesheet

;; Rule contains selectors and declarations
(rule_set
  (selectors
    (selector) @selector)
  (block
    (declaration) @declaration)) @rule

;; Media query contains rules
(media_statement
  (media_query_list) @media_query
  (block
    (rule_set) @nested_rule)) @media_statement

;; Keyframes contains keyframe blocks
(keyframes_statement
  (keyframes_name) @animation_name
  (keyframe_block_list
    (keyframe_block) @keyframe)) @keyframes

;; Selector relationships - descendant
(selector
  (descendant_selector
    (tag_name) @ancestor
    (tag_name) @descendant)) @descendant_relationship

;; Selector relationships - child
(selector
  (child_selector
    (tag_name) @parent
    (tag_name) @child)) @child_relationship

;; Selector relationships - adjacent sibling
(selector
  (adjacent_sibling_selector
    (tag_name) @first_element
    (tag_name) @adjacent_element)) @adjacent_relationship

;; Selector relationships - general sibling
(selector
  (general_sibling_selector
    (tag_name) @first_element
    (tag_name) @sibling_element)) @sibling_relationship

;; Class selector targeting
(selector
  (class_selector
    (class_name) @class_target)) @class_targeting

;; ID selector targeting
(selector
  (id_selector
    (id_name) @id_target)) @id_targeting

;; Attribute selector targeting
(selector
  (attribute_selector
    (attribute_name) @attr_name
    (attribute_value)? @attr_value)) @attribute_targeting

;; Pseudo-class relationships
(selector
  (pseudo_class_selector
    (class_name) @pseudo_class)) @pseudo_class_targeting

;; Pseudo-element relationships
(selector
  (pseudo_element_selector
    (tag_name) @pseudo_element)) @pseudo_element_targeting

;; CSS variable usage
(declaration
  (property_name) @property
  (property_value
    (call_expression
      (function_name) @var_function (#eq? @var_function "var")
      (arguments
        (plain_value) @variable_name)))) @variable_usage

;; CSS variable definition
(declaration
  (property_name) @variable_name (#match? @variable_name "^--")
  (property_value) @variable_value) @variable_definition

;; Animation name references
(declaration
  (property_name) @anim_property (#match? @anim_property "^animation")
  (property_value
    (plain_value) @animation_reference)) @animation_usage

;; Font family references
(declaration
  (property_name) @font_property (#match? @font_property "font-family")
  (property_value
    (string_value) @font_name)) @font_usage

;; URL references in CSS
(call_expression
  (function_name) @url_function (#eq? @url_function "url")
  (arguments
    (string_value) @url_reference)) @url_usage

;; Import relationships
(import_statement
  (string_value) @imported_file) @import_relationship

;; Calc function relationships
(call_expression
  (function_name) @calc_function (#eq? @calc_function "calc")
  (arguments) @calc_expression) @calc_usage

;; CSS Grid area relationships
(declaration
  (property_name) @grid_property (#match? @grid_property "grid-area|grid-template-areas")
  (property_value
    (string_value) @grid_area_name)) @grid_area_definition

(declaration
  (property_name) @grid_property (#eq? @grid_property "grid-area")
  (property_value
    (plain_value) @grid_area_reference)) @grid_area_usage

;; CSS custom property inheritance
(declaration
  (property_name) @inheriting_property
  (property_value
    (plain_value) @inherit_value (#match? @inherit_value "inherit|initial|unset"))) @property_inheritance

;; Selector specificity relationships
(selector
  (tag_name) @element_selector) @low_specificity

(selector
  (class_selector) @class_selector) @medium_specificity

(selector
  (id_selector) @id_selector) @high_specificity

;; Nested selector relationships (for CSS preprocessors)
(rule_set
  (selectors) @parent_selector
  (block
    (rule_set
      (selectors) @nested_selector))) @nested_rule_relationship

;; Container query relationships
(at_rule
  (at_keyword) @container_keyword (#eq? @container_keyword "@container")
  (query) @container_query
  (block
    (rule_set) @contained_rule)) @container_relationship

;; Supports query relationships
(at_rule
  (at_keyword) @supports_keyword (#eq? @supports_keyword "@supports")
  (query) @supports_condition
  (block
    (rule_set) @supported_rule)) @supports_relationship

;; Layer relationships
(at_rule
  (at_keyword) @layer_keyword (#eq? @layer_keyword "@layer")
  (identifier) @layer_name
  (block
    (rule_set) @layer_rule)) @layer_relationship