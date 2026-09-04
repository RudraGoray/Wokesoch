require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const committeesRouter = require('./src/routes/committees');
const scheduleRouter = require('./src/routes/schedule');
const secretariatRouter = require('./src/routes/secretariat');
const registerRouter = require('./src/routes/register');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Basic request log — swap for morgan/pino if you want more.
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api/committees', committeesRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/secretariat', secretariatRouter);
app.use('/api/register', registerRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve the site itself
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`WS·MUN backend running at http://localhost:${PORT}`);
  if (!process.env.ADMIN_KEY) {
    console.warn('WARNING: ADMIN_KEY is not set — admin endpoints will reject all requests until it is.');
  }
});
