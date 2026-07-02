const axios = require('axios');
const { getSetting } = require('../utils/settings');

async function verifyRecaptcha(req, res, next) {
  const secret = await getSetting('RECAPTCHA_SECRET_KEY');
  if (!secret) return next(); // not configured — skip verification in dev

  const token = req.body.recaptchaToken;
  if (!token) return res.status(400).json({ error: 'reCAPTCHA verification is required' });

  try {
    const { data } = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: { secret, response: token },
    });
    if (!data.success) return res.status(400).json({ error: 'reCAPTCHA verification failed' });
    next();
  } catch (err) {
    console.error('reCAPTCHA verification error:', err.message);
    return res.status(502).json({ error: 'Could not verify reCAPTCHA' });
  }
}

module.exports = { verifyRecaptcha };
