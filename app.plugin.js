const { withAppBuildGradle } = require('expo/config-plugins');

const DESUGAR_JDK_LIBS = "coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.5'";

// Ravelin's SDK depends on okhttp's logging-interceptor, which ships the same
// META-INF entry as AndroidX's jspecify, so the APK can't package both.
const DUPLICATE_META_INF = 'META-INF/versions/9/OSGI-INF/MANIFEST.MF';

// Ravelin's 3DS SDK, used by the native Android integration, needs two changes
// in the app module that a library can't make itself: core library desugaring
// and excluding a duplicate META-INF entry. This plugin adds both to the
// app/build.gradle that `expo prebuild` generates, and leaves apps that already
// have them unchanged.
const addRavelinRequirements = (buildGradle) => {
  let contents = buildGradle;
  const androidBlocks = [];

  if (!contents.includes('coreLibraryDesugaringEnabled')) {
    androidBlocks.push(
      '    compileOptions {\n        coreLibraryDesugaringEnabled true\n    }'
    );
  }

  if (!contents.includes(DUPLICATE_META_INF)) {
    androidBlocks.push(
      `    packagingOptions {\n        resources {\n            excludes += "${DUPLICATE_META_INF}"\n        }\n    }`
    );
  }

  if (androidBlocks.length > 0) {
    contents = contents.replace(
      /^android\s*\{/m,
      (match) => `${match}\n${androidBlocks.join('\n')}`
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
    gradleConfig.modResults.contents = addRavelinRequirements(
      gradleConfig.modResults.contents
    );
    return gradleConfig;
  });

module.exports = withBasisTheoryThreeDS;
module.exports.addRavelinRequirements = addRavelinRequirements;
