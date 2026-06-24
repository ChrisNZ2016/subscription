#!/usr/bin/env node
/**
 * Keeps README.md in sync with page-versions.ts and records staged app changes.
 * Invoked by .githooks/pre-commit before each commit.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readmePath = join(root, 'README.md');
const versionsPath = join(root, 'src/constants/page-versions.ts');

const versionsSource = readFileSync(versionsPath, 'utf8');
const pageEntries = [
  ...versionsSource.matchAll(
    /(?:'([^']+)'|(\w+)):\s*\{\s*name:\s*'[^']+',\s*version:\s*'([^']+)'/g,
  ),
].map(([, quoted, unquoted, version]) => ({ name: quoted ?? unquoted, version }));

if (pageEntries.length === 0) {
  console.error('sync-readme: could not parse page-versions.ts');
  process.exit(1);
}

let readme = readFileSync(readmePath, 'utf8');

const tableRows = pageEntries
  .map(({ name, version }) => `| \`${name}\` | ${version} |`)
  .join('\n');

const versionsBlock = `| Page name | Version |
|-----------|---------|
${tableRows}`;

readme = readme.replace(
  /<!-- PAGE_VERSIONS_START -->[\s\S]*?<!-- PAGE_VERSIONS_END -->/,
  `<!-- PAGE_VERSIONS_START -->\n${versionsBlock}\n<!-- PAGE_VERSIONS_END -->`,
);

const staged = execSync('git diff --cached --name-only', { cwd: root, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const appPaths = staged.filter(
  (p) =>
    p.startsWith('src/') ||
    p.startsWith('api/') ||
    p.startsWith('shopify/') ||
    p === 'src/constants/page-versions.ts',
);

if (appPaths.length > 0 && !staged.includes('README.md')) {
  const date = new Date().toISOString().slice(0, 10);
  const entry = `- **${date}** — ${appPaths.join(', ')}`;
  const marker = '<!-- CHANGELOG_START -->';
  if (readme.includes(marker)) {
    readme = readme.replace(marker, `${marker}\n${entry}`);
  }
}

writeFileSync(readmePath, readme);

if (appPaths.length > 0 || staged.includes('src/constants/page-versions.ts')) {
  execSync('git add README.md', { cwd: root });
}
