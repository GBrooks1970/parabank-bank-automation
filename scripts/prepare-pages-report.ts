import { preparePagesEvidence } from '../src/quality/pages-evidence';

const sourceRef = requiredArgument('--source-ref');
const result = preparePagesEvidence(sourceRef);

console.log(
  `Prepared target/pages for ${result.sourceRef}: ${result.scenarioCount} scenarios, ` +
    `${result.fileCount} files, ${result.byteCount} bytes.`
);

function requiredArgument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith('--')) throw new Error(`missing required ${name} argument`);
  return value;
}
