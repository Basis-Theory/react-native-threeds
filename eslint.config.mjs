import reactNativeConfig from '@react-native/eslint-config';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  {
    files: ['*.js', '*.jsx', '*.ts', '*.tsx'],
  },
  {
    ignores: ['.yarn/*', 'lib/*', 'node_modules/*', 'example/*'],
  },
  {
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    rules: {
      'prettier/prettier': [
        'error',
        {
          arrowParens: 'avoid',
          quoteProps: 'consistent',
          singleQuote: true,
          trailingComma: 'all',
          tabWidth: 2,
          bracketSameLine: true,
          bracketSpacing: false,
        },
      ],
    },
    plugins: {
      prettier: prettierPlugin,
    },
  },
];
