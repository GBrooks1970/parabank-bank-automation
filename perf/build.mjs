// Bundles the TypeScript k6 test (perf/src/parabank-load.ts) into a single
// k6-loadable ESM file (perf/dist/parabank-load.js). k6 provides its own module
// runtime, so all `k6*` and remote (`https:`) imports are marked external.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [resolve(here, 'src/parabank-load.ts')],
  outfile: resolve(here, 'dist/parabank-load.js'),
  bundle: true,
  format: 'esm',
  target: 'es2017',
  // k6's built-in modules and any remote imports are resolved by the k6 runtime.
  external: ['k6', 'k6/*', 'https://*', 'http://*'],
  legalComments: 'none',
  logLevel: 'info',
});

console.log('perf/build: wrote perf/dist/parabank-load.js');
