import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import eslintReactNative from 'eslint-plugin-react-native';
import typescriptEslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';

export default typescriptEslint.config(
  {
    files: ['*.js', '*.jsx', '*.ts', '*.tsx'],
  },
  {
    ignores: [
      '.yarn/*',
      'dist/*',
      'node_modules/*',
      'example/*',
      'jest.config.js',
      'eslint.config.mjs',
      'babel.config.js',
      'prepare.js',
      'bump.js'
    ],
  },
  js.configs.recommended,
  ...typescriptEslint.configs.recommendedTypeChecked,
  {
    rules: {
      '@typescript-eslin/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  // react-native
  {
    name: 'eslint-plugin-react-native',
    plugins: {
      'react-native': fixupPluginRules({
        rules: eslintReactNative.rules,
      }),
    },
    rules: {
      ...eslintReactNative.configs.all.rules,
      'react-native/sort-styles': 'off',
      'react-native/no-inline-styles': 'warn',
    },
  },
  {
    plugins: {
      prettier: prettierPlugin,
    },
  },
  {
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',
        project: './tsconfig.json',
      },
    },
  }
);
