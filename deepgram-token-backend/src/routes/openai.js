const express = require('express');
const { checkApiKey } = require('../middleware/auth');
const OpenAI = require('openai');

const router = express.Router();

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

router.post('/openai/chat', checkApiKey, async (req, res) => {
  try {
    const client = createOpenAIClient();
    if (!client) {
      return res.status(500).json({
        error: 'Server misconfiguration',
        message: 'OPENAI_API_KEY is not set',
      });
    }

    const { messages, model, temperature, max_tokens } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request', message: 'messages[] is required' });
    }

    const response = await client.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      max_tokens,
    });

    const choice = response.choices && response.choices[0];
    const message = choice ? choice.message : null;

    res.json({
      reply: message,
      model: response.model,
      usage: response.usage,
      id: response.id,
      created: response.created,
    });
  } catch (error) {
    console.error('OpenAI chat error:', error);
    res.status(500).json({ error: 'OpenAI request failed', message: error.message });
  }
});

module.exports = router;


