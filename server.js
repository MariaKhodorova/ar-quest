const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/targets', express.static(path.join(__dirname, 'targets')));
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// ── In-memory store ──────────────────────────────────────────────────────────
// sessions[groupCode] = { createdAt, participants: { userId: { name, progress: [] } } }
const sessions = {};

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateGroupCode() {
  const words = ['LEAF', 'MOSS', 'FERN', 'BARK', 'ROOT', 'SEED', 'VINE', 'DUSK'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${num}`;
}

function generateUserId() {
  return crypto.randomBytes(8).toString('hex');
}

// ── Routes ───────────────────────────────────────────────────────────────────

// POST /api/session — организатор создаёт сессию
app.post('/api/session', (req, res) => {
  let groupCode;
  do { groupCode = generateGroupCode(); } while (sessions[groupCode]);

  sessions[groupCode] = {
    createdAt: Date.now(),
    participants: {}
  };

  console.log(`[SESSION] Created: ${groupCode}`);
  res.json({ groupCode });
});

// POST /api/join — участник входит по коду группы
app.post('/api/join', (req, res) => {
  const { groupCode, name } = req.body;

  if (!groupCode || !name) {
    return res.status(400).json({ error: 'groupCode и name обязательны' });
  }

  const session = sessions[groupCode.toUpperCase()];
  if (!session) {
    return res.status(404).json({ error: 'Сессия не найдена. Проверьте код группы.' });
  }

  const userId = generateUserId();
  session.participants[userId] = { name: name.trim(), progress: [], joinedAt: Date.now() };

  console.log(`[JOIN] ${name} → ${groupCode}`);
  res.json({ userId, groupCode: groupCode.toUpperCase(), name: name.trim() });
});

// POST /api/progress — участник записывает прогресс
app.post('/api/progress', (req, res) => {
  const { groupCode, userId, stationId } = req.body;

  if (!groupCode || !userId || stationId === undefined) {
    return res.status(400).json({ error: 'groupCode, userId, stationId обязательны' });
  }

  const session = sessions[groupCode];
  if (!session) return res.status(404).json({ error: 'Сессия не найдена' });

  const participant = session.participants[userId];
  if (!participant) return res.status(404).json({ error: 'Участник не найден' });

  if (!participant.progress.includes(stationId)) {
    participant.progress.push(stationId);
    console.log(`[PROGRESS] ${participant.name} completed station ${stationId} in ${groupCode}`);
  }

  res.json({ ok: true, progress: participant.progress });
});

// GET /api/stats/:groupCode — статистика группы
app.get('/api/stats/:groupCode', (req, res) => {
  const session = sessions[req.params.groupCode.toUpperCase()];
  if (!session) return res.status(404).json({ error: 'Сессия не найдена' });

  const stats = Object.entries(session.participants).map(([userId, p]) => ({
    userId,
    name: p.name,
    stationsCompleted: p.progress.length,
    progress: p.progress
  }));

  res.json({ groupCode: req.params.groupCode.toUpperCase(), participants: stats });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌿 Quest AR server running on http://localhost:${PORT}\n`);
});
