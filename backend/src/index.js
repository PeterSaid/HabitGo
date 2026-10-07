const { config } = require('./config');
const { buildApp, migrate } = require('./app');

(async () => {
  try {
    await migrate();
    const app = buildApp();
    app.listen(config.port, () => {
      console.log(`HabitGo API listening on http://localhost:${config.port}`);
    });
  } catch (e) {
    console.error('Failed to start:', e);
    process.exit(1);
  }
})();
