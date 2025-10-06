<?php
/**
 * PHP AST Helper for Felix
 * Uses nikic/PHP-Parser for proper AST parsing
 */

// Check if PHP-Parser is available via composer
$autoloadPaths = [
    __DIR__ . '/vendor/autoload.php',
    __DIR__ . '/../vendor/autoload.php',
    __DIR__ . '/../../vendor/autoload.php',
    __DIR__ . '/../../../vendor/autoload.php',
];

$composerFound = false;
foreach ($autoloadPaths as $autoload) {
    if (file_exists($autoload)) {
        require_once $autoload;
        $composerFound = true;
        break;
    }
}

use PhpParser\Error;
use PhpParser\ParserFactory;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitor\NameResolver;
use PhpParser\Node;

function parseFile($filePath) {
    global $composerFound;
    
    try {
        if (!file_exists($filePath)) {
            return ['success' => false, 'error' => 'File not found'];
        }

        $content = file_get_contents($filePath);
        
        // If PHP-Parser is available, use it
        if ($composerFound && class_exists('PhpParser\ParserFactory')) {
            return parseWithPhpParser($content, $filePath);
        } else {
            // Fallback to regex-based parsing
            return parseWithRegex($content);
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => get_class($e),
            'message' => $e->getMessage(),
            'line' => $e->getLine()
        ];
    }
}

function parseWithPhpParser($content, $filePath = '<memory>.php') {
    try {
        $parser = (new ParserFactory)->createForNewestSupportedVersion();
        $ast = $parser->parse($content);
        
        $data = [
            'namespaces' => [],
            'classes' => [],
            'interfaces' => [],
            'traits' => [],
            'functions' => [],
            'constants' => [],
            'variables' => [],
            'uses' => [],           // use statements with aliases
            'includes' => [],       // include/require statements
            'fqns' => []            // fully qualified names mapping
        ];
        
        $traverser = new NodeTraverser();
        $nameResolver = new NameResolver();
        $visitor = new ASTVisitor($data);
        $traverser->addVisitor($nameResolver);
        $traverser->addVisitor($visitor);
        $traverser->traverse($ast);
        
        return [
            'success' => true,
            'ast' => $data,
            'content' => $content,
            'filePath' => $filePath
        ];

    } catch (Error $error) {
        return [
            'success' => false,
            'error' => 'ParseError',
            'message' => $error->getMessage(),
            'line' => $error->getStartLine()
        ];
    }
}

function run_server() {
    global $composerFound;
    while (($line = fgets(STDIN)) !== false) {
        $line = trim($line);
        if ($line === '') {
            continue;
        }

        $payload = json_decode($line, true);
        if (!is_array($payload)) {
            echo json_encode(['success' => false, 'error' => 'InvalidJSON']) . "\n";
            continue;
        }

        $id = $payload['id'] ?? null;
        $command = $payload['command'] ?? '';
        $filePath = $payload['file_path'] ?? '<memory>.php';
        $content = $payload['content'] ?? '';

        if ($command === 'parse_content') {
            if ($composerFound && class_exists('PhpParser\\ParserFactory')) {
                $response = parseWithPhpParser($content, $filePath);
            } else {
                $response = parseWithRegex($content);
            }
        } elseif ($command === 'parse_file') {
            $response = parseFile($filePath);
        } elseif ($command === 'shutdown') {
            $response = ['success' => true, 'shutdown' => true];
            if ($id !== null) {
                $response['id'] = $id;
            }
            echo json_encode($response) . "\n";
            flush();
            break;
        } else {
            $response = ['success' => false, 'error' => 'UnknownCommand', 'message' => $command];
        }

        if ($id !== null) {
            $response['id'] = $id;
        }

        echo json_encode($response) . "\n";
        flush();
    }
}

if (class_exists('PhpParser\NodeVisitorAbstract')) {
    class ASTVisitor extends PhpParser\NodeVisitorAbstract {
    private $data;
    private $currentNamespace = '';
    private $currentClass = '';
    private $trackedVariables = [];
    private $useStatements = [];  // Track use statements in current file

    public function __construct(&$data) {
        $this->data = &$data;
    }
    
    public function enterNode(Node $node) {
        if ($node instanceof Node\Stmt\Namespace_) {
            $this->currentNamespace = $node->name ? $node->name->toString() : '';
            $this->data['namespaces'][] = [
                'nodeType' => 'Namespace',
                'name' => $this->currentNamespace,
                'startLine' => $node->getStartLine()
            ];
        } elseif ($node instanceof Node\Stmt\Use_) {
            // Handle use statements
            foreach ($node->uses as $use) {
                $name = $use->name->toString();
                $alias = $use->alias ? $use->alias->toString() : null;
                $finalName = $alias ?: basename(str_replace('\\', '/', $name));

                $useData = [
                    'nodeType' => 'Use',
                    'name' => $name,
                    'alias' => $alias,
                    'finalName' => $finalName,
                    'startLine' => $node->getStartLine()
                ];

                $this->data['uses'][] = $useData;
                $this->useStatements[$finalName] = $name;
            }
        } elseif ($node instanceof Node\Expr\Include_) {
            // Handle include/require/include_once/require_once
            $kindMap = [
                Node\Expr\Include_::TYPE_INCLUDE => 'include',
                Node\Expr\Include_::TYPE_INCLUDE_ONCE => 'include_once',
                Node\Expr\Include_::TYPE_REQUIRE => 'require',
                Node\Expr\Include_::TYPE_REQUIRE_ONCE => 'require_once',
            ];
            $kind = isset($kindMap[$node->type]) ? $kindMap[$node->type] : 'include';
            $path = null;
            if ($node->expr instanceof Node\Scalar\String_) {
                $path = $node->expr->value;
            }
            $this->data['includes'][] = [
                'nodeType' => 'Include',
                'kind' => $kind,
                'path' => $path,
                'startLine' => $node->getStartLine()
            ];
        } elseif ($node instanceof Node\Stmt\Class_) {
            $className = $node->name->toString();
            $this->currentClass = $className;

            // Build FQN for this class
            $classFqn = $this->currentNamespace ? $this->currentNamespace . '\\' . $className : $className;

            $methods = [];
            $properties = [];
            $constants = [];
            $traitUses = [];

            foreach ($node->stmts as $stmt) {
                if ($stmt instanceof Node\Stmt\ClassMethod) {
                    $methods[] = [
                        'name' => $stmt->name->toString(),
                        'visibility' => $this->getVisibility($stmt),
                        'isStatic' => $stmt->isStatic(),
                        'isAbstract' => $stmt->isAbstract(),
                        'isFinal' => $stmt->isFinal(),
                        'startLine' => $stmt->getStartLine(),
                        'params' => $this->extractParams($stmt->params)
                    ];
                } elseif ($stmt instanceof Node\Stmt\Property) {
                    foreach ($stmt->props as $prop) {
                        $properties[] = [
                            'name' => $prop->name->toString(),
                            'visibility' => $this->getVisibility($stmt),
                            'isStatic' => $stmt->isStatic(),
                            'startLine' => $stmt->getStartLine()
                        ];
                    }
                } elseif ($stmt instanceof Node\Stmt\ClassConst) {
                    foreach ($stmt->consts as $const) {
                        $constants[] = [
                            'name' => $const->name->toString(),
                            'visibility' => $this->getVisibility($stmt),
                            'startLine' => $stmt->getStartLine()
                        ];
                    }
                } elseif ($stmt instanceof Node\Stmt\TraitUse) {
                    foreach ($stmt->traits as $trait) {
                        // Check if NameResolver has resolved it
                        if (isset($trait->resolvedName)) {
                            $traitUses[] = $trait->resolvedName->toString();
                        } else {
                            $traitName = $trait->toString();
                            $traitFqn = $this->resolveClassName($traitName);
                            $traitUses[] = $traitFqn;
                        }
                    }
                }
            }

            // Resolve extends and implements to FQNs
            // NameResolver should have already resolved these, check for resolved attribute first
            $extendsFqn = null;
            if ($node->extends) {
                // Check if NameResolver has resolved it (resolvedName attribute)
                if (isset($node->extends->resolvedName)) {
                    $extendsFqn = $node->extends->resolvedName->toString();
                } else {
                    $extendsFqn = $this->resolveClassName($node->extends->toString());
                }
            }

            $implementsFqns = [];
            foreach ($node->implements as $impl) {
                // Check if NameResolver has resolved it
                if (isset($impl->resolvedName)) {
                    $implementsFqns[] = $impl->resolvedName->toString();
                } else {
                    $implementsFqns[] = $this->resolveClassName($impl->toString());
                }
            }

            $this->data['classes'][] = [
                'nodeType' => 'Class',
                'name' => $className,
                'fqn' => $classFqn,
                'namespace' => $this->currentNamespace,
                'startLine' => $node->getStartLine(),
                'endLine' => $node->getEndLine(),
                'extends' => $node->extends ? $node->extends->toString() : null,
                'extendsFqn' => $extendsFqn,
                'implements' => array_map(function($impl) { return $impl->toString(); }, $node->implements),
                'implementsFqns' => $implementsFqns,
                'uses' => $traitUses,
                'methods' => $methods,
                'properties' => $properties,
                'constants' => $constants,
                'docComment' => $node->getDocComment() ? $node->getDocComment()->getText() : null
            ];

            // Store FQN mapping
            $this->data['fqns'][$className] = $classFqn;
        } elseif ($node instanceof Node\Stmt\Interface_) {
            $interfaceName = $node->name->toString();
            $interfaceFqn = $this->currentNamespace ? $this->currentNamespace . '\\' . $interfaceName : $interfaceName;

            // Resolve extends for interfaces
            $extendsFqns = [];
            foreach ($node->extends as $extends) {
                $extendsFqns[] = $this->resolveClassName($extends->toString());
            }

            $this->data['interfaces'][] = [
                'nodeType' => 'Interface',
                'name' => $interfaceName,
                'fqn' => $interfaceFqn,
                'namespace' => $this->currentNamespace,
                'extends' => array_map(function($ext) { return $ext->toString(); }, $node->extends),
                'extendsFqns' => $extendsFqns,
                'startLine' => $node->getStartLine()
            ];

            // Store FQN mapping
            $this->data['fqns'][$interfaceName] = $interfaceFqn;
        } elseif ($node instanceof Node\Stmt\Trait_) {
            $traitName = $node->name->toString();
            $traitFqn = $this->currentNamespace ? $this->currentNamespace . '\\' . $traitName : $traitName;

            $this->data['traits'][] = [
                'nodeType' => 'Trait',
                'name' => $traitName,
                'fqn' => $traitFqn,
                'namespace' => $this->currentNamespace,
                'startLine' => $node->getStartLine()
            ];

            // Store FQN mapping
            $this->data['fqns'][$traitName] = $traitFqn;
        } elseif ($node instanceof Node\Stmt\Function_) {
            $functionName = $node->name->toString();
            $functionFqn = $this->currentNamespace ? $this->currentNamespace . '\\' . $functionName : $functionName;

            $this->data['functions'][] = [
                'nodeType' => 'Function',
                'name' => $functionName,
                'fqn' => $functionFqn,
                'namespace' => $this->currentNamespace,
                'startLine' => $node->getStartLine(),
                'endLine' => $node->getEndLine(),
                'params' => $this->extractParams($node->params),
                'docComment' => $node->getDocComment() ? $node->getDocComment()->getText() : null
            ];

            // Store FQN mapping
            $this->data['fqns'][$functionName] = $functionFqn;
        } elseif ($node instanceof Node\Stmt\Expression && $node->expr instanceof Node\Expr\Assign) {
            // Handle expression statements that contain assignments
            if ($node->expr->var instanceof Node\Expr\Variable &&
                is_string($node->expr->var->name) &&
                $this->currentClass === '') {  // Only track global variables (not in classes)
                $varName = $node->expr->var->name;
                // Track only the first occurrence of each variable
                if (!in_array($varName, $this->trackedVariables)) {
                    $this->trackedVariables[] = $varName;
                    $this->data['variables'][] = [
                        'nodeType' => 'Variable',
                        'name' => $varName,
                        'namespace' => $this->currentNamespace,
                        'startLine' => $node->getStartLine(),
                        'endLine' => $node->getEndLine()
                    ];
                }
            }
        }
    }
    
    public function leaveNode(Node $node) {
        if ($node instanceof Node\Stmt\Class_) {
            $this->currentClass = '';
        }
    }
    
    private function getVisibility($node) {
        if ($node->isPrivate()) return 'private';
        if ($node->isProtected()) return 'protected';
        return 'public';
    }
    
    private function extractParams($params) {
        $result = [];
        foreach ($params as $param) {
            $result[] = [
                'name' => $param->var->name,
                'type' => $this->typeToString($param->type),
                'defaultValue' => $param->default ? 'has_default' : null,
                'isOptional' => $param->default !== null
            ];
        }
        return $result;
    }

    private function typeToString($type) {
        if ($type === null) return null;
        // NullableType: ?T
        if ($type instanceof Node\NullableType) {
            return '?' . $this->typeToString($type->type);
        }
        // UnionType: T1|T2
        if ($type instanceof Node\UnionType) {
            $parts = array_map(function($t) { return $this->typeToString($t); }, $type->types);
            return implode('|', $parts);
        }
        // IntersectionType: T1&T2
        if ($type instanceof Node\IntersectionType) {
            $parts = array_map(function($t) { return $this->typeToString($t); }, $type->types);
            return implode('&', $parts);
        }
        // Identifier or Name
        if ($type instanceof Node\Identifier || $type instanceof Node\Name || $type instanceof Node\Name\FullyQualified) {
            return $type->toString();
        }
        // Fallback: attempt string cast
        try {
            return method_exists($type, '__toString') ? (string)$type : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Resolve a class name to its FQN using current namespace and use statements
     */
    private function resolveClassName($className) {
        // If already fully qualified (starts with \), return as-is
        if (strpos($className, '\\') === 0) {
            return ltrim($className, '\\');
        }

        // Check if it's in use statements (alias resolution)
        if (isset($this->useStatements[$className])) {
            return $this->useStatements[$className];
        }

        // If it contains a namespace separator, check if the first part is aliased
        if (strpos($className, '\\') !== false) {
            $parts = explode('\\', $className);
            $firstPart = $parts[0];
            if (isset($this->useStatements[$firstPart])) {
                // Replace first part with its full namespace
                $parts[0] = $this->useStatements[$firstPart];
                return implode('\\', $parts);
            }
        }

        // If the class name is already fully qualified (contains backslash), don't add namespace
        if (strpos($className, '\\') !== false) {
            return $className;
        }

        // If we're in a namespace and it's not a use statement, prefix with current namespace
        if ($this->currentNamespace) {
            return $this->currentNamespace . '\\' . $className;
        }

        // Global namespace
        return $className;
    }
}
}

function parseWithRegex($content) {
    // Simplified regex-based fallback
    $data = [
        'namespaces' => [],
        'classes' => [],
        'interfaces' => [],
        'traits' => [],
        'functions' => [],
        'constants' => [],
        'variables' => []
    ];
    
    $lines = explode("\n", $content);
    $currentNamespace = '';
    
    // Extract namespace
    if (preg_match('/namespace\s+([\w\\\\]+);/', $content, $matches)) {
        $currentNamespace = $matches[1];
        $data['namespaces'][] = [
            'nodeType' => 'Namespace',
            'name' => $currentNamespace,
            'startLine' => 1
        ];
    }
    
    // Extract classes with methods
    if (preg_match_all('/^(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*\{(.*?)^\}/ms', $content, $classMatches, PREG_SET_ORDER)) {
        foreach ($classMatches as $match) {
            $className = $match[1];
            $extends = isset($match[2]) ? $match[2] : null;
            $implements = isset($match[3]) ? array_map('trim', explode(',', $match[3])) : [];
            $classBody = $match[4];
            
            // Find class start line
            $startLine = 1;
            foreach ($lines as $lineNum => $line) {
                if (strpos($line, "class $className") !== false) {
                    $startLine = $lineNum + 1;
                    break;
                }
            }
            
            // Extract methods from class body
            $methods = [];
            if (preg_match_all('/(?:public|private|protected)?\s*(?:static\s+)?function\s+(\w+)\s*\([^)]*\)/m', $classBody, $methodMatches, PREG_SET_ORDER)) {
                foreach ($methodMatches as $methodMatch) {
                    $methods[] = [
                        'name' => $methodMatch[1],
                        'visibility' => 'public',
                        'isStatic' => strpos($methodMatch[0], 'static') !== false,
                        'isAbstract' => false,
                        'isFinal' => false,
                        'startLine' => $startLine + 1,
                        'params' => []
                    ];
                }
            }
            
            $data['classes'][] = [
                'nodeType' => 'Class',
                'name' => $className,
                'namespace' => $currentNamespace,
                'startLine' => $startLine,
                'endLine' => $startLine + 10,
                'extends' => $extends,
                'implements' => $implements,
                'methods' => $methods,
                'properties' => [],
                'constants' => [],
                'docComment' => null
            ];
        }
    }
    
    // Extract global functions
    if (preg_match_all('/^function\s+(\w+)\s*\([^)]*\)/m', $content, $funcMatches, PREG_SET_ORDER)) {
        foreach ($funcMatches as $match) {
            $data['functions'][] = [
                'nodeType' => 'Function',
                'name' => $match[1],
                'namespace' => $currentNamespace,
                'startLine' => 1,
                'endLine' => 1,
                'params' => [],
                'docComment' => null
            ];
        }
    }
    
    return [
        'success' => true,
        'ast' => $data,
        'content' => $content
    ];
}

if (in_array('--server', $argv, true)) {
    run_server();
    exit(0);
}

if ($argc < 2) {
    echo json_encode(['success' => false, 'error' => 'Usage: parser.php <file_path>']);
    exit(1);
}

if ($argv[1] === 'parse_content' && $argc >= 3) {
    $content = $argv[2];
    $filePath = $argv[3] ?? '<memory>.php';
    echo json_encode(parseWithPhpParser($content, $filePath));
    exit(0);
}

$filePath = $argv[1];
$result = parseFile($filePath);
echo json_encode($result);
