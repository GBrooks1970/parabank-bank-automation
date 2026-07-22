// Lane runner config. Serial execution is deliberate (design doc §2/§10: one shared
// datastore + reset bracket — calculator CAL-01 precedent).
//  - default/api: Lane B (API screenplay BDD)
//  - ui:          Lane A (Serenity/JS + Playwright + Cucumber; the @serenity-js/cucumber
//                 formatter emits Serenity BDD artefacts per features/ui/support setup)
const api = {
  paths: ['features/api/**/*.feature'],
  requireModule: ['tsx/cjs'],
  require: ['features/support/**/*.ts', 'features/api/steps/**/*.ts'],
  format: ['progress'],
  strict: true
};

const ui = {
  paths: ['features/ui/**/*.feature'],
  requireModule: ['tsx/cjs'],
  require: ['features/support/**/*.ts', 'features/ui/support/**/*.ts', 'features/ui/steps/**/*.ts'],
  // ONE stdout formatter only (magento lesson): the serenity adapter writes to a file sink;
  // its real output is the Serenity BDD artefacts emitted by the configured crew.
  format: ['progress', ['@serenity-js/cucumber', 'target/serenity-adapter.out']],
  strict: true
};

module.exports = { default: api, api, ui };
