/**
 * routes/songs.js
 * All audio API routes.
 */

const express  = require('express');
const router   = express.Router();
const Song     = require('../models/Song');
const { uploadAudio, uploadThumbnail, cloudinary } = require('../config/cloudinary');
const multer   = require('multer');

// ── Upload middleware: audio + optional thumbnail ────
const uploadFields = multer({
  storage: require('multer-storage-cloudinary').CloudinaryStorage
    ? undefined : undefined,
}).none();

// Custom combined upload
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multerMulti = require('multer')({
  storage: new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      if (file.fieldname === 'audio') {
        return { folder: 'vishal-media/audio', resource_type: 'video', quality: 'auto' };
      }
      return { folder: 'vishal-media/thumbnails', resource_type: 'image',
               transformation: [{ width: 400, height: 400, crop: 'fill' }] };
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

// ── GET all songs ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, genre, playlist, sort = '-createdAt', limit = 50, page = 1 } = req.query;
    const query = {};

    if (search) query.$text = { $search: search };
    if (genre)  query.genre = genre;
    if (playlist && playlist !== 'all') query.playlist = playlist;

    const songs = await Song.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Song.countDocuments(query);

    res.json({ success: true, data: songs, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET single song ──────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, message: 'Song not found' });
    res.json({ success: true, data: song });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST upload new song ─────────────────────────────
router.post('/upload',
  multerMulti.fields([
    { name: 'audio',     maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!req.files || !req.files.audio) {
        return res.status(400).json({ success: false, message: 'Audio file is required' });
      }

      const audioFile     = req.files.audio[0];
      const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

      const song = await Song.create({
        title:     req.body.title     || audioFile.originalname.replace(/\.[^.]+$/, ''),
        artist:    req.body.artist    || 'Unknown Artist',
        album:     req.body.album     || 'Unknown Album',
        genre:     req.body.genre     || 'Other',
        playlist:  req.body.playlist  || 'All Songs',
        duration:  parseInt(req.body.duration) || 0,
        audioUrl:      audioFile.path,
        audioPublicId: audioFile.filename,
        thumbnailUrl:      thumbnailFile ? thumbnailFile.path      : '',
        thumbnailPublicId: thumbnailFile ? thumbnailFile.filename  : '',
      });

      res.status(201).json({ success: true, data: song, message: 'Song uploaded successfully!' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── PATCH increment play count ───────────────────────
router.patch('/:id/play', async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { $inc: { plays: 1 } },
      { new: true }
    );
    res.json({ success: true, plays: song.plays });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH toggle like ────────────────────────────────
router.patch('/:id/like', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, message: 'Not found' });

    song.isLiked = !song.isLiked;
    song.likes   = song.isLiked ? song.likes + 1 : Math.max(0, song.likes - 1);
    await song.save();

    res.json({ success: true, isLiked: song.isLiked, likes: song.likes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE song ──────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, message: 'Not found' });

    // Delete from Cloudinary
    if (song.audioPublicId)     await cloudinary.uploader.destroy(song.audioPublicId, { resource_type: 'video' });
    if (song.thumbnailPublicId) await cloudinary.uploader.destroy(song.thumbnailPublicId);

    await song.deleteOne();
    res.json({ success: true, message: 'Song deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET liked songs ──────────────────────────────────
router.get('/filter/liked', async (req, res) => {
  try {
    const songs = await Song.find({ isLiked: true }).sort('-updatedAt');
    res.json({ success: true, data: songs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
