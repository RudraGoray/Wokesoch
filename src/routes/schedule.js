const express = require('express');
const { readCollection, writeCollection } = require('../db');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// GET /api/schedule
router.get('/', async (req, res, next) => {
  try {
    const schedule = await readCollection('schedule');
    res.json(schedule);
  } catch (err) {
    next(err);
  }
});

// PUT /api/schedule  (admin only) — replace the whole programme at once,
// since the schedule tends to change as a full block rather than per-item.
router.put('/', adminAuth, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Body must be an array of day objects.' });
    }
    await writeCollection('schedule', req.body);
    res.json(req.body);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
