const fs = require('fs');
const distPackage = require('./package.json');

// remove dev dependencies
delete distPackage.devDependencies;

libPackage.scripts = {
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

fs.writeFileSync(
  './dist/package.json',
  JSON.stringify(distPackage, undefined, 2)
);
