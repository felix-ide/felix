#!/usr/bin/env python3
"""
Felix Python AST Helper
Provides AST parsing, import extraction, and module resolution via CLI or persistent server mode.
"""

import ast
import importlib
import json
import sys
import traceback


def node_to_dict(node):
    if not isinstance(node, ast.AST):
        return node

    result = {"_type": node.__class__.__name__}

    if hasattr(node, "lineno"):
        result["lineno"] = node.lineno
    if hasattr(node, "col_offset"):
        result["col_offset"] = node.col_offset
    if hasattr(node, "end_lineno"):
        result["end_lineno"] = node.end_lineno
    if hasattr(node, "end_col_offset"):
        result["end_col_offset"] = node.end_col_offset

    for field, value in ast.iter_fields(node):
        if isinstance(value, list):
            result[field] = [node_to_dict(item) for item in value]
        elif isinstance(value, ast.AST):
            result[field] = node_to_dict(value)
        else:
            result[field] = value

    return result


def extract_imports_from_ast(node):
    imports = []

    class ImportVisitor(ast.NodeVisitor):
        def visit_Import(self, n):
            names = [{"name": alias.name, "asname": alias.asname} for alias in n.names]
            imports.append({
                "type": "Import",
                "line": getattr(n, "lineno", 0),
                "column": getattr(n, "col_offset", 0),
                "names": names
            })

        def visit_ImportFrom(self, n):
            names = [{"name": alias.name, "asname": alias.asname} for alias in n.names]
            imports.append({
                "type": "ImportFrom",
                "module": getattr(n, "module", None),
                "level": getattr(n, "level", 0),
                "line": getattr(n, "lineno", 0),
                "column": getattr(n, "col_offset", 0),
                "names": names
            })

    ImportVisitor().visit(node)
    return imports


def parse_content(content, file_path):
    try:
        tree = ast.parse(content, filename=file_path)
        return {
            "success": True,
            "ast": node_to_dict(tree)
        }
    except SyntaxError as e:
        return {
            "success": False,
            "error": "SyntaxError",
            "message": str(e),
            "lineno": e.lineno,
            "offset": e.offset
        }
    except Exception as e:
        return {
            "success": False,
            "error": type(e).__name__,
            "message": str(e),
            "traceback": traceback.format_exc()
        }


def parse_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as handle:
            content = handle.read()
        result = parse_content(content, file_path)
        if result.get("success"):
            result["content"] = content
        return result
    except OSError as e:
        return {
            "success": False,
            "error": type(e).__name__,
            "message": str(e)
        }


def extract_imports(file_path, content=None):
    try:
        if content is None:
            with open(file_path, 'r', encoding='utf-8') as handle:
                content = handle.read()
        tree = ast.parse(content, filename=file_path)
        imports = extract_imports_from_ast(tree)
        return {
            "success": True,
            "imports": imports
        }
    except SyntaxError as e:
        return {
            "success": False,
            "error": "SyntaxError",
            "message": str(e),
            "lineno": e.lineno,
            "offset": e.offset
        }
    except Exception as e:
        return {
            "success": False,
            "error": type(e).__name__,
            "message": str(e),
            "traceback": traceback.format_exc()
        }


def resolve_module(module_name):
    try:
        module = importlib.import_module(module_name)
        module_file = getattr(module, "__file__", None)
        if module_file is None:
            return {"success": True, "resolved_path": "builtin"}
        return {"success": True, "resolved_path": module_file}
    except ModuleNotFoundError as e:
        return {"success": False, "error": "ModuleNotFound", "message": str(e)}
    except Exception as e:
        return {
            "success": False,
            "error": type(e).__name__,
            "message": str(e),
            "traceback": traceback.format_exc()
        }


def run_server():
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            message = json.loads(line)
        except json.JSONDecodeError:
            sys.stdout.write(json.dumps({"success": False, "error": "InvalidJSON"}) + "\n")
            sys.stdout.flush()
            continue

        request_id = message.get("id")
        command = message.get("command")
        file_path = message.get("file_path", "<memory>")
        content = message.get("content")
        module_name = message.get("module_name")

        if command == "parse_content":
            response = parse_content(content or "", file_path)
        elif command == "parse_file":
            response = parse_file(file_path)
        elif command == "extract_imports":
            response = extract_imports(file_path, content)
        elif command == "resolve_module":
            if not module_name:
                response = {"success": False, "error": "MissingModule", "message": "module_name required"}
            else:
                response = resolve_module(module_name)
        elif command == "shutdown":
            response = {"success": True, "shutdown": True}
            if request_id is not None:
                response["id"] = request_id
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
            break
        else:
            response = {"success": False, "error": "UnknownCommand", "message": command}

        if request_id is not None:
            response["id"] = request_id

        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


def main():
    if '--server' in sys.argv:
        run_server()
        return

    if len(sys.argv) == 2:
        result = parse_file(sys.argv[1])
        print(json.dumps(result))
        return

    if len(sys.argv) == 3 and sys.argv[1] == 'extract_imports':
        result = extract_imports(sys.argv[2])
        print(json.dumps(result))
        return

    if len(sys.argv) == 3 and sys.argv[1] == 'resolve_module':
        result = resolve_module(sys.argv[2])
        print(json.dumps(result))
        return

    print(json.dumps({
        "success": False,
        "error": "Usage",
        "message": "python_ast_helper.py --server | <file> | extract_imports <file> | resolve_module <name>"
    }))


if __name__ == '__main__':
    main()
