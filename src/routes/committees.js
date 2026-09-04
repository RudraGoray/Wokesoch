const express = require('express');
const { readCollection, writeCollection } = require('../db');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();
const VALID_STATUSES = ['OPEN', 'FILLING', 'CLOSED'];

// GET /api/committees
router.get('/', async (req, res, next) => {
  try {
    const committees = await readCollection('committees');
    res.json(committees);
  } catch (err) {
    next(err);
  }
});

// GET /api/committees/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const committees = await readCollection('committees');
    const committee = committees.find((c) => c.slug === req.params.slug);
    if (!committee) return res.status(404).json({ error: 'Committee not found.' });
    res.json(committee);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/committees/:slug  (admin only)
// Body may include any subset of: status, name, fullName, agenda,
// level, size, description, eb (array of "Name — Role" strings).
router.patch('/:slug', adminAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
    }

    const committees = await readCollection('committees');
    const idx = committees.findIndex((c) => c.slug === req.params.slug);
    if (idx === -1) return res.status(404).json({ error: 'Committee not found.' });

    const allowed = ['status', 'name', 'fullName', 'agenda', 'level', 'size', 'description', 'eb'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) committees[idx][key] = req.body[key];
    }

    await writeCollection('committees', committees);
    res.json(committees[idx]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
