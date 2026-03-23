/**
 * routes/playlists.js
 * Playlist CRUD routes.
 */

const express  = require('express');
const router   = express.Router();
const Playlist = require('../models/Playlist');
const Song     = require('../models/Song');

// GET all playlists
router.get('/', async (req, res) => {
  try {
    const playlists = await Playlist.find().sort('-createdAt').populate('songs', 'title artist thumbnailUrl');
    res.json({ success: true, data: playlists });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single playlist with songs
router.get('/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id).populate('songs');
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found' });
    res.json({ success: true, data: playlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create playlist
router.post('/', async (req, res) => {
  try {
    const playlist = await Playlist.create({
      name:        req.body.name,
      description: req.body.description || '',
    });
    res.status(201).json({ success: true, data: playlist });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH add song to playlist
router.patch('/:id/add-song', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Not found' });

    const { songId } = req.body;
    if (!playlist.songs.includes(songId)) {
      playlist.songs.push(songId);
      await playlist.save();
      // Update song's playlist field
      await Song.findByIdAndUpdate(songId, { playlist: playlist.name });
    }
    res.json({ success: true, data: playlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH remove song from playlist
router.patch('/:id/remove-song', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Not found' });

    playlist.songs = playlist.songs.filter(s => s.toString() !== req.body.songId);
    await playlist.save();
    res.json({ success: true, data: playlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE playlist
router.delete('/:id', async (req, res) => {
  try {
    await Playlist.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Playlist deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
