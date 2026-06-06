import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const tag = process.env.NPM_TAG;
const packagesDir = join(root, 'packages');

const packages = readdirSync(packagesDir).filter((name) => {
  const pkgPath = join(packagesDir, name, 'package.json');
  if (!existsSync(pkgPath)) {
    return false;
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  return !pkg.private;
});

const tagArgs = tag ? `--tag ${tag}` : '';

for (const name of packages) {
  console.log(`Publishing ${name}...`);
  execSync(`pnpm publish --access public --no-git-checks ${tagArgs}`, {
    cwd: join(packagesDir, name),
    stdio: 'inherit',
  });
}

console.log(`Published ${packages.length} packages`);
