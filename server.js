/**
 * server.js
 * Main Express server entry point.
 */

require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const connectDB = require('./config/db');

const app = express();

// ── Connect MongoDB ──────────────────────────────────
connectDB();

// ── Middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ───────────────────────────────────────
app.use('/api/songs',     require('./routes/songs'));
app.use('/api/videos',    require('./routes/videos'));
app.use('/api/playlists', require('./routes/playlists'));

// ── Stats route ──────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const Song     = require('./models/Song');
    const Video    = require('./models/Video');
    const Playlist = require('./models/Playlist');

    const [songs, videos, playlists, liked] = await Promise.all([
      Song.countDocuments(),
      Video.countDocuments(),
      Playlist.countDocuments(),
      Song.countDocuments({ isLiked: true }),
    ]);

    res.json({ success: true, data: { songs, videos, playlists, liked } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Serve frontend ───────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Error handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const message = process.env.NODE_ENV === 'development'
    ? err.message
    : 'Something went wrong!';
  res.status(500).json({ success: false, message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🎵 Vishal Media Player running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
