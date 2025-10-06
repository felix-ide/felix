#!/usr/bin/env python3
"""
Python AST helper for The Felix backend.
Parses Python files and returns AST as JSON.
"""

import ast
import json
import sys
import traceback

def node_to_dict(node):
    """Convert AST node to dictionary"""
    if not isinstance(node, ast.AST):
        return node
    
    result = {'_type': node.__class__.__name__}
    
    # Add location information
    if hasattr(node, 'lineno'):
        result['lineno'] = node.lineno
    if hasattr(node, 'col_offset'):
        result['col_offset'] = node.col_offset
    if hasattr(node, 'end_lineno'):
        result['end_lineno'] = node.end_lineno
    if hasattr(node, 'end_col_offset'):
        result['end_col_offset'] = node.end_col_offset
    
    # Add node-specific fields
    for field, value in ast.iter_fields(node):
        if isinstance(value, list):
            result[field] = [node_to_dict(item) for item in value]
        elif isinstance(value, ast.AST):
            result[field] = node_to_dict(value)
        else:
            result[field] = value
    
    return result

def parse_file(file_path):
    """Parse Python file and return AST as JSON"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse the AST
        tree = ast.parse(content, filename=file_path)
        
        # Convert to dictionary
        ast_dict = node_to_dict(tree)
        
        return {
            'success': True,
            'ast': ast_dict,
            'content': content
        }
    
    except SyntaxError as e:
        return {
            'success': False,
            'error': 'SyntaxError',
            'message': str(e),
            'lineno': e.lineno,
            'offset': e.offset
        }
    except Exception as e:
        return {
            'success': False,
            'error': type(e).__name__,
            'message': str(e),
            'traceback': traceback.format_exc()
        }

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(json.dumps({'success': False, 'error': 'Usage: python_ast_helper.py <file_path>'}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = parse_file(file_path)
    print(json.dumps(result))
