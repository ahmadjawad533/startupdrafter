module.exports = {
  projects: [
    {
      displayName: 'infrastructure',
      testEnvironment: 'node',
      roots: ['<rootDir>/test'],
      testMatch: ['<rootDir>/test/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': 'ts-jest'
      },
      collectCoverageFrom: [
        'lib/**/*.ts',
        '!lib/**/*.d.ts'
      ]
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/tests'],
      testMatch: ['<rootDir>/tests/**/*.test.js'],
      transform: {},
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      collectCoverageFrom: [
        'frontend/**/*.js',
        '!frontend/**/*.min.js'
      ]
    }
  ]
};
