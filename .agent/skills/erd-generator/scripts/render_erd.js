import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import * as path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../../../..');
const inputArg = process.argv[2] || 'docs/architecture/schema.mmd';
const input = path.resolve(repoRoot, inputArg);
const output = path.resolve(repoRoot, 'docs/architecture/erd.svg');

if (!existsSync(input)) {
  console.error(`SYNTAX_ERROR: Input file not found: ${input}`);
  process.exit(1);
}

const result = spawnSync('npx', ['mmdc', '-i', input, '-o', output], {
  cwd: repoRoot,
  encoding: 'utf8',
});

if (
  result.error ||
  result.status !== 0 ||
  !existsSync(output) ||
  statSync(output).size === 0
) {
  const trace = result.error?.message || result.stderr || result.stdout || 'Unknown error';
  console.error(`SYNTAX_ERROR: ${trace}`);
  process.exit(1);
}

console.log('SUCCESS');
process.exit(0);
