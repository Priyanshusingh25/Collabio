/**
 * ESLint flat config (ESLint 9).
 *
 * Two scopes:
 *  1. Server — CommonJS/Node, no JSX.
 *  2. Client — ESM + JSX (espree parses JSX natively, so no extra plugin is
 *     required for syntax-level linting).
 *
 * `no-unused-vars` is a warning; CI runs `--quiet`, so only genuine errors
 * (undefined identifiers, unreachable code, duplicate keys…) fail the build.
 */
const BROWSER_GLOBALS = {
  window: 'readonly', document: 'readonly', navigator: 'readonly',
  localStorage: 'readonly', sessionStorage: 'readonly',
  fetch: 'readonly', WebSocket: 'readonly', AbortController: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly',
  setInterval: 'readonly', clearInterval: 'readonly',
  requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly',
  console: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
  FormData: 'readonly', Blob: 'readonly', File: 'readonly', FileReader: 'readonly',
  CustomEvent: 'readonly', Event: 'readonly', KeyboardEvent: 'readonly',
  HTMLElement: 'readonly', Node: 'readonly', performance: 'readonly',
  crypto: 'readonly', structuredClone: 'readonly', alert: 'readonly',
  matchMedia: 'readonly', getComputedStyle: 'readonly', IntersectionObserver: 'readonly',
  MutationObserver: 'readonly', ResizeObserver: 'readonly', TextEncoder: 'readonly',
};

const CORE_RULES = {
  'no-undef': 'error',
  'no-unreachable': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-const-assign': 'error',
  'no-redeclare': 'error',
  'no-self-assign': 'error',
  'no-unsafe-negation': 'error',
  'no-cond-assign': 'warn',
  'valid-typeof': 'error',
  'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none' }],
};

module.exports = [
  { ignores: ['**/node_modules/**', '**/dist/**', 'server/db/**', '**/*.min.js'] },
  {
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...BROWSER_GLOBALS, process: 'readonly', __dirname: 'readonly', __filename: 'readonly', module: 'readonly', require: 'readonly', Buffer: 'readonly', global: 'readonly' },
    },
    rules: CORE_RULES,
  },
  {
    files: ['server/tests/**/*.js'],
    languageOptions: {
      globals: { process: 'readonly', __dirname: 'readonly', console: 'readonly', fetch: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', Buffer: 'readonly', WebSocket: 'readonly' },
    },
  },
  {
    files: ['client/src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: BROWSER_GLOBALS,
    },
    rules: CORE_RULES,
  },
  {
    files: ['*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { module: 'readonly', require: 'readonly', process: 'readonly', console: 'readonly', __dirname: 'readonly' } },
    rules: CORE_RULES,
  },
];
