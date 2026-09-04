const express = require('express');
const { readCollection, writeCollection } = require('../db');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// GET /api/secretariat
router.get('/', async (req, res, next) => {
  try {
    const secretariat = await readCollection('secretariat');
    res.json(secretariat);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/secretariat/:order  (admin only) — e.g. filling in a
// name once a "seat under vetting" / TBA slot is confirmed.
router.patch('/:order', adminAuth, async (req, res, next) => {
  try {
    const secretariat = await readCollection('secretariat');
    const idx = secretariat.findIndex((s) => s.order === req.params.order);
    if (idx === -1) return res.status(404).json({ error: 'Seat not found.' });

    if (req.body.name !== undefined) secretariat[idx].name = req.body.name;
    if (req.body.role !== undefined) secretariat[idx].role = req.body.role;

    await writeCollection('secretariat', secretariat);
    res.json(secretariat[idx]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
