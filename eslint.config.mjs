import nx from '@nx/eslint-plugin';

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
      'tsc/config': ['error', { configFile: 'tsconfig.json' }],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'require-await': 'error',
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
          selector:
            "CallExpression[callee.object.name='console'][callee.property.name!=/^(log|warn|error|info|trace|time|timeEnd)$/]",
          message: 'Unexpected property on console object was called',
        },
      ],
      'no-console': 'error',
    },
  },
];
