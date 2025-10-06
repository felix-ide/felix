import { registerLanguage, clearLanguageDefinitions } from '../core/LanguageRegistry.js';
import { JavaScriptParser } from '../parsers/JavaScriptParser.js';
import { PythonParser } from '../parsers/PythonParser.js';
import { PhpParser } from '../parsers/PhpParser.js';
import { JavaParser } from '../parsers/JavaParser.js';
import { MarkdownParser } from '../parsers/MarkdownParser.js';
import { JsonParser } from '../parsers/JsonParser.js';
import { HtmlParser } from '../parsers/HtmlParser.js';
import { CssParser } from '../parsers/CssParser.js';
import { DocumentationParser } from '../parsers/DocumentationParser.js';
import { RoslynEnhancedCSharpParser } from '../parsers/RoslynEnhancedCSharpParser.js';
import { TreeSitterHtmlParser } from '../parsers/tree-sitter/TreeSitterHtmlParser.js';
import { TreeSitterCssParser } from '../parsers/tree-sitter/TreeSitterCssParser.js';
import { TreeSitterJavaScriptParser } from '../parsers/tree-sitter/TreeSitterJavaScriptParser.js';
import { TreeSitterCSharpParser } from '../parsers/tree-sitter/TreeSitterCSharpParser.js';
import { TreeSitterPythonParser } from '../parsers/tree-sitter/TreeSitterPythonParser.js';
import { TreeSitterPhpParser } from '../parsers/tree-sitter/TreeSitterPhpParser.js';
import { TreeSitterJavaParser } from '../parsers/tree-sitter/TreeSitterJavaParser.js';
import type { ILanguageParser } from '../interfaces/ILanguageParser.js';

export interface ParserRegistrationOptions {
  verboseLogging?: boolean;
}

const JAVASCRIPT_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
const JAVASCRIPT_FILENAMES = [
  'package.json',
  'tsconfig.json',
  'babel.config.js',
  'webpack.config.js',
  'rollup.config.js',
  'vite.config.js',
  'jest.config.js'
];
const JAVASCRIPT_SHEBANGS = ['node', 'nodejs', 'bun', 'deno'];

const PYTHON_EXTENSIONS = ['.py', '.pyw', '.pyi'];
const PYTHON_SHEBANGS = ['python', 'python3', 'python2'];

const PHP_EXTENSIONS = ['.php', '.phtml', '.php3', '.php4', '.php5', '.phar'];
const PHP_SHEBANGS = ['php'];

const JAVA_EXTENSIONS = ['.java'];
const JAVA_SHEBANGS = ['java'];

const CSHARP_EXTENSIONS = ['.cs', '.csx'];
const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd', '.mkdn', '.mdx'];
const MARKDOWN_FILENAMES = ['readme.md', 'changelog.md', 'contributing.md', 'license.md'];

const DOCUMENTATION_EXTENSIONS = ['.rst', '.txt'];
const DOCUMENTATION_FILENAMES = [
  'readme',
  'readme.txt',
  'readme.rst',
  'changelog',
  'changelog.txt',
  'changelog.rst',
  'license.txt',
  'license.rst',
  'install.txt',
  'install.rst',
  'authors.txt',
  'authors.rst',
  'news.txt',
  'news.rst'
];

const HTML_EXTENSIONS = ['.html', '.htm', '.xhtml', '.vue'];
const CSS_EXTENSIONS = ['.css', '.scss', '.sass', '.less'];
const JSON_EXTENSIONS = ['.json', '.webmanifest'];

function createFallbackList(...factories: Array<() => ILanguageParser>): ILanguageParser[] {
  return factories.map(factory => factory());
}

export function registerDefaultParsers(options: ParserRegistrationOptions = {}): void {
  const { verboseLogging = false } = options;
  clearLanguageDefinitions();

  registerLanguage({
    id: 'javascript',
    displayName: 'JavaScript / TypeScript',
    extensions: JAVASCRIPT_EXTENSIONS,
    filenames: JAVASCRIPT_FILENAMES,
    shebangs: JAVASCRIPT_SHEBANGS,
    aliases: ['typescript'],
    createPrimary: () => new JavaScriptParser(),
    createFallbacks: () => createFallbackList(() => new TreeSitterJavaScriptParser())
  });

  registerLanguage({
    id: 'python',
    displayName: 'Python',
    extensions: PYTHON_EXTENSIONS,
    shebangs: PYTHON_SHEBANGS,
    createPrimary: () => new PythonParser(),
    createFallbacks: () => createFallbackList(() => new TreeSitterPythonParser())
  });

  registerLanguage({
    id: 'php',
    displayName: 'PHP',
    extensions: PHP_EXTENSIONS,
    shebangs: PHP_SHEBANGS,
    createPrimary: () => new PhpParser(),
    createFallbacks: () => createFallbackList(() => new TreeSitterPhpParser())
  });

  registerLanguage({
    id: 'java',
    displayName: 'Java',
    extensions: JAVA_EXTENSIONS,
    shebangs: JAVA_SHEBANGS,
    createPrimary: () => new JavaParser(),
    createFallbacks: () => createFallbackList(() => new TreeSitterJavaParser())
  });

  registerLanguage({
    id: 'markdown',
    displayName: 'Markdown',
    extensions: MARKDOWN_EXTENSIONS,
    filenames: MARKDOWN_FILENAMES,
    createPrimary: () => new MarkdownParser()
  });

  registerLanguage({
    id: 'documentation',
    displayName: 'Documentation',
    extensions: DOCUMENTATION_EXTENSIONS,
    filenames: DOCUMENTATION_FILENAMES,
    createPrimary: () => new DocumentationParser()
  });

  registerLanguage({
    id: 'json',
    displayName: 'JSON',
    extensions: JSON_EXTENSIONS,
    createPrimary: () => new JsonParser()
  });

  registerLanguage({
    id: 'html',
    displayName: 'HTML',
    extensions: HTML_EXTENSIONS,
    createPrimary: () => new HtmlParser(),
    createFallbacks: () => createFallbackList(() => new TreeSitterHtmlParser())
  });

  registerLanguage({
    id: 'css',
    displayName: 'CSS',
    extensions: CSS_EXTENSIONS,
    createPrimary: () => new CssParser(),
    createFallbacks: () => createFallbackList(() => new TreeSitterCssParser())
  });

  const treeSitterCSharpFactory = () => new TreeSitterCSharpParser();

  registerLanguage({
    id: 'csharp',
    displayName: 'C#',
    extensions: CSHARP_EXTENSIONS,
    createPrimary: () => new RoslynEnhancedCSharpParser(),
    createFallbacks: () => createFallbackList(treeSitterCSharpFactory)
  });

  if (verboseLogging) {
    console.warn('Registered Roslyn-based C# parser with Tree-sitter fallback');
  }
}
