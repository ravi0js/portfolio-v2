// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  { ignores: ['dist/', '.astro/', '.netlify/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  { ...reactHooks.configs.flat.recommended, files: ['**/*.{ts,tsx}'] },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
