import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

const reactPlugin = react.default ?? react;
const reactHooksPlugin = reactHooks.default ?? reactHooks;
const jsxA11yPlugin = jsxA11y.default ?? jsxA11y;

const reactHooksRecommendedRules = reactHooksPlugin.configs.recommended?.rules ?? {};
const jsxA11yRecommendedRules = jsxA11yPlugin.configs.recommended?.rules ?? {};

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/build/**', '**/node_modules/**', 'eslint.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...(reactPlugin.configs.flat?.recommended ?? {}),
    settings: {
      react: { version: '18.3' },
    },
  },
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    settings: {
      react: { version: '18.3' },
    },
    rules: {
      ...reactHooksRecommendedRules,
      ...jsxA11yRecommendedRules,
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'import/no-unresolved': 'off', // Отключено для TypeScript, так как пути с .js разрешаются во время компиляции
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    rules: {
      'import/no-unresolved': ['error', { ignore: ['typescript-eslint'] }],
    },
  },
  prettier,
);
