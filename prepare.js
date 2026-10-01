const fs = require('fs');
const path = require('path');
const distPackage = require('./package.json');

// remove dev dependencies
delete distPackage.devDependencies;

distPackage.scripts = {
  postversion: 'cd .. && node bump.js',
};

// include all 'dist/*' files
distPackage.files = ['*'];

// updates source flags removing 'dist' path
['main', 'module'].forEach((prop) => {
  distPackage[prop] = distPackage[prop].replace('dist/', '');
});

// update paths for exports
const updateDistPaths = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === 'string' && obj[key].startsWith('./dist/')) {
      obj[key] = obj[key].replace('dist/', '');
    } else if (typeof obj[key] === 'object') {
      updateDistPaths(obj[key]);
    }
  }
};


if (distPackage.exports) {
  updateDistPaths(distPackage.exports);
}

fs.mkdirSync('./dist', { recursive: true });

fs.copyFileSync('./README.md', './dist/README.md');
fs.copyFileSync('./LICENSE', './dist/LICENSE');

// The package is published from dist, so the TypeScript sources (Codegen reads
// the TurboModule spec from src/specs), the native sources, the podspec, the
// autolinking config, and the Expo config plugin must be copied here too.
fs.cpSync('./src', './dist/src', {
  recursive: true,
  filter: (source) => path.basename(source) !== '__tests__',
});

const nativeBuildOutput = new Set([
  'build',
  '.gradle',
  'gradle',
  'gradlew',
  'gradlew.bat',
  'local.properties',
]);

['android', 'ios'].forEach((directory) => {
  fs.cpSync(`./${directory}`, `./dist/${directory}`, {
    recursive: true,
    filter: (source) => !nativeBuildOutput.has(path.basename(source)),
  });
});

[
  'BasisTheoryReactNativeThreeDS.podspec',
  'react-native.config.js',
  'app.plugin.js',
].forEach((file) => fs.copyFileSync(`./${file}`, `./dist/${file}`));

fs.writeFileSync(
  './dist/package.json',
  JSON.stringify(distPackage, undefined, 2)
);
