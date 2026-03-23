/**
 * models/Playlist.js
 * MongoDB schema for playlists.
 */

const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Playlist name is required'],
    trim: true,
  },
  description: { type: String, default: '' },
  coverUrl:    { type: String, default: '' },
  songs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
  }],
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Playlist', playlistSchema);
