// Node 20 on Windows does not expand test-file globs. Discover deterministically and pass
// explicit TypeScript paths to Node's test runner with the existing tsx loader.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const unitDir = join('tests', 'unit');
const files = readdirSync(unitDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.test.ts'))
  .map((entry) => join(unitDir, entry.name))
  .sort();

if (files.length === 0) {
  console.error(`Unit test discovery FAILED: no *.test.ts files under ${unitDir}`);
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], {
    stdio: 'inherit'
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
