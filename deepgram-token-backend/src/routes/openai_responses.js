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

function flattenMessagesToText(messages) {
  if (!Array.isArray(messages)) return '';
  return messages
    .map((m) => {
      if (!m || typeof m !== 'object') return '';
      const role = m.role || 'user';
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return `${role.toUpperCase()}: ${content}`;
    })
    .filter(Boolean)
    .join('\n');
}

router.post('/openai/responses', checkApiKey, async (req, res) => {
  try {
    const client = createOpenAIClient();
    if (!client) {
      return res.status(500).json({ error: 'Server misconfiguration', message: 'OPENAI_API_KEY is not set' });
    }

    const { model, temperature, max_output_tokens, personaId, context, input, messages } = req.body || {};

    // Build input string from persona + context + either explicit input or messages array
    let parts = [];
    if (personaId) {
      const persona = getPersona(personaId);
      if (!persona) return res.status(400).json({ error: 'Invalid personaId' });
      parts.push(`SYSTEM: ${persona.systemPrompt}`);
      const contextLines = [];
      if (context && typeof context === 'object') {
        if (context.userName) contextLines.push(`User name: ${context.userName}`);
        if (context.goal) contextLines.push(`Goal: ${context.goal}`);
        if (Array.isArray(context.preferences) && context.preferences.length > 0) {
          contextLines.push(`Preferences: ${context.preferences.join(', ')}`);
        }
      }
      if (contextLines.length) parts.push(`CONTEXT:\n- ${contextLines.join('\n- ')}`);
    }

    if (typeof input === 'string' && input.trim().length > 0) {
      parts.push(`USER: ${input.trim()}`);
    } else if (Array.isArray(messages) && messages.length > 0) {
      parts.push(flattenMessagesToText(messages));
    } else {
      return res.status(400).json({ error: 'Invalid request', message: 'Provide messages[] or input string' });
    }

    const finalInput = parts.join('\n\n');

    const response = await client.responses.create({
      model: model || 'gpt-4o-mini',
      input: finalInput,
      temperature: typeof temperature === 'number' ? temperature : undefined,
      max_output_tokens,
    });

    // The Responses API returns content in response.output_text (SDK helper) or blocks
    const replyText = typeof response.output_text === 'string' ? response.output_text : undefined;

    res.json({
      reply: replyText,
      id: response.id,
      created: response.created,
      model: response.model,
      output: response.output,
      persona: personaId || null,
    });
  } catch (error) {
    console.error('OpenAI responses error:', error);
    res.status(500).json({ error: 'OpenAI request failed', message: error.message });
  }
});

module.exports = router;


