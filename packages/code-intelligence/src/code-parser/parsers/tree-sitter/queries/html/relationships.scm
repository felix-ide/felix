;; HTML relationships queries for Tree-sitter
;; These queries extract relationships between HTML elements

;; Parent-child containment relationships
(element
  (start_tag (tag_name) @parent_tag)
  (element
    (start_tag (tag_name) @child_tag)) @child_element) @parent_element

;; Form control relationships
(element
  (start_tag
    (tag_name) @tag_name (#eq? @tag_name "label")
    (attribute
      (attribute_name) @attr_name (#eq? @attr_name "for")
      (quoted_attribute_value (attribute_value) @target_id))))
@label_element

;; Reference relationships via id/href
(element
  (start_tag
    (tag_name) @tag_name
    (attribute
      (attribute_name) @attr_name (#match? @attr_name "^(href|src|action|formaction)$")
      (quoted_attribute_value (attribute_value) @target_url))))
@referencing_element

;; Form submission relationships
(element
  (start_tag
    (tag_name) @tag_name (#match? @tag_name "^(input|button)$")
    (attribute
      (attribute_name) @attr_name (#eq? @attr_name "form")
      (quoted_attribute_value (attribute_value) @form_id))))
@form_control

;; Media source relationships
(element
  (start_tag
    (tag_name) @tag_name (#match? @tag_name "^(img|video|audio|source)$")
    (attribute
      (attribute_name) @attr_name (#match? @attr_name "^(src|srcset)$")
      (quoted_attribute_value (attribute_value) @media_src))))
@media_element

;; List item relationships
(element
  (start_tag (tag_name) @list_tag (#match? @list_tag "^(ul|ol|dl)$"))
  (element
    (start_tag (tag_name) @item_tag (#match? @item_tag "^(li|dt|dd)$")) @item_element))
@list_element

;; Table structure relationships
(element
  (start_tag (tag_name) @table_tag (#eq? @table_tag "table"))
  (element
    (start_tag (tag_name) @section_tag (#match? @section_tag "^(thead|tbody|tfoot)$"))
    (element
      (start_tag (tag_name) @row_tag (#eq? @row_tag "tr"))
      (element
        (start_tag (tag_name) @cell_tag (#match? @cell_tag "^(th|td)$")) @cell_element) @row_element) @section_element)) @table_element

;; Navigation relationships
(element
  (start_tag (tag_name) @nav_tag (#eq? @nav_tag "nav"))
  (element
    (start_tag (tag_name) @link_tag (#eq? @link_tag "a")
      (attribute
        (attribute_name) @href_attr (#eq? @href_attr "href")
        (quoted_attribute_value (attribute_value) @nav_target))) @nav_link)) @nav_element

;; Heading hierarchy relationships
(element
  (start_tag (tag_name) @heading_tag (#match? @heading_tag "^h[1-6]$"))
  (text) @heading_text) @heading_element

;; Custom element relationships (web components)
(element
  (start_tag (tag_name) @custom_tag (#match? @custom_tag "^[a-z]+-"))
  (element
    (start_tag (tag_name) @child_tag)) @child_element) @custom_element

;; Script/style injection points
(element
  (start_tag (tag_name) @script_tag (#eq? @script_tag "script")
    (attribute
      (attribute_name) @type_attr (#eq? @type_attr "type")
      (quoted_attribute_value (attribute_value) @script_type)))
  (text) @script_content) @script_element

(element
  (start_tag (tag_name) @style_tag (#eq? @style_tag "style")
    (attribute
      (attribute_name) @type_attr (#eq? @type_attr "type")
      (quoted_attribute_value (attribute_value) @style_type)))
  (text) @style_content) @style_element

;; ARIA relationships
(element
  (start_tag
    (tag_name) @tag_name
    (attribute
      (attribute_name) @aria_attr (#match? @aria_attr "^aria-(describedby|labelledby|controls|owns|flowto)$")
      (quoted_attribute_value (attribute_value) @aria_target))))
@aria_element

;; Data relationships
(element
  (start_tag
    (tag_name) @tag_name
    (attribute
      (attribute_name) @data_attr (#match? @data_attr "^data-")
      (quoted_attribute_value (attribute_value) @data_value))))
@data_element