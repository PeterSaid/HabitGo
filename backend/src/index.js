const { config } = require('./config');
const { buildApp } = require('./app');

const app = buildApp();
app.listen(config.port, () => {
  console.log(`HabitGo API listening on http://localhost:${config.port}`);
});
