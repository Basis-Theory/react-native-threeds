module.exports = {
  preset: 'react-native',
  // Bob writes compiled declarations into dist; they are build output rather
  // than additional test suites and must not be discovered by Jest.
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/poc-support/.native-sdks/',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/poc-examples/',
    '<rootDir>/poc-support/',
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
