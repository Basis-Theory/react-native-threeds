module.exports = {
  preset: 'react-native',
  // Bob writes compiled declarations into dist; they are build output rather
  // than additional test suites and must not be discovered by Jest.
  // .threeds-src is vendored by the podspec's prepare_command (gitignored,
  // fetched fresh on every `pod install`) — its own package.json collides
  // with example/.maestro/support/3ds-auth-backend's Haste module name.
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/.threeds-src/'],
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/example/', '<rootDir>/.threeds-src/'],
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
