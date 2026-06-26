const fs = require('fs');
const path = require('path');

const throwingBlock =
  /Object\.defineProperty\(this, 'router', \{\s*get: function\(\) \{\s*throw new Error\([^)]+\);\s*\}\s*\}\);/s;

const compatibleBlock = `Object.defineProperty(this, 'router', {
    get: function() {
      this.lazyrouter();
      return this._router;
    },
    configurable: true
  });`;

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, 'utf8');
  if (!throwingBlock.test(content)) return false;

  fs.writeFileSync(filePath, content.replace(throwingBlock, compatibleBlock), 'utf8');
  console.log(`[patch-express] fixed ${filePath}`);
  return true;
}

const roots = [
  path.join(__dirname, '..', 'node_modules', 'express', 'lib', 'application.js'),
  path.join(
    __dirname,
    '..',
    'node_modules',
    '@nestjs',
    'platform-express',
    'node_modules',
    'express',
    'lib',
    'application.js',
  ),
];

let patched = 0;
for (const file of roots) {
  if (patchFile(file)) patched += 1;
}

if (patched === 0) {
  console.log('[patch-express] no express 5 router patch needed');
}
