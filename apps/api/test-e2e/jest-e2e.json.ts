module.exports = {
  verbose: true,
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          emitDecoratorMetadata: true,
          experimentalDecorators: true, // FORCE Legacy Decorators (Critical for TypeORM)
          esModuleInterop: true,
          useDefineForClassFields: false, // FORCE false (Critical for TypeORM property initialization)
          isolatedModules: true, // Moved here to fix the deprecation warning
          target: 'ES2021', // Ensure target allows decorators but isn't too new
        },
      },
    ],
  },
  testMatch: ['<rootDir>/test-e2e/*.e2e-spec.ts'],
  coverageDirectory: '<rootDir>/test-e2e/coverage/task-management',
  roots: ['<rootDir>/../../apps/', '<rootDir>/../../libs/'],
  testTimeout: 60000,
  reporters: [
    [
      'default',
      {
        summaryThreshold: 1,
      },
    ],
  ],
  moduleNameMapper: {
    '^@libs/data/(.*)$': '<rootDir>/../../libs/data/$1',
    '^@api/(.*)$': '<rootDir>/$1',
  },
  coveragePathIgnorePatterns: ['<rootDir>/database/'],
};
