import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const rootPkgPath = join(root, 'package.json');
const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
const version = rootPkg.version;

if (!version) {
  console.error('Root package.json must have a version field');
  process.exit(1);
}

const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];

function syncGlobalartDeps(deps) {
  if (!deps) {
    return;
  }
  for (const name of Object.keys(deps)) {
    if (name.startsWith('@globalart/')) {
      deps[name] = version;
    }
  }
}

const packagesDir = join(root, 'packages');

for (const name of readdirSync(packagesDir)) {
  const pkgPath = join(packagesDir, name, 'package.json');
  if (!existsSync(pkgPath)) {
    continue;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.version = version;

  for (const field of DEP_FIELDS) {
    syncGlobalartDeps(pkg[field]);
  }

  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`Synced ${pkg.name} -> ${version}`);
}
