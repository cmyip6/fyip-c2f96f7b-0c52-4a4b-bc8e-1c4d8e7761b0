import nx from '@nx/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: 'tsconfig.json',
      tsconfigRootDir: __dirname,
      sourceType: 'module',
    },
    plugins: ['@typescript-eslint/eslint-plugin', 'tsc'],
    extends: [
      'prettier',
      'plugin:prettier/recommended',
      'plugin:@typescript-eslint/recommended',
    ],
    root: true,
    env: {
      node: true,
      jest: true,
    },
    ignorePatterns: ['.eslintrc.js'],
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },

  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.base.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-redeclare': 'error',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-floating-promises': ['error'],
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          suffix: ['Interface'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
          suffix: ['Options'],
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
          suffix: ['Type'],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-cycle': 'warn',
      'import/prefer-default-export': 'off',
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'no-irregular-whitespace': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
];
