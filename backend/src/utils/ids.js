const crypto = require('crypto');

const uuid = () => crypto.randomUUID();

module.exports = { uuid };
