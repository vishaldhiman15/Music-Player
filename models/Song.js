/**
 * models/Song.js
 * MongoDB schema for audio tracks.
 */

const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Song title is required'],
    trim: true,
  },
  artist: {
    type: String,
    default: 'Unknown Artist',
    trim: true,
  },
  album: {
    type: String,
    default: 'Unknown Album',
    trim: true,
  },
  genre: {
    type: String,
    default: 'Other',
    enum: ['Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'Electronic',
           'R&B', 'Country', 'Indie', 'Metal', 'Lo-Fi', 'Other'],
  },
  duration: {
    type: Number,   // in seconds
    default: 0,
  },
  // Cloudinary fields
  audioUrl:    { type: String, required: true },
  audioPublicId: { type: String },
  thumbnailUrl:  { type: String, default: '' },
  thumbnailPublicId: { type: String },

  // Engagement
  plays:     { type: Number, default: 0 },
  likes:     { type: Number, default: 0 },
  isLiked:   { type: Boolean, default: false },

  // Playlist
  playlist:  { type: String, default: 'All Songs' },

  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Text search index
songSchema.index({ title: 'text', artist: 'text', album: 'text', genre: 'text' });

module.exports = mongoose.model('Song', songSchema);
