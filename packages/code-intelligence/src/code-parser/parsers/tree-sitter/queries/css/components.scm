;; CSS components queries for Tree-sitter
;; These queries extract semantic components from CSS stylesheets

;; Stylesheet root
(stylesheet) @stylesheet.css

;; CSS rules
(rule_set
  (selectors) @selectors
  (block) @declarations) @rule.style

;; At-rules
(at_rule
  (at_keyword) @at_keyword
  (block)? @at_block) @rule.at

;; Media queries
(media_statement
  (keyword) @media_keyword
  (media_query_list) @media_conditions
  (block) @media_block) @rule.media

;; Keyframes
(keyframes_statement
  (keyword) @keyframes_keyword
  (keyframes_name) @animation_name
  (keyframe_block_list) @keyframe_blocks) @rule.keyframes

;; Individual keyframe
(keyframe_block
  (keyframe_selector) @keyframe_selector
  (block) @keyframe_declarations) @keyframe

;; Import statements
(import_statement
  (keyword) @import_keyword
  (string_value)? @import_url
  (call_expression)? @import_call) @rule.import

;; CSS custom properties (variables)
(declaration
  (property_name) @property_name (#match? @property_name "^--")
  (property_value) @property_value) @declaration.variable

;; Regular declarations
(declaration
  (property_name) @property_name
  (property_value) @property_value) @declaration.property

;; Selectors by type
(selectors
  (selector
    (tag_name) @tag_selector)) @selector.tag

(selectors
  (selector
    (class_selector (class_name) @class_name))) @selector.class

(selectors
  (selector
    (id_selector (id_name) @id_name))) @selector.id

(selectors
  (selector
    (attribute_selector
      (attribute_name) @attr_name
      (attribute_value)? @attr_value))) @selector.attribute

(selectors
  (selector
    (pseudo_class_selector (class_name) @pseudo_class))) @selector.pseudo_class

(selectors
  (selector
    (pseudo_element_selector (tag_name) @pseudo_element))) @selector.pseudo_element

;; Descendant combinator
(selectors
  (selector
    (descendant_selector
      (tag_name) @ancestor
      (tag_name) @descendant))) @selector.descendant

;; Child combinator
(selectors
  (selector
    (child_selector
      (tag_name) @parent
      (tag_name) @child))) @selector.child

;; Adjacent sibling combinator
(selectors
  (selector
    (adjacent_sibling_selector
      (tag_name) @first_sibling
      (tag_name) @adjacent_sibling))) @selector.adjacent

;; General sibling combinator
(selectors
  (selector
    (general_sibling_selector
      (tag_name) @first_sibling
      (tag_name) @general_sibling))) @selector.sibling

;; CSS functions in property values
(call_expression
  (function_name) @function_name
  (arguments) @function_args) @function.css

;; Color values
(color_value) @value.color

;; Dimension values
(integer_value) @value.integer
(float_value) @value.float
(dimension_value) @value.dimension

;; String values
(string_value) @value.string

;; URL values
(call_expression
  (function_name) @url_function (#eq? @url_function "url")
  (arguments
    (string_value) @url_string)) @value.url

;; CSS Grid and Flexbox properties
(declaration
  (property_name) @grid_property (#match? @grid_property "^(grid|place|justify|align)")
  (property_value) @grid_value) @declaration.grid

(declaration
  (property_name) @flex_property (#match? @flex_property "^(flex|justify-content|align)")
  (property_value) @flex_value) @declaration.flex

;; Animation properties
(declaration
  (property_name) @anim_property (#match? @anim_property "^(animation|transition)")
  (property_value) @anim_value) @declaration.animation

;; Font properties
(declaration
  (property_name) @font_property (#match? @font_property "^(font|text)")
  (property_value) @font_value) @declaration.font

;; Box model properties
(declaration
  (property_name) @box_property (#match? @box_property "^(margin|padding|border|outline)")
  (property_value) @box_value) @declaration.box

;; Position properties
(declaration
  (property_name) @position_property (#match? @position_property "^(position|top|right|bottom|left|z-index)")
  (property_value) @position_value) @declaration.position

;; Display properties
(declaration
  (property_name) @display_property (#match? @display_property "^(display|visibility|opacity)")
  (property_value) @display_value) @declaration.display

;; Background properties
(declaration
  (property_name) @bg_property (#match? @bg_property "^background")
  (property_value) @bg_value) @declaration.background