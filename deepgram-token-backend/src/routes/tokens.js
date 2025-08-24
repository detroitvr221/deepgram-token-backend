const express = require('express');
const axios = require('axios');
const { checkApiKey } = require('../middleware/auth');

const router = express.Router();

// Generate Deepgram token (POST)
router.post('/deepgram/token', checkApiKey, async (req, res) => {
  try {
    // Call Deepgram REST grant endpoint
    const response = await axios.post(
      'https://api.deepgram.com/v1/auth/grant',
      { scope: ['listen', 'speak'] },
      {
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Response contains access_token and expires_at (ISO)
    res.json({
      token: response.data.access_token || response.data.token,
      expires_at: response.data.expires_at,
      scope: response.data.scope || ['listen', 'speak'],
      expires_in: 30,
    });
  } catch (error) {
    console.error('Deepgram token generation error:', error);
    res.status(500).json({
      error: 'Token generation failed',
      message: error.response?.data?.message || error.message,
    });
  }
});

// Alternative: GET endpoint
router.get('/deepgram/token', checkApiKey, async (req, res) => {
  try {
    const response = await axios.post(
      'https://api.deepgram.com/v1/auth/grant',
      { scope: ['listen', 'speak'] },
      {
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({
      token: response.data.access_token || response.data.token,
      expires_at: response.data.expires_at,
      scope: response.data.scope || ['listen', 'speak'],
      expires_in: 30,
    });
  } catch (error) {
    console.error('Deepgram token generation error:', error);
    res.status(500).json({
      error: 'Token generation failed',
      message: error.response?.data?.message || error.message,
    });
  }
});

module.exports = router;


