const express = require('express');
const { checkApiKey } = require('../middleware/auth');
const { listPersonas } = require('../personas/personas');

const router = express.Router();

router.get('/personas', checkApiKey, (req, res) => {
  res.json({ personas: listPersonas() });
});

module.exports = router;


