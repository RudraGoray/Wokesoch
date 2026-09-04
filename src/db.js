const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Very small per-file write queue so two concurrent POSTs can't
// interleave and corrupt a JSON file. Fine for this scale of app;
// swap for a real database (Postgres/SQLite) if traffic grows.
const queues = new Map();

function enqueue(file, task) {
  const prev = queues.get(file) || Promise.resolve();
  const next = prev.then(task, task);
  queues.set(file, next.catch(() => {}));
  return next;
}

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

async function readCollection(name) {
  const raw = await fs.readFile(filePath(name), 'utf-8');
  return JSON.parse(raw);
}

async function writeCollection(name, data) {
  return enqueue(name, async () => {
    await fs.writeFile(filePath(name), JSON.stringify(data, null, 2) + '\n', 'utf-8');
    return data;
  });
}

module.exports = { readCollection, writeCollection };
