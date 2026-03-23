/**
 * models/Video.js
 * MongoDB schema for video files.
 */

const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  creator: {
    type: String,
    default: 'Unknown',
    trim: true,
  },
  category: {
    type: String,
    default: 'Other',
    enum: ['Music Video', 'Short Film', 'Documentary', 'Tutorial',
           'Vlog', 'Animation', 'Live Performance', 'Other'],
  },
  duration: {
    type: Number,   // in seconds
    default: 0,
  },
  // Cloudinary fields
  videoUrl:    { type: String, required: true },
  videoPublicId: { type: String },
  thumbnailUrl:  { type: String, default: '' },
  thumbnailPublicId: { type: String },

  // Engagement
  views:   { type: Number, default: 0 },
  likes:   { type: Number, default: 0 },
  isLiked: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

videoSchema.index({ title: 'text', creator: 'text', description: 'text' });

module.exports = mongoose.model('Video', videoSchema);
