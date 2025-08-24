const express = require('express');
const OpenAI = require('openai');
const bodyParser = require('body-parser');
const { checkApiKey } = require('../middleware/auth');
const { getPersona } = require('../personas/personas');

const router = express.Router();

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function parseBodyFromMaybeText(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    const raw = req.body.trim();
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonSlice = raw.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonSlice);
      } catch (_) {
        // fall through
      }
    }
  }
  return null;
}

async function handleChatCompletion(req, res) {
  try {
    const client = createOpenAIClient();
    if (!client) {
      return res.status(500).json({ error: 'Server misconfiguration', message: 'OPENAI_API_KEY is not set' });
    }

    // Support both our schema and OpenAI SDK schema
    const parsed = parseBodyFromMaybeText(req);
    const body = parsed || {};
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

// Compatibility aliases (no /api prefix). Use text parser to accept malformed JSON bodies.
const textParser = bodyParser.text({ type: '*/*', limit: '1mb' });
router.post('/openai/chat', textParser, checkApiKey, handleChatCompletion);
router.post('/openai/v1/chat/completions', textParser, checkApiKey, handleChatCompletion);
router.post('/v1/chat/completions', textParser, checkApiKey, handleChatCompletion);
router.post('/openai/chat/completions', textParser, checkApiKey, handleChatCompletion);

// Responses API compatibility: accept JSON or text, convert to responses input
router.post('/openai/responses', textParser, checkApiKey, handleChatCompletion);
router.post('/v1/responses', textParser, checkApiKey, handleChatCompletion);

module.exports = router;


