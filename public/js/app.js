/**
 * app.js — Resonate Frontend
 * Full music & video player with API integration.
 */

const API = '';  // empty = same origin

// ── STATE ────────────────────────────────────────────
let songs       = [];
let videos      = [];
let queue       = [];
let currentIdx  = -1;
let currentSong = null;
let currentVideoId = null;
let isPlaying   = false;
let isShuffle   = false;
let isRepeat    = false;
let uploadType  = 'audio';
let searchTimer = null;

// ── DOM REFS ─────────────────────────────────────────
const audioEl     = document.getElementById('audio-el');
const playBtn     = document.getElementById('play-btn');
const progressFill= document.getElementById('progress-fill');
const progressThumb=document.getElementById('progress-thumb');
const currentTime = document.getElementById('current-time');
const totalTime   = document.getElementById('total-time');
const waveform    = document.getElementById('waveform');

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadSongs();
  loadVideos();
  loadPlaylists();
  setupAudioListeners();
  setVolume(80);
});

// ══════════════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════════════
function switchTab(tab, el) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  if (el) el.classList.add('active');

  if (tab === 'liked')     loadLiked();
  if (tab === 'playlists') loadPlaylists();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar').classList.toggle('hidden');
}

// ══════════════════════════════════════════════════════
//  STATS
// ══════════════════════════════════════════════════════
async function loadStats() {
  try {
    const res  = await fetch(`${API}/api/stats`);
    const data = await res.json();
    if (data.success) {
      document.getElementById('stat-songs').textContent  = data.data.songs;
      document.getElementById('stat-videos').textContent = data.data.videos;
      document.getElementById('stat-liked').textContent  = data.data.liked;
    }
  } catch (e) { console.warn('Stats error:', e); }
}

// ══════════════════════════════════════════════════════
//  SONGS
// ══════════════════════════════════════════════════════
async function loadSongs() {
  const grid   = document.getElementById('songs-grid');
  const genre  = document.getElementById('genre-filter').value;
  const sort   = document.getElementById('sort-filter').value;
  const search = document.getElementById('search-input').value;

  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading songs...</p></div>`;

  try {
    let url = `${API}/api/songs?sort=${sort}`;
    if (genre)  url += `&genre=${encodeURIComponent(genre)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res  = await fetch(url);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    songs = data.data;
    queue = [...songs];
    document.getElementById('music-count').textContent = `${songs.length} song${songs.length !== 1 ? 's' : ''}`;

    if (!songs.length) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🎵</div><p>No songs found</p><p class="empty-hint">Upload your first track above!</p></div>`;
      return;
    }
    grid.innerHTML = songs.map((s, i) => songCard(s, i)).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function songCard(song, idx) {
  const thumb  = song.thumbnailUrl
    ? `<img src="${song.thumbnailUrl}" alt="${song.title}" loading="lazy"/>`
    : '';
  const playing = currentSong && currentSong._id === song._id;
  return `
    <div class="song-card ${playing ? 'playing' : ''}" id="scard-${song._id}" onclick="playSongAt(${idx})">
      <div class="song-cover">
        ${thumb || '🎵'}
        <div class="song-play-overlay">
          <div class="song-play-icon">${playing && isPlaying ? '⏸' : '▶'}</div>
        </div>
        ${playing ? `<div class="playing-indicator"><span></span><span></span><span></span></div>` : ''}
      </div>
      <div class="song-body">
        <div class="song-title">${song.title}</div>
        <div class="song-artist">${song.artist}</div>
        <div class="song-meta">
          <span class="song-genre">${song.genre}</span>
          <div class="song-actions">
            <button class="song-like-btn ${song.isLiked ? 'liked' : ''}"
              onclick="event.stopPropagation();toggleSongLike('${song._id}',this)">
              ${song.isLiked ? '❤️' : '♡'}
            </button>
            <button class="song-del-btn"
              onclick="event.stopPropagation();deleteSong('${song._id}')">🗑</button>
          </div>
        </div>
        <div class="song-plays">${song.plays} plays</div>
      </div>
    </div>`;
}

async function playSongAt(idx) {
  currentIdx  = idx;
  currentSong = queue[idx];
  await playSong(currentSong);
}

async function playSong(song) {
  if (!song) return;
  currentSong = song;

  // Update play count
  fetch(`${API}/api/songs/${song._id}/play`, { method: 'PATCH' }).catch(() => {});

  // Set audio source
  audioEl.src = song.audioUrl;
  audioEl.load();
  audioEl.play().then(() => {
    isPlaying = true;
    updatePlayerUI(song);
    updatePlayingState();
  }).catch(err => {
    console.warn('Play error:', err);
    showToast('Could not play this track', 'error');
  });
}

function updatePlayerUI(song) {
  document.getElementById('player-title').textContent  = song.title;
  document.getElementById('player-artist').textContent = song.artist;

  const thumb = document.getElementById('player-thumb');
  if (song.thumbnailUrl) {
    thumb.style.backgroundImage = `url(${song.thumbnailUrl})`;
    thumb.textContent = '';
  } else {
    thumb.style.backgroundImage = '';
    thumb.textContent = '🎵';
  }

  const likeBtn = document.getElementById('player-like-btn');
  likeBtn.textContent = song.isLiked ? '❤️' : '♡';
  likeBtn.classList.toggle('liked', song.isLiked);

  // Now playing bar
  const npb = document.getElementById('now-playing-bar');
  npb.style.display = 'flex';
  document.getElementById('npb-title').textContent  = song.title;
  document.getElementById('npb-artist').textContent = song.artist;
  const npbThumb = document.getElementById('npb-thumb');
  if (song.thumbnailUrl) {
    npbThumb.style.backgroundImage = `url(${song.thumbnailUrl})`;
    npbThumb.textContent = '';
  } else {
    npbThumb.style.backgroundImage = '';
    npbThumb.textContent = '🎵';
  }
}

function updatePlayingState() {
  playBtn.textContent = isPlaying ? '⏸' : '▶';
  waveform.classList.toggle('playing', isPlaying);

  // Highlight active card
  document.querySelectorAll('.song-card').forEach(c => c.classList.remove('playing'));
  if (currentSong) {
    const card = document.getElementById(`scard-${currentSong._id}`);
    if (card) card.classList.add('playing');
  }
}

// ── PLAYBACK CONTROLS ────────────────────────────────
function togglePlay() {
  if (!currentSong && songs.length) { playSongAt(0); return; }
  if (!currentSong) return;

  if (isPlaying) {
    audioEl.pause();
    isPlaying = false;
  } else {
    audioEl.play();
    isPlaying = true;
  }
  updatePlayingState();
}

function nextSong() {
  if (!queue.length) return;
  if (isShuffle) {
    currentIdx = Math.floor(Math.random() * queue.length);
  } else {
    currentIdx = (currentIdx + 1) % queue.length;
  }
  playSongAt(currentIdx);
}

function prevSong() {
  if (!queue.length) return;
  if (audioEl.currentTime > 3) { audioEl.currentTime = 0; return; }
  currentIdx = (currentIdx - 1 + queue.length) % queue.length;
  playSongAt(currentIdx);
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  document.getElementById('shuffle-btn').classList.toggle('active', isShuffle);
  showToast(isShuffle ? 'Shuffle On' : 'Shuffle Off');
}

function toggleRepeat() {
  isRepeat = !isRepeat;
  document.getElementById('repeat-btn').classList.toggle('active', isRepeat);
  showToast(isRepeat ? 'Repeat On' : 'Repeat Off');
}

function seekTo(e) {
  const bar   = document.getElementById('progress-bar');
  const rect  = bar.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  audioEl.currentTime = ratio * audioEl.duration;
}

function setVolume(val) {
  audioEl.volume = val / 100;
  const icon = document.querySelector('.vol-icon');
  if (icon) icon.textContent = val == 0 ? '🔇' : val < 50 ? '🔉' : '🔊';
}

// ── AUDIO EVENT LISTENERS ────────────────────────────
function setupAudioListeners() {
  audioEl.addEventListener('timeupdate', () => {
    if (!audioEl.duration) return;
    const pct = (audioEl.currentTime / audioEl.duration) * 100;
    progressFill.style.width  = pct + '%';
    progressThumb.style.left  = pct + '%';
    currentTime.textContent   = formatTime(audioEl.currentTime);
    totalTime.textContent     = formatTime(audioEl.duration);
  });

  audioEl.addEventListener('ended', () => {
    if (isRepeat) { audioEl.currentTime = 0; audioEl.play(); return; }
    nextSong();
  });

  audioEl.addEventListener('play',  () => { isPlaying = true;  updatePlayingState(); });
  audioEl.addEventListener('pause', () => { isPlaying = false; updatePlayingState(); });

  audioEl.addEventListener('error', () => {
    showToast('Error loading audio', 'error');
    isPlaying = false;
    updatePlayingState();
  });
}

// ── LIKE ─────────────────────────────────────────────
async function toggleSongLike(id, btn) {
  try {
    const res  = await fetch(`${API}/api/songs/${id}/like`, { method: 'PATCH' });
    const data = await res.json();
    if (data.success) {
      btn.textContent = data.isLiked ? '❤️' : '♡';
      btn.classList.toggle('liked', data.isLiked);
      const s = songs.find(x => x._id === id);
      if (s) s.isLiked = data.isLiked;
      if (currentSong && currentSong._id === id) {
        currentSong.isLiked = data.isLiked;
        const pb = document.getElementById('player-like-btn');
        pb.textContent = data.isLiked ? '❤️' : '♡';
        pb.classList.toggle('liked', data.isLiked);
      }
      showToast(data.isLiked ? '❤️ Added to liked' : 'Removed from liked');
      loadStats();
    }
  } catch (e) { showToast('Error', 'error'); }
}

async function toggleCurrentLike() {
  if (!currentSong) return;
  const btn = document.getElementById('player-like-btn');
  const card = document.querySelector(`#scard-${currentSong._id} .song-like-btn`);
  await toggleSongLike(currentSong._id, btn);
  if (card) { card.textContent = currentSong.isLiked ? '❤️' : '♡'; card.classList.toggle('liked', currentSong.isLiked); }
}

// ── DELETE SONG ──────────────────────────────────────
async function deleteSong(id) {
  if (!confirm('Delete this song? This cannot be undone.')) return;
  try {
    const res  = await fetch(`${API}/api/songs/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Song deleted', 'success');
      if (currentSong && currentSong._id === id) {
        audioEl.pause(); currentSong = null; isPlaying = false;
        document.getElementById('player-title').textContent  = 'No song selected';
        document.getElementById('player-artist').textContent = '—';
        updatePlayingState();
      }
      loadSongs(); loadStats();
    }
  } catch (e) { showToast('Delete failed', 'error'); }
}

// ── LIKED SONGS ──────────────────────────────────────
async function loadLiked() {
  const grid = document.getElementById('liked-grid');
  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>`;
  try {
    const res  = await fetch(`${API}/api/songs/filter/liked`);
    const data = await res.json();
    const liked = data.data || [];
    document.getElementById('liked-count').textContent = `${liked.length} songs`;
    if (!liked.length) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">❤️</div><p>No liked songs yet</p><p class="empty-hint">Hit ♡ on any song to add it here!</p></div>`;
      return;
    }
    // Use same queue for liked
    queue = liked;
    grid.innerHTML = liked.map((s, i) => songCard(s, i)).join('');
  } catch (e) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Could not load liked songs</p></div>`;
  }
}

// ══════════════════════════════════════════════════════
//  VIDEOS
// ══════════════════════════════════════════════════════
async function loadVideos() {
  const grid     = document.getElementById('videos-grid');
  const category = document.getElementById('category-filter').value;
  const sort     = document.getElementById('vsort-filter').value;
  const search   = document.getElementById('search-input').value;

  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading videos...</p></div>`;

  try {
    let url = `${API}/api/videos?sort=${sort}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (search)   url += `&search=${encodeURIComponent(search)}`;

    const res  = await fetch(url);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    videos = data.data;
    document.getElementById('video-count').textContent = `${videos.length} video${videos.length !== 1 ? 's' : ''}`;

    if (!videos.length) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🎬</div><p>No videos found</p><p class="empty-hint">Upload your first video above!</p></div>`;
      return;
    }
    grid.innerHTML = videos.map(v => videoCard(v)).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function videoCard(video) {
  const thumb = video.thumbnailUrl
    ? `<img src="${video.thumbnailUrl}" alt="${video.title}" loading="lazy"/>`
    : '';
  const dur = video.duration ? formatTime(video.duration) : '';
  return `
    <div class="video-card" onclick="playVideo('${video._id}')">
      <div class="video-thumb">
        ${thumb || '🎬'}
        <div class="video-play-overlay">
          <div class="video-play-icon">▶</div>
        </div>
        ${dur ? `<span class="video-duration">${dur}</span>` : ''}
      </div>
      <div class="video-body">
        <div class="video-title">${video.title}</div>
        <div class="video-creator">${video.creator}</div>
        <div class="video-meta">
          <span class="video-cat">${video.category}</span>
          <span class="video-views">👁 ${video.views}</span>
          <button class="video-del-btn" onclick="event.stopPropagation();deleteVideo('${video._id}')">🗑</button>
        </div>
      </div>
    </div>`;
}

async function playVideo(id) {
  const video = videos.find(v => v._id === id);
  if (!video) return;

  currentVideoId = id;

  // Pause audio if playing
  if (isPlaying) { audioEl.pause(); isPlaying = false; updatePlayingState(); }

  const wrap = document.getElementById('video-player-wrap');
  const vid  = document.getElementById('main-video');
  wrap.style.display = 'block';
  vid.src = video.videoUrl;
  vid.load();
  vid.play().catch(() => {});

  document.getElementById('vp-title').textContent   = video.title;
  document.getElementById('vp-creator').textContent = `${video.creator} · ${video.category}`;
  document.getElementById('vp-views').textContent   = `${video.views} views`;

  const likeBtn = document.getElementById('vp-like-btn');
  likeBtn.textContent = video.isLiked ? '❤️ Liked' : '♡ Like';
  likeBtn.classList.toggle('liked', video.isLiked);

  // Increment view
  fetch(`${API}/api/videos/${id}/view`, { method: 'PATCH' }).then(() => {
    video.views++;
    document.getElementById('vp-views').textContent = `${video.views} views`;
  }).catch(() => {});

  // Scroll to player
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeVideoPlayer() {
  const vid  = document.getElementById('main-video');
  const wrap = document.getElementById('video-player-wrap');
  vid.pause();
  vid.src = '';
  wrap.style.display = 'none';
  currentVideoId = null;
}

async function toggleVideoLike() {
  if (!currentVideoId) return;
  try {
    const res  = await fetch(`${API}/api/videos/${currentVideoId}/like`, { method: 'PATCH' });
    const data = await res.json();
    if (data.success) {
      const btn = document.getElementById('vp-like-btn');
      btn.textContent = data.isLiked ? '❤️ Liked' : '♡ Like';
      btn.classList.toggle('liked', data.isLiked);
      const v = videos.find(x => x._id === currentVideoId);
      if (v) v.isLiked = data.isLiked;
      showToast(data.isLiked ? '❤️ Liked!' : 'Unliked');
    }
  } catch (e) { showToast('Error', 'error'); }
}

async function deleteVideo(id) {
  if (!confirm('Delete this video?')) return;
  try {
    const res  = await fetch(`${API}/api/videos/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Video deleted', 'success');
      if (currentVideoId === id) closeVideoPlayer();
      loadVideos(); loadStats();
    }
  } catch (e) { showToast('Delete failed', 'error'); }
}

// ══════════════════════════════════════════════════════
//  PLAYLISTS
// ══════════════════════════════════════════════════════
async function loadPlaylists() {
  const grid = document.getElementById('playlists-grid');
  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>`;
  try {
    const res  = await fetch(`${API}/api/playlists`);
    const data = await res.json();
    const pls  = data.data || [];
    if (!pls.length) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No playlists yet</p><p class="empty-hint">Create your first playlist!</p></div>`;
      return;
    }
    grid.innerHTML = pls.map(pl => `
      <div class="playlist-card">
        <button class="pl-delete" onclick="event.stopPropagation();deletePlaylist('${pl._id}')">🗑</button>
        <div class="pl-icon">📋</div>
        <div class="pl-name">${pl.name}</div>
        <div class="pl-count">${pl.songs.length} songs</div>
      </div>`).join('');
  } catch (e) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Could not load playlists</p></div>`;
  }
}

function openCreatePlaylist() {
  document.getElementById('playlist-modal').classList.add('open');
  document.getElementById('pl-name').focus();
}

async function createPlaylist(e) {
  e.preventDefault();
  const name = document.getElementById('pl-name').value.trim();
  const desc = document.getElementById('pl-desc').value.trim();
  if (!name) return;
  try {
    const res  = await fetch(`${API}/api/playlists`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, description: desc }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Playlist "${name}" created!`, 'success');
      closeModal('playlist-modal');
      document.getElementById('pl-name').value = '';
      document.getElementById('pl-desc').value = '';
      loadPlaylists();
    }
  } catch (e) { showToast('Error creating playlist', 'error'); }
}

async function deletePlaylist(id) {
  if (!confirm('Delete this playlist?')) return;
  try {
    await fetch(`${API}/api/playlists/${id}`, { method: 'DELETE' });
    showToast('Playlist deleted');
    loadPlaylists();
  } catch (e) { showToast('Error', 'error'); }
}

// ══════════════════════════════════════════════════════
//  UPLOAD
// ══════════════════════════════════════════════════════
function openUploadModal(type) {
  uploadType = type;
  const isAudio = type === 'audio';
  document.getElementById('modal-title').textContent = isAudio ? '🎵 Upload Music' : '🎬 Upload Video';
  document.getElementById('dz-icon').textContent     = isAudio ? '🎵' : '🎬';
  document.getElementById('dz-sub').textContent      = isAudio
    ? 'MP3, WAV, FLAC, OGG, M4A supported (max 50MB)'
    : 'MP4, MOV, AVI, MKV, WebM supported (max 500MB)';

  // Toggle fields
  document.getElementById('artist-wrap').style.display   = isAudio ? '' : 'none';
  document.getElementById('album-wrap').style.display    = isAudio ? '' : 'none';
  document.getElementById('genre-wrap').style.display    = isAudio ? '' : 'none';
  document.getElementById('creator-wrap').style.display  = isAudio ? 'none' : '';
  document.getElementById('category-wrap').style.display = isAudio ? 'none' : '';

  // File input accept
  document.getElementById('file-input').accept = isAudio ? 'audio/*' : 'video/*';
  document.getElementById('file-input').name   = isAudio ? 'audio' : 'video';

  document.getElementById('upload-modal').classList.add('open');
}

function fileSelected(input) {
  const file = input.files[0];
  if (!file) return;
  const icon = document.getElementById('dz-icon');
  const text = document.getElementById('dz-text');
  const sub  = document.getElementById('dz-sub');
  icon.textContent = uploadType === 'audio' ? '🎵' : '🎬';
  text.textContent = file.name;
  sub.textContent  = `${(file.size / 1024 / 1024).toFixed(1)} MB`;

  // Auto-fill title
  const titleInput = document.getElementById('upload-title');
  if (!titleInput.value) {
    titleInput.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  }
}

function thumbSelected(input) {
  const file    = input.files[0];
  const preview = document.getElementById('thumb-preview');
  const ph      = document.getElementById('thumb-placeholder');
  if (file) {
    const url  = URL.createObjectURL(file);
    preview.src = url;
    preview.style.display = 'block';
    ph.style.display = 'none';
  }
}

function dragOver(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.add('dragover');
}
function dragLeave(e) {
  document.getElementById('dropzone').classList.remove('dragover');
}
function dropFile(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.remove('dragover');
  const file  = e.dataTransfer.files[0];
  const input = document.getElementById('file-input');
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    fileSelected(input);
  }
}

async function handleUpload(e) {
  e.preventDefault();
  const form   = document.getElementById('upload-form');
  const btn    = document.getElementById('upload-btn');
  const btnTxt = document.getElementById('upload-btn-text');
  const prog   = document.getElementById('upload-progress');
  const fill   = document.getElementById('up-fill');
  const upTxt  = document.getElementById('up-text');

  const fileInput = document.getElementById('file-input');
  if (!fileInput.files.length) {
    showToast('Please select a file', 'error'); return;
  }

  const formData = new FormData(form);
  const endpoint = uploadType === 'audio' ? '/api/songs/upload' : '/api/videos/upload';

  btn.disabled   = true;
  btnTxt.textContent = 'Uploading...';
  prog.style.display = 'block';

  // Fake progress animation
  let fakeProgress = 0;
  const fakeTimer = setInterval(() => {
    fakeProgress = Math.min(fakeProgress + Math.random() * 15, 85);
    fill.style.width  = fakeProgress + '%';
    upTxt.textContent = `Uploading... ${Math.round(fakeProgress)}%`;
  }, 400);

  try {
    const res  = await fetch(`${API}${endpoint}`, { method: 'POST', body: formData });
    const data = await res.json();

    clearInterval(fakeTimer);
    fill.style.width  = '100%';
    upTxt.textContent = 'Upload complete!';

    if (data.success) {
      setTimeout(() => {
        closeModal('upload-modal');
        form.reset();
        document.getElementById('thumb-preview').style.display = 'none';
        document.getElementById('thumb-placeholder').style.display = 'block';
        prog.style.display = 'none';
        fill.style.width   = '0%';
        btn.disabled       = false;
        btnTxt.textContent = '🚀 Upload';
        document.getElementById('upload-title').value = '';
        document.getElementById('dz-text').textContent = 'Drag & drop or click to select';

        showToast(data.message || 'Uploaded successfully!', 'success');
        if (uploadType === 'audio') loadSongs();
        else loadVideos();
        loadStats();
      }, 600);
    } else {
      throw new Error(data.message || 'Upload failed');
    }
  } catch (err) {
    clearInterval(fakeTimer);
    prog.style.display = 'none';
    fill.style.width   = '0%';
    btn.disabled       = false;
    btnTxt.textContent = '🚀 Upload';
    showToast(err.message || 'Upload failed', 'error');
  }
}

// ══════════════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════════════
function handleSearch(val) {
  const clearBtn = document.getElementById('search-clear');
  clearBtn.classList.toggle('visible', val.length > 0);
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    loadSongs();
    loadVideos();
  }, 400);
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').classList.remove('visible');
  loadSongs();
  loadVideos();
}

// ══════════════════════════════════════════════════════
//  MODAL HELPERS
// ══════════════════════════════════════════════════════
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
function closeModalOutside(e, id) {
  if (e.target.id === id) closeModal(id);
}

// ══════════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════════
function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

let toastTimer;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowRight') nextSong();
  if (e.code === 'ArrowLeft')  prevSong();
  if (e.code === 'KeyL')       toggleCurrentLike();
  if (e.code === 'Escape')     {
    closeModal('upload-modal');
    closeModal('playlist-modal');
    closeVideoPlayer();
  }
});
