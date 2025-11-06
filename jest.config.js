const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/scripts/**',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/scripts/',
  ],
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  projects: [
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/**/*.test.{js,jsx,ts,tsx}'],
      testPathIgnorePatterns: ['<rootDir>/src/__tests__/models/', '<rootDir>/src/__tests__/api/'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.jsdom.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            jsx: 'react-jsx',
          },
        }],
      },
    },
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/models/*.test.{js,ts}', '<rootDir>/src/__tests__/api/*.test.{js,ts}'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.node.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      preset: 'ts-jest',
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            module: 'commonjs',
          },
        }],
      },
    },
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)