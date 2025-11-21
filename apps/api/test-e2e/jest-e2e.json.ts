module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  testMatch: ['**/test/**/*.e2e-spec.ts'],
  moduleDirectories: ['node_modules', '<rootDir>', '<rootDir>/test'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/src/app/api/modules/$1',
  },
  testTimeout: 60000,
  reporters: [
    [
      'default',
      {
        summaryThreshold: 1,
      },
    ],
  ],
};
