;; HTML components queries for Tree-sitter
;; These queries extract semantic components from HTML documents

;; Document root
(document) @document.html

;; Main content sections
(element
  (start_tag
    (tag_name) @tag_name (#match? @tag_name "^(html|head|body|main|header|footer|nav|section|article|aside|div|span)$"))
  (text)? @content
  (end_tag)?) @element.section

;; Form elements
(element
  (start_tag
    (tag_name) @tag_name (#match? @tag_name "^(form|input|button|select|textarea|label|fieldset|legend)$"))
  (text)? @content
  (end_tag)?) @element.form

;; Media elements
(element
  (start_tag
    (tag_name) @tag_name (#match? @tag_name "^(img|video|audio|picture|source|iframe|embed|object)$"))
  (text)? @content
  (end_tag)?) @element.media

;; List elements
(element
  (start_tag
    (tag_name) @tag_name (#match? @tag_name "^(ul|ol|li|dl|dt|dd)$"))
  (text)? @content
  (end_tag)?) @element.list

;; Table elements
(element
  (start_tag
    (tag_name) @tag_name (#match? @tag_name "^(table|thead|tbody|tfoot|tr|th|td|caption|colgroup|col)$"))
  (text)? @content
  (end_tag)?) @element.table

;; Heading elements
(element
  (start_tag
    (tag_name) @tag_name (#match? @tag_name "^(h[1-6])$"))
  (text)? @content
  (end_tag)?) @element.heading

;; Text content elements
(element
  (start_tag
    (tag_name) @tag_name (#match? @tag_name "^(p|a|strong|em|code|pre|blockquote|cite|abbr|time)$"))
  (text)? @content
  (end_tag)?) @element.text

;; Script elements (for injection detection)
(element
  (start_tag
    (tag_name) @tag_name (#eq? @tag_name "script"))
  (text)? @script_content
  (end_tag)?) @element.script

;; Style elements (for injection detection)
(element
  (start_tag
    (tag_name) @tag_name (#eq? @tag_name "style"))
  (text)? @style_content
  (end_tag)?) @element.style

;; Link elements with external resources
(element
  (start_tag
    (tag_name) @tag_name (#eq? @tag_name "link")
    (attribute
      (attribute_name) @attr_name (#eq? @attr_name "href")
      (quoted_attribute_value (attribute_value) @href_value)))
  (end_tag)?) @element.link

;; Meta elements
(element
  (start_tag
    (tag_name) @tag_name (#eq? @tag_name "meta"))
  (end_tag)?) @element.meta

;; Attributes with id or class for component identification
(start_tag
  (attribute
    (attribute_name) @attr_name (#match? @attr_name "^(id|class)$")
    (quoted_attribute_value (attribute_value) @attr_value))) @element.identifier

;; Data attributes for component state
(start_tag
  (attribute
    (attribute_name) @attr_name (#match? @attr_name "^data-")
    (quoted_attribute_value (attribute_value) @attr_value))) @element.data

;; Custom elements (web components)
(element
  (start_tag
    (tag_name) @tag_name (#match? @tag_name "^[a-z]+-"))
  (text)? @content
  (end_tag)?) @element.custom

;; Template elements
(element
  (start_tag
    (tag_name) @tag_name (#eq? @tag_name "template"))
  (text)? @content
  (end_tag)?) @element.template

;; SVG elements
(element
  (start_tag
    (tag_name) @tag_name (#match? @tag_name "^(svg|g|path|circle|rect|line|polygon|text)$"))
  (text)? @content
  (end_tag)?) @element.svg