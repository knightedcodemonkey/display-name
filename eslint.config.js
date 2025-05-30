import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import nodePlugin from 'eslint-plugin-n'
import react from 'eslint-plugin-react'

export default tseslint.config(
  eslint.configs.recommended,
  nodePlugin.configs['flat/recommended'],
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': 'error',
      'n/no-unsupported-features/node-builtins': [
        'error',
        {
          ignores: [
            'import.meta.dirname',
            // No longer experimental with v22.0.0
            'test.describe',
          ],
        },
      ],
    },
  },
  {
    files: ['test/fixtures/**/*.{js,tsx}'],
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      react,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'n/no-missing-import': 'off',
    },
  },
  {
    files: ['test/fixtures/*-modified.tsx'],
    rules: {
      'react/display-name': 'error',
    },
  },
  {
    ignores: ['dist', 'coverage'],
  },
)
