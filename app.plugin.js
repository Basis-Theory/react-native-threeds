const { withAppBuildGradle } = require('expo/config-plugins');

const DESUGAR_JDK_LIBS = "coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.5'";

// Ravelin's 3DS SDK, used by the native Android integration, requires core
// library desugaring in the app module. Libraries can't enable it themselves,
// so this plugin adds it to the app/build.gradle that `expo prebuild`
// generates. Apps that already enable it are left unchanged.
const addCoreLibraryDesugaring = (buildGradle) => {
  let contents = buildGradle;

  if (!contents.includes('coreLibraryDesugaringEnabled')) {
    contents = contents.replace(
      /^android\s*\{/m,
      (match) =>
        `${match}\n    compileOptions {\n        coreLibraryDesugaringEnabled true\n    }`
    );
  }

  if (!contents.includes('desugar_jdk_libs')) {
    contents = contents.replace(
      /^dependencies\s*\{/m,
      (match) => `${match}\n    ${DESUGAR_JDK_LIBS}`
    );
  }

  return contents;
};

const withBasisTheoryThreeDS = (config) =>
  withAppBuildGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = addCoreLibraryDesugaring(
      gradleConfig.modResults.contents
    );
    return gradleConfig;
  });

module.exports = withBasisTheoryThreeDS;
module.exports.addCoreLibraryDesugaring = addCoreLibraryDesugaring;
