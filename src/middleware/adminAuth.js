// Guards admin-only endpoints (updating committee status, reading
// registrations) behind a shared secret sent as `x-admin-key`.
// Set ADMIN_KEY in your environment / .env file before deploying.
module.exports = function adminAuth(req, res, next) {
  const provided = req.get('x-admin-key');
  const expected = process.env.ADMIN_KEY;

  if (!expected) {
    return res.status(500).json({
      error: 'Server misconfigured: ADMIN_KEY is not set.',
    });
  }
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Missing or invalid x-admin-key header.' });
  }
  next();
};
