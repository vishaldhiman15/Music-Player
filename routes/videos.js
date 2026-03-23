/**
 * routes/videos.js
 * All video API routes.
 */

const express  = require('express');
const router   = express.Router();
const Video    = require('../models/Video');
const { cloudinary } = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer   = require('multer');

const videoMulter = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      if (file.fieldname === 'video') {
        return { folder: 'vishal-media/video', resource_type: 'video', quality: 'auto' };
      }
      return {
        folder: 'vishal-media/thumbnails', resource_type: 'image',
        transformation: [{ width: 640, height: 360, crop: 'fill' }],
      };
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
});

// ── GET all videos ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, category, sort = '-createdAt', limit = 30, page = 1 } = req.query;
    const query = {};
    if (search)   query.$text     = { $search: search };
    if (category) query.category  = category;

    const videos = await Video.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Video.countDocuments(query);
    res.json({ success: true, data: videos, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET single video ─────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });
    res.json({ success: true, data: video });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST upload video ────────────────────────────────
router.post('/upload',
  videoMulter.fields([
    { name: 'video',     maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!req.files || !req.files.video) {
        return res.status(400).json({ success: false, message: 'Video file is required' });
      }

      const videoFile     = req.files.video[0];
      const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

      const video = await Video.create({
        title:       req.body.title       || videoFile.originalname.replace(/\.[^.]+$/, ''),
        description: req.body.description || '',
        creator:     req.body.creator     || 'Unknown',
        category:    req.body.category    || 'Other',
        duration:    parseInt(req.body.duration) || 0,
        videoUrl:      videoFile.path,
        videoPublicId: videoFile.filename,
        thumbnailUrl:      thumbnailFile ? thumbnailFile.path     : '',
        thumbnailPublicId: thumbnailFile ? thumbnailFile.filename : '',
      });

      res.status(201).json({ success: true, data: video, message: 'Video uploaded successfully!' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── PATCH increment views ────────────────────────────
router.patch('/:id/view', async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id, { $inc: { views: 1 } }, { new: true }
    );
    res.json({ success: true, views: video.views });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH toggle like ────────────────────────────────
router.patch('/:id/like', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Not found' });

    video.isLiked = !video.isLiked;
    video.likes   = video.isLiked ? video.likes + 1 : Math.max(0, video.likes - 1);
    await video.save();

    res.json({ success: true, isLiked: video.isLiked, likes: video.likes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE video ─────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Not found' });

    if (video.videoPublicId)     await cloudinary.uploader.destroy(video.videoPublicId, { resource_type: 'video' });
    if (video.thumbnailPublicId) await cloudinary.uploader.destroy(video.thumbnailPublicId);

    await video.deleteOne();
    res.json({ success: true, message: 'Video deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
