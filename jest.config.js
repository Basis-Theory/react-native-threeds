module.exports = {
  preset: 'react-native',
  // Bob writes compiled declarations into dist; they are build output rather
  // than additional test suites and must not be discovered by Jest.
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/example/'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transform: {
    // The 'react-native' preset's own transform (js/ts/tsx -> babel-jest) is
    // replaced, not merged, by this key — react-native's own .js sources
    // (e.g. jest/mockComponent.js) use Flow syntax and break at runtime if
    // left untransformed. Keep babel-jest for .js, ts-jest for .ts/.tsx.
    '^.+\\.js$': 'babel-jest',
    '^.+\\.tsx?$': 'ts-jest',
  },
};
