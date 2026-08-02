// Generate the Serenity BDD HTML report from the Serenity/JS JSON artefacts.
// The Serenity BDD CLI is a Java tool, so this is a no-op where Java is unavailable
// (local dev) and runs for real in CI. Either way, verify still validates the JSON
// artefacts (scripts/check-report.mjs) — the HTML is the human-facing rendering of them.
import { execSync } from 'node:child_process';

// 4.2.34 (the Serenity/JS package default) emits a stale jquery-ui/1.14.1 path.
// 4.3.4 is the first compatible stable CLI after the upstream report-resource fix and
// remains explicit so report rendering cannot drift independently of reviewed source.
const serenityCliArtifact = 'net.serenity-bdd:serenity-cli:jar:4.3.4';

function javaAvailable() {
  try {
    execSync('java -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!javaAvailable()) {
  console.log('report: Java not found — skipping Serenity HTML generation (runs in CI). JSON artefacts still validated by check:report.');
  process.exit(0);
}

// serenity-bdd downloads its CLI jar on demand; `update` makes that explicit and cacheable.
// `run` reads the JSON from target/site/serenity and writes the HTML report there (defaults
// configured by the SerenityBDDReporter crew, features/ui/support/serenity.setup.ts).
execSync(`npx serenity-bdd update --artifact ${serenityCliArtifact}`, { stdio: 'inherit' });
execSync(`npx serenity-bdd run --artifact ${serenityCliArtifact}`, { stdio: 'inherit' });
console.log('report: Serenity HTML report generated at target/site/serenity/index.html');
