const express = require('express');
const crypto = require('crypto');
const { readCollection, writeCollection } = require('../db');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

const VALID_TIERS = ['delegate', 'delegation', 'eb'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body) {
  const errors = [];
  const { tier, fullName, email, phone, committeePreference, institution, delegationSize } = body;

  if (!VALID_TIERS.includes(tier)) errors.push(`tier must be one of ${VALID_TIERS.join(', ')}`);
  if (!fullName || !fullName.trim()) errors.push('fullName is required');
  if (!email || !EMAIL_RE.test(email)) errors.push('a valid email is required');
  if (!phone || !phone.trim()) errors.push('phone is required');

  if (tier === 'delegate' && !committeePreference) {
    errors.push('committeePreference is required for delegate registrations');
  }
  if (tier === 'delegation' && (!institution || !delegationSize)) {
    errors.push('institution and delegationSize are required for delegation registrations');
  }
  return errors;
}

// POST /api/register
router.post('/', async (req, res, next) => {
  try {
    const errors = validate(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const committees = await readCollection('committees');
    if (req.body.committeePreference) {
      const known = committees.some((c) => c.slug === req.body.committeePreference);
      if (!known) return res.status(400).json({ errors: ['committeePreference is not a known committee slug'] });
    }

    const registrations = await readCollection('registrations');

    // Prevent the same person double-registering for the same tier.
    const dupe = registrations.find(
      (r) => r.email.toLowerCase() === req.body.email.toLowerCase() && r.tier === req.body.tier
    );
    if (dupe) {
      return res.status(409).json({ error: 'This email has already registered for this tier.' });
    }

    const entry = {
      id: crypto.randomUUID(),
      tier: req.body.tier,
      fullName: req.body.fullName.trim(),
      email: req.body.email.trim(),
      phone: req.body.phone.trim(),
      institution: req.body.institution ? req.body.institution.trim() : null,
      delegationSize: req.body.delegationSize || null,
      committeePreference: req.body.committeePreference || null,
      notes: req.body.notes ? req.body.notes.trim() : null,
      status: 'pending', // pending -> confirmed / waitlisted / rejected, set by admin
      submittedAt: new Date().toISOString(),
    };

    registrations.push(entry);
    await writeCollection('registrations', registrations);

    res.status(201).json({
      message: 'Registration received.',
      registrationId: entry.id,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/register  (admin only) — list submissions, optional ?tier= / ?status= filters
router.get('/', adminAuth, async (req, res, next) => {
  try {
    let registrations = await readCollection('registrations');
    if (req.query.tier) registrations = registrations.filter((r) => r.tier === req.query.tier);
    if (req.query.status) registrations = registrations.filter((r) => r.status === req.query.status);
    res.json(registrations);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/register/:id  (admin only) — move a registration through
// pending -> confirmed / waitlisted / rejected
router.patch('/:id', adminAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'waitlisted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${validStatuses.join(', ')}` });
    }
    const registrations = await readCollection('registrations');
    const idx = registrations.findIndex((r) => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Registration not found.' });

    registrations[idx].status = status;
    await writeCollection('registrations', registrations);
    res.json(registrations[idx]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
