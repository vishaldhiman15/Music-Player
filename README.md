# 🎵 Resonate — Full-Stack Music & Video Player

A premium AMOLED dark media player with MongoDB + Cloudinary + Multer.

## 📁 Project Structure

```
vishal-media/
├── server.js              ← Express entry point
├── .env                   ← Your credentials (fill this!)
├── package.json
│
├── config/
│   ├── db.js              ← MongoDB connection
│   └── cloudinary.js      ← Cloudinary + Multer setup
│
├── models/
│   ├── Song.js            ← Audio schema
│   ├── Video.js           ← Video schema
│   └── Playlist.js        ← Playlist schema
│
├── routes/
│   ├── songs.js           ← Audio API routes
│   ├── videos.js          ← Video API routes
│   └── playlists.js       ← Playlist API routes
│
└── public/
    ├── index.html         ← Frontend UI
    ├── css/style.css      ← Full AMOLED dark UI
    └── js/app.js          ← Frontend logic
```

## 🚀 Setup & Run

### 1. Install dependencies
```bash
npm install
```

### 2. Configure `.env`
```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/vishal-media
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
```

### 3. Get credentials

**MongoDB Atlas (free):**
- Go to mongodb.com/atlas → Create free cluster
- Database Access → Add user
- Network Access → Allow all IPs
- Connect → Get connection string

**Cloudinary (free):**
- Go to cloudinary.com → Sign up free
- Dashboard → Copy Cloud Name, API Key, API Secret

### 4. Run the server
```bash
npm run dev    # development (with nodemon)
npm start      # production
```

Open: http://localhost:5000

## 🎯 Features

| Feature | Details |
|---------|---------|
| 🎵 Music Upload | Multer → Cloudinary, MP3/WAV/FLAC/OGG |
| 🎬 Video Upload | Multer → Cloudinary, MP4/MOV/AVI/WebM |
| ▶ Music Player | Full controls, shuffle, repeat, volume |
| 📊 Waveform | Animated visualizer bars |
| ❤️ Like Songs | Like/unlike, liked songs section |
| 📋 Playlists | Create, manage playlists |
| 🔍 Search | Real-time search across titles/artists |
| 🎛 Filters | Genre, category, sort filters |
| ⌨️ Shortcuts | Space=play, ←→=skip, L=like, Esc=close |

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `→` | Next song |
| `←` | Previous / Restart |
| `L` | Like current song |
| `Esc` | Close modal / video |

## 📡 API Endpoints

### Songs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/songs | Get all songs |
| GET | /api/songs/:id | Get single song |
| POST | /api/songs/upload | Upload song (multipart) |
| PATCH | /api/songs/:id/play | Increment play count |
| PATCH | /api/songs/:id/like | Toggle like |
| DELETE | /api/songs/:id | Delete song |
| GET | /api/songs/filter/liked | Get liked songs |

### Videos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/videos | Get all videos |
| POST | /api/videos/upload | Upload video (multipart) |
| PATCH | /api/videos/:id/view | Increment views |
| PATCH | /api/videos/:id/like | Toggle like |
| DELETE | /api/videos/:id | Delete video |

### Playlists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/playlists | Get all playlists |
| POST | /api/playlists | Create playlist |
| PATCH | /api/playlists/:id/add-song | Add song |
| DELETE | /api/playlists/:id | Delete playlist |
# Music-Player
