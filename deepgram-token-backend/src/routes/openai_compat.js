const express = require('express');
const OpenAI = require('openai');
const { checkApiKey } = require('../middleware/auth');
const { getPersona } = require('../personas/personas');

const router = express.Router();

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

async function handleChatCompletion(req, res) {
  try {
    const client = createOpenAIClient();
    if (!client) {
      return res.status(500).json({ error: 'Server misconfiguration', message: 'OPENAI_API_KEY is not set' });
    }

    // Support both our schema and OpenAI SDK schema
    const body = req.body || {};
    const messages = body.messages;
    const model = body.model || 'gpt-4o-mini';
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
    const max_tokens = body.max_tokens;
    const personaId = body.personaId || body.persona_id || (body.metadata && body.metadata.personaId);
    const context = body.context || (body.metadata && body.metadata.context);

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request', message: 'messages[] is required' });
    }

    let composedMessages = messages;
    if (personaId) {
      const persona = getPersona(personaId);
      if (!persona) {
        return res.status(400).json({ error: 'Invalid personaId' });
      }
      const contextLines = [];
      if (context && typeof context === 'object') {
        if (context.userName) contextLines.push(`User name: ${context.userName}`);
        if (context.goal) contextLines.push(`Goal: ${context.goal}`);
        if (Array.isArray(context.preferences) && context.preferences.length > 0) {
          contextLines.push(`Preferences: ${context.preferences.join(', ')}`);
        }
      }
      composedMessages = [
        { role: 'system', content: persona.systemPrompt + (contextLines.length ? `\n\nContext:\n- ${contextLines.join('\n- ')}` : '') },
        ...messages.filter((m) => m && m.role !== 'system'),
      ];
    }

    const response = await client.chat.completions.create({
      model,
      messages: composedMessages,
      temperature,
      max_tokens,
    });

    const choice = response.choices && response.choices[0];
    const message = choice ? choice.message : null;
    return res.json({
      reply: message,
      model: response.model,
      usage: response.usage,
      id: response.id,
      created: response.created,
      persona: personaId || null,
    });
  } catch (error) {
    console.error('OpenAI compat error:', error);
    return res.status(500).json({ error: 'OpenAI request failed', message: error.message });
  }
}

// Compatibility aliases (no /api prefix)
router.post('/openai/chat', checkApiKey, handleChatCompletion);
router.post('/openai/v1/chat/completions', checkApiKey, handleChatCompletion);
router.post('/v1/chat/completions', checkApiKey, handleChatCompletion);
router.post('/openai/chat/completions', checkApiKey, handleChatCompletion);

module.exports = router;


