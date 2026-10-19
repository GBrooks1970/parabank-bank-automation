// Generate the Serenity BDD HTML report for test-style-03 (PB-STYLE-02) from its own
// Serenity/JS JSON artefacts. Same Java-optional pattern and the same pinned CLI as
// scripts/report.mjs, but a separate source/destination: test-style-03 never writes to the
// main lane's target/site/serenity (that folder feeds check:report and the Pages evidence).
import { execSync } from 'node:child_process';

const serenityCliArtifact = 'net.serenity-bdd:serenity-cli:jar:4.3.4';
const site = 'test-style-03/target/site/serenity';

function javaAvailable() {
  try {
    execSync('java -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!javaAvailable()) {
  console.log('report:style-03: Java not found — skipping Serenity HTML generation (runs in CI). JSON artefacts still validated by check:style-03-report.');
  process.exit(0);
}

execSync(`npx serenity-bdd update --artifact ${serenityCliArtifact}`, { stdio: 'inherit' });
execSync(
  `npx serenity-bdd run --artifact ${serenityCliArtifact} --source ${site} --destination ${site} ` +
    `--features test-style-03/tests --project "ParaBank Bank Automation — test style 03"`,
  { stdio: 'inherit' }
);
