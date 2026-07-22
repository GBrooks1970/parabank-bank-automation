// Lane B (API) runner config. Serial execution is deliberate (design doc §2/§10:
// one shared datastore + reset bracket — calculator CAL-01 precedent).
module.exports = {
  default: {
    paths: ['features/api/**/*.feature'],
    requireModule: ['tsx/cjs'],
    require: ['features/support/**/*.ts', 'features/api/steps/**/*.ts'],
    format: ['progress-bar'],
    strict: true
  }
};
