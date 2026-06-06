import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const tag = process.env.NPM_TAG;
const packagesDir = join(root, 'packages');
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];

function loadPackages() {
  const entries = [];

  for (const name of readdirSync(packagesDir)) {
    const pkgPath = join(packagesDir, name, 'package.json');
    if (!existsSync(pkgPath)) {
      continue;
    }

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (pkg.private) {
      continue;
    }

    entries.push({ folder: name, pkg });
  }

  return entries;
}

function getGlobalartDeps(pkg) {
  const deps = [];

  for (const field of DEP_FIELDS) {
    const section = pkg[field];
    if (!section) {
      continue;
    }

    for (const dep of Object.keys(section)) {
      if (dep.startsWith('@globalart/')) {
        deps.push(dep);
      }
    }
  }

  return deps;
}

function getPublishOrder(entries) {
  const byName = new Map(entries.map((entry) => [entry.pkg.name, entry]));
  const order = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(entry) {
    if (visited.has(entry.folder)) {
      return;
    }

    if (visiting.has(entry.folder)) {
      throw new Error(`Circular dependency: ${entry.pkg.name}`);
    }

    visiting.add(entry.folder);

    for (const dep of getGlobalartDeps(entry.pkg)) {
      const depEntry = byName.get(dep);
      if (depEntry) {
        visit(depEntry);
      }
    }

    visiting.delete(entry.folder);
    visited.add(entry.folder);
    order.push(entry);
  }

  for (const entry of entries) {
    visit(entry);
  }

  return order;
}

function checkNpmAuth() {
  try {
    const user = execSync('npm whoami', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    console.log(`npm: logged in as ${user}`);
  } catch {
    console.error('npm: not authenticated. Run `npm login` before publishing.');
    process.exit(1);
  }
}

checkNpmAuth();

const order = getPublishOrder(loadPackages());
const tagArgs = tag ? `--tag ${tag}` : '';

for (const { folder, pkg } of order) {
  console.log(`Publishing ${pkg.name}@${pkg.version}...`);

  try {
    execSync(`npm publish --access public ${tagArgs}`, {
      cwd: join(packagesDir, folder),
      stdio: 'inherit',
    });
  } catch {
    console.error(`\nFailed to publish ${pkg.name}.`);
    console.error(
      'E404 usually means missing npm auth or @globalart publish access. Run `npm login` and retry with `pnpm publish:packages`.',
    );
    console.error('If 2FA is enabled, pass OTP: npm publish --access public --otp=YOUR_CODE');
    process.exit(1);
  }
}

console.log(`Published ${order.length} packages`);
