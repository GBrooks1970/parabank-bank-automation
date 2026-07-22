// Generate the Serenity BDD HTML report from the Serenity/JS JSON artefacts.
// The Serenity BDD CLI is a Java tool, so this is a no-op where Java is unavailable
// (local dev) and runs for real in CI. Either way, verify still validates the JSON
// artefacts (scripts/check-report.mjs) — the HTML is the human-facing rendering of them.
import { execSync } from 'node:child_process';

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
execSync('npx serenity-bdd update', { stdio: 'inherit' });
execSync('npx serenity-bdd run', { stdio: 'inherit' });
console.log('report: Serenity HTML report generated at target/site/serenity/index.html');
