// Mahadipa 2026 Game - Firestore Version
// Alur: Loading → Lobi tunggu (tanpa tombol mulai) sampai admin buka sesi
//       → Semua peserta masuk bersama: Steko menyambut → Isi data diri → Intro
//       → Dashboard Peserta → tunggu admin buka soal → hitung mundur serentak
//       → Soal individual (timer) → Dashboard / hasil. Admin pantau progres real-time.

let db = null;
let state = {
  player: null,
  playerDocId: null,
  allQuestions: [],          // semua soal dari Firestore
  questionOrder: [],         // urutan id soal yang diacak khusus peserta
  answeredIds: [],           // id soal yang sudah dijawab peserta ini
  currentQuestion: null,     // soal yang sedang dibuka
  score: 0,
  correct: 0,
  startTime: null,           // waktu mulai sesi
  questionStartTime: null,   // waktu mulai soal saat ini
  selectedAnswer: null,
  answered: false,
  isAdmin: false,
  timerInterval: null,
  timeLeft: 0,
  timeLimitCurrent: 45,      // limit soal yang sedang dibuka
  unsubscribeLeaderboard: null,
  unsubscribeDashLeaderboard: null,
  unsubscribeQuestions: null,
  unsubscribeAdminPlayers: null,
  editingQuestionId: null,
  defaultTimeLimit: 45,      // detik default jika soal tidak punya timeLimit
  gameOpen: false,           // true = admin sudah membuka soal
  gameSession: null,         // penanda sesi buka soal terakhir
  gameKnown: false,          // sudah menerima status game pertama kali
  entryOpen: false,          // true = admin sudah membuka pintu masuk (intro bersama)
  entrySession: null,        // penanda sesi buka pintu masuk
  entryKnown: false,         // sudah menerima status entry pertama kali
  activeRound: 1,            // ronde soal aktif (1/2/3)
  roundScores: { 1: 0, 2: 0, 3: 0 },
  totalScore: 0,
  countdownTimer: null,
  unsubscribeGame: null,
  _pendingEntryStart: false, // siap masuk intro saat entry dibuka
  _lobbyReady: false,        // loading selesai, sedang di lobi tunggu
  streak: 0,                 // jawaban benar beruntun
  maxStreak: 0,              // rekor streak sesi ini
  lastScoreGain: 0           // untuk animasi floating score
};

// ========== SOAL KHUSUS JURUSAN (rumpun prodi) ==========
// Soal dengan rumpun "umum" (atau tanpa rumpun) tampil untuk semua prodi.
// Soal dengan rumpun tertentu hanya tampil untuk prodi di rumpun tersebut.
// Prodi "Lainnya" hanya mendapat soal umum.
const PRODI_RUMPUN = {
  'S1 Teknik Informatika': 'informatika',
  'D3 Teknik Informatika': 'informatika',
  'S1 Sistem Informasi': 'sisfo',
  'S1 Sistem Komputer': 'siskom',
  'D3 Teknologi Komputer': 'siskom',
  'S1 Desain Komunikasi Visual': 'dkv',
  'S1 Manajemen': 'manajemen',
  'S1 Bisnis': 'manajemen',
  'S2 Manajemen & Kewirausahaan': 'manajemen',
  'S1 Akuntansi': 'akuntansi',
  'D4 Akuntansi Perpajakan': 'akuntansi',
  'S1 Hukum': 'hukum',
  'S1 Teknik Sipil': 'sipil'
};

function questionAppliesTo(q, prodi) {
  if (!q.rumpun || q.rumpun === 'umum') return true;
  return PRODI_RUMPUN[prodi] === q.rumpun;
}

function sumRoundScoresObj(rs) {
  rs = rs || {};
  return [1, 2, 3].reduce((s, k) => s + (Number(rs[k]) || Number(rs[String(k)]) || 0), 0);
}

function buildRoundScoreUpdate(scoreForCurrentRound) {
  const round = state.activeRound || 1;
  const rs = { 1: 0, 2: 0, 3: 0, ...(state.roundScores || {}) };
  rs[round] = scoreForCurrentRound;
  rs[String(round)] = scoreForCurrentRound;
  const total = sumRoundScoresObj(rs);
  state.roundScores = rs;
  state.totalScore = total;
  return { roundScores: rs, totalScore: total, currentRound: round };
}


// Soal yang berlaku untuk prodi tertentu (tanpa prodi = semua soal, dipakai admin)
function questionsForProdi(prodi) {
  if (!prodi) return state.allQuestions;
  return state.allQuestions.filter(q => questionAppliesTo(q, prodi));
}

function playerQuestions() {
  return questionsForProdi(state.player && state.player.prodi);
}

// Normalisasi jawaban isian: "Rp 1.000" -> "1000", "3,2" -> "3.2", huruf besar, buang simbol
function normalizeAnswer(s) {
  let t = String(s == null ? '' : s).toUpperCase().trim();
  t = t.replace(/\bRP\.?\s*/g, '');
  t = t.replace(/(\d)\.(?=\d{3}(\D|$))/g, '$1');
  t = t.replace(/(\d),(\d)/g, '$1.$2');
  t = t.replace(/[^A-Z0-9.\s%\/]/g, '').replace(/\s+/g, ' ').trim();
  return t;
}

// ========== SESI PESERTA (tidak perlu login ulang saat refresh) ==========
const SESSION_KEY = 'mahadipa_session';
const QSTART_KEY = 'mahadipa_qstart';

function saveSession(docId, nama, prodi) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ docId, nama, prodi })); } catch (e) {}
}
function loadSession() {
  try {
    const sess = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return sess && sess.docId && sess.docId !== 'demo-local' && sess.nama ? sess : null;
  } catch (e) { return null; }
}
function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(QSTART_KEY);
  } catch (e) {}
}

// Waktu mulai soal yang sedang berjalan, supaya refresh tidak mengulang timer dari awal
function saveQuestionStart(docId, qid, t) {
  try { localStorage.setItem(QSTART_KEY, JSON.stringify({ docId, qid, t })); } catch (e) {}
}
function loadQuestionStart() {
  try { return JSON.parse(localStorage.getItem(QSTART_KEY) || 'null'); } catch (e) { return null; }
}
function clearQuestionStart() {
  try { localStorage.removeItem(QSTART_KEY); } catch (e) {}
}

function waitForQuestions(maxMs) {
  return new Promise((resolve) => {
    if (state.questionsLoaded) return resolve();
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (state.questionsLoaded || Date.now() - t0 > maxMs) { clearInterval(iv); resolve(); }
    }, 100);
  });
}

// Pulihkan pemain dari sesi tersimpan. true = berhasil, false = data pemain sudah tidak ada.
// Melempar error jika server belum bisa dijangkau (supaya bisa dicoba lagi).
async function restoreSession(sess) {
  const doc = await db.collection(COLLECTION_PLAYERS).doc(sess.docId).get();
  if (!doc.exists) { clearSession(); return false; }
  const playerData = doc.data();

  // Jangan tahan lama: tunggu soal max 400ms, lanjut pakai yang ada / seed
  await waitForQuestions(400);
  if (!state.allQuestions.length) {
    try { useLocalSeedQuestions(); } catch (e) {}
  }

  state.player = playerData;
  state.playerDocId = doc.id;
  state.score = playerData.score || 0;
  state.roundScores = playerData.roundScores && typeof playerData.roundScores === 'object'
    ? { 1: 0, 2: 0, 3: 0, ...playerData.roundScores }
    : { 1: 0, 2: 0, 3: 0 };
  state.totalScore = playerData.totalScore != null ? playerData.totalScore : sumRoundScoresObj(state.roundScores);
  if (playerData.currentRound) state.activeRound = Number(playerData.currentRound) || state.activeRound;
  state.correct = playerData.correct || 0;
  state.answeredIds = Array.isArray(playerData.answeredIds) ? [...playerData.answeredIds] : [];
  state.questionOrder = Array.isArray(playerData.questionOrder) ? [...playerData.questionOrder] : [];
  state.startTime = Date.now() - ((playerData.timeSpent || 0) * 1000);
  ensureQuestionOrder();
  db.collection(COLLECTION_PLAYERS).doc(doc.id).update({
    lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(() => {});
  return true;
}

// ========== INIT FIREBASE ==========
function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK belum termuat');
      return false;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    return true;
  } catch (e) {
    console.error('Gagal init Firebase:', e);
    return false;
  }
}

// ========== UTILITIES ==========
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');

  // Bot mengambang hanya di welcome & result
  const botFloat = document.getElementById('bot-float');
  if (id === 'screen-dashboard' || id === 'screen-result') {
    botFloat.classList.remove('hidden');
  } else {
    botFloat.classList.add('hidden');
  }

  // Stop timer kalau pindah layar
  if (id !== 'screen-game') {
    stopTimer();
  }

  if (typeof stopStekoVoice === 'function' && id !== 'screen-welcome' && id !== 'screen-intro' && id !== 'screen-player-dashboard') {
    stopStekoVoice();
  }

  // Backsound mode per layar
  if (typeof setBgmMode === 'function') {
    if (id === 'screen-game') {
      // mode sudah diatur di openQuestion
    } else if (id === 'screen-result') {
      setBgmMode('ambient');
    } else {
      setBgmMode('ambient');
    }
  }
}


function formatTime(seconds) {
  if (seconds < 60) return seconds + 's';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + 'm ' + s + 's';
}

function formatTimerDisplay(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}


// ========== QUESTION ORDER (acak sekali, kunci berurutan) ==========
function getOrderedQuestions() {
  // Bangun list soal sesuai questionOrder peserta; fallback ke allQuestions
  const byId = {};
  playerQuestions().forEach(q => { byId[q.id] = q; });
  if (state.questionOrder && state.questionOrder.length) {
    const ordered = state.questionOrder.map(id => byId[id]).filter(Boolean);
    // Tambahkan soal baru yang belum ada di order (admin menambah soal di tengah jalan)
    const known = new Set(state.questionOrder);
    playerQuestions().forEach(q => {
      if (!known.has(q.id)) ordered.push(q);
    });
    return ordered;
  }
  return [...playerQuestions()];
}

function ensureQuestionOrder() {
  // Jika belum punya order, atau order kosong, buat acak dari allQuestions
  if (!state.questionOrder || state.questionOrder.length === 0) {
    if (playerQuestions().length === 0) return;
    state.questionOrder = shuffleArray(playerQuestions().map(q => q.id));
    // Simpan ke Firestore (async, fire-and-forget)
    if (db && state.playerDocId) {
      db.collection(COLLECTION_PLAYERS).doc(state.playerDocId).update({
        questionOrder: state.questionOrder
      }).catch(() => {});
    }
  } else {
    // Sinkronkan: tambahkan id soal baru ke akhir order
    const known = new Set(state.questionOrder);
    const extra = playerQuestions().filter(q => !known.has(q.id)).map(q => q.id);
    if (extra.length) {
      state.questionOrder = state.questionOrder.concat(extra);
      if (db && state.playerDocId) {
        db.collection(COLLECTION_PLAYERS).doc(state.playerDocId).update({
          questionOrder: state.questionOrder
        }).catch(() => {});
      }
    }
  }
}

function getNextUnlockIndex(ordered) {
  // Index soal pertama yang belum dijawab (sequential lock)
  for (let i = 0; i < ordered.length; i++) {
    if (!state.answeredIds.includes(ordered[i].id)) return i;
  }
  return ordered.length; // semua sudah
}

function calcBonusPoints(timeLeft, timeLimit) {
  // Base 10 + bonus hingga 10 poin proporsional sisa waktu
  // Contoh: sisa 100% → +10 (total 20), sisa 50% → +5 (total 15), sisa 0 → +0
  if (timeLimit <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, timeLeft / timeLimit));
  return Math.round(ratio * 10);
}

// ========== EFEK VISUAL: CONFETTI ==========
function spawnConfetti(amount) {
  const n = amount || 24;
  const colors = ['#00d4ff', '#ff6b35', '#00c853', '#ffd700', '#7b5cff', '#ff4b8b'];
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  document.body.appendChild(layer);

  for (let i = 0; i < n; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    const x = Math.random() * 100;
    const delay = Math.random() * 0.25;
    const duration = 1.6 + Math.random() * 1.2;
    const rotate = Math.random() * 360;
    const drift = (Math.random() - 0.5) * 160;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const isRound = Math.random() > 0.5;
    piece.style.setProperty('--x', x + 'vw');
    piece.style.setProperty('--drift', drift + 'px');
    piece.style.setProperty('--rot', rotate + 'deg');
    piece.style.setProperty('--dur', duration + 's');
    piece.style.setProperty('--delay', delay + 's');
    piece.style.background = color;
    if (isRound) piece.style.borderRadius = '50%';
    layer.appendChild(piece);
  }

  setTimeout(() => layer.remove(), 3200);
}

// ========== EFEK VISUAL: FLOATING SCORE + SCREEN PULSE ==========
function spawnFloatingScore(points, x, y) {
  const el = document.createElement('div');
  el.className = 'float-score';
  el.textContent = (points >= 0 ? '+' : '') + points;
  if (points >= 20) el.classList.add('big');
  if (points >= 30) el.classList.add('epic');
  const rect = document.querySelector('.question-area')?.getBoundingClientRect();
  const startX = x != null ? x : (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
  const startY = y != null ? y : (rect ? rect.top + rect.height * 0.4 : window.innerHeight / 2);
  el.style.left = startX + 'px';
  el.style.top = startY + 'px';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => el.remove(), 1400);
}

function screenPulse(type) {
  const app = document.getElementById('app') || document.body;
  app.classList.remove('pulse-correct', 'pulse-wrong', 'pulse-streak');
  void app.offsetWidth;
  app.classList.add(type === 'wrong' ? 'pulse-wrong' : (type === 'streak' ? 'pulse-streak' : 'pulse-correct'));
  setTimeout(() => app.classList.remove('pulse-correct', 'pulse-wrong', 'pulse-streak'), 600);
}

// Emoji rain untuk streak tinggi
function spawnEmojiRain(emojis, amount) {
  const n = amount || 12;
  const list = emojis || ['🔥', '⚡', '✨', '🌟', '💥'];
  const layer = document.createElement('div');
  layer.className = 'emoji-rain-layer';
  document.body.appendChild(layer);
  for (let i = 0; i < n; i++) {
    const span = document.createElement('span');
    span.className = 'emoji-rain';
    span.textContent = list[Math.floor(Math.random() * list.length)];
    span.style.setProperty('--x', (Math.random() * 100) + 'vw');
    span.style.setProperty('--delay', (Math.random() * 0.4) + 's');
    span.style.setProperty('--dur', (1.4 + Math.random() * 1) + 's');
    span.style.setProperty('--scale', (0.8 + Math.random() * 0.8).toFixed(2));
    layer.appendChild(span);
  }
  setTimeout(() => layer.remove(), 2800);
}

// ========== SOUND FX (Web Audio) ==========
function playSfx(type) {
  const ctx = getRoboAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  if (type === 'correct') {
    // Ascending cheerful chime
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      gain.gain.setValueAtTime(0.0001, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.12, t + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.28);
    });
  } else if (type === 'wrong') {
    // Low buzz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.25);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  } else if (type === 'streak') {
    // Sparkly ascending
    [880, 1100, 1320, 1760].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.06);
      gain.gain.setValueAtTime(0.0001, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.09, t + i * 0.06 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.2);
    });
  } else if (type === 'click') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(720, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  } else if (type === 'whoosh') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.2);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.07, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.24);
  } else if (type === 'levelup') {
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.07);
      gain.gain.setValueAtTime(0.0001, t + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.1, t + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.32);
    });
  } else if (type === 'boss') {
    // Dark dramatic chord for boss intro
    [110, 138.59, 164.81, 220].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.07, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.95);
    });
  }
}

// ========== BACKSOUND (musik prosedural Web Audio — tanpa file audio) ==========
// Catatan: dibuat dengan scheduler berbasis waktu AudioContext (bukan setInterval per nada),
// nada berada di rentang yang terdengar di speaker HP/laptop, dan baru jalan setelah ada interaksi user.
const bgm = {
  enabled: true,
  playing: false,
  mode: null,        // mode yang sedang diputar
  wantMode: 'ambient', // mode yang diminta layar aktif (dipakai saat audio baru terbuka)
  gainNode: null,
  intervalId: null,
  nextTime: 0,
  step: 0,
  ducked: false,
  noiseBuf: null,
  nodes: []
};

const BGM_MODES = {
  // chords/bass dalam nomor MIDI. 1 chord = 1 bar = 8 langkah (not 1/8)
  ambient: {
    bpm: 84, vol: 0.55, padType: 'triangle', arpType: 'sine', arpVol: 0.13,
    chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], // Am F C G
    bass: [45, 41, 48, 43], kick: 0, hat: 0, bassEvery: 8
  },
  game: {
    bpm: 108, vol: 0.6, padType: 'triangle', arpType: 'triangle', arpVol: 0.14,
    chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], // C G Am F
    bass: [48, 43, 45, 41], kick: 4, hat: 0.035, bassEvery: 4
  },
  boss: {
    bpm: 132, vol: 0.65, padType: 'sawtooth', arpType: 'square', arpVol: 0.07,
    chords: [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64]], // Dm Bb C A
    bass: [38, 34, 36, 33], kick: 2, hat: 0.06, bassEvery: 1
  }
};
const BGM_ARP = [0, 1, 2, 3, 2, 1, 2, 1];

function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function loadMusicPref() {
  try {
    const v = localStorage.getItem('mahadipa_music');
    if (v === '0') bgm.enabled = false;
  } catch (e) {}
  updateMusicToggleUI();
}

function saveMusicPref() {
  try { localStorage.setItem('mahadipa_music', bgm.enabled ? '1' : '0'); } catch (e) {}
}

function updateMusicToggleUI() {
  const icon = document.getElementById('music-icon');
  const btn = document.getElementById('btn-music-toggle');
  if (icon) icon.textContent = bgm.enabled ? '🎵' : '🔇';
  if (btn) {
    btn.classList.toggle('muted', !bgm.enabled);
    btn.title = bgm.enabled ? 'Matikan backsound' : 'Nyalakan backsound';
  }
}

function stopBgm() {
  if (bgm.intervalId) {
    clearInterval(bgm.intervalId);
    bgm.intervalId = null;
  }
  const g = bgm.gainNode;
  if (g) {
    const ctx = roboAudioCtx;
    try {
      if (ctx) g.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
    } catch (e) {}
    setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 400);
  }
  bgm.gainNode = null;
  bgm.playing = false;
  bgm.mode = null;
}

function bgmTarget(cfg) {
  return cfg.vol * (bgm.ducked ? 0.3 : 1);
}

// Turunkan volume musik saat Steko bicara
function bgmDuck(on) {
  bgm.ducked = !!on;
  const ctx = roboAudioCtx;
  if (!ctx || !bgm.gainNode || !bgm.mode) return;
  try {
    bgm.gainNode.gain.setTargetAtTime(bgmTarget(BGM_MODES[bgm.mode]), ctx.currentTime, 0.15);
  } catch (e) {}
}

function bgmScheduleStep(ctx, cfg, dest, delay, step, t) {
  const eighth = 60 / cfg.bpm / 2;
  const bar = Math.floor(step / 8) % cfg.chords.length;
  const pos = step % 8;
  const chord = cfg.chords[bar];

  // Pad: bunyi di awal tiap bar
  if (pos === 0) {
    const dur = eighth * 8;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cfg.padType === 'sawtooth' ? 700 : 1100;
    lp.connect(dest);
    chord.forEach((m, i) => {
      [-4, 4].forEach(det => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = cfg.padType;
        osc.frequency.value = mtof(m);
        osc.detune.value = det;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(cfg.padType === 'sawtooth' ? 0.035 : 0.06, t + Math.min(0.7, dur * 0.3));
        g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.02);
        osc.connect(g);
        g.connect(lp);
        osc.start(t);
        osc.stop(t + dur * 1.05);
      });
    });
  }

  // Bass
  if (pos % cfg.bassEvery === 0) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const isBoss = cfg.padType === 'sawtooth';
    osc.type = isBoss ? 'sawtooth' : 'sine';
    // naikkan 1 oktaf agar terdengar di speaker kecil
    osc.frequency.value = mtof(cfg.bass[bar] + 12);
    let lp = null;
    if (isBoss) {
      lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;
    }
    const len = eighth * (isBoss ? 0.8 : 3.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(isBoss ? 0.16 : 0.26, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(g);
    if (lp) { g.connect(lp); lp.connect(dest); } else { g.connect(dest); }
    osc.start(t);
    osc.stop(t + len + 0.05);
  }

  // Arpeggio (pluck) + dikirim ke delay supaya terasa luas
  {
    const idx = BGM_ARP[pos];
    const note = chord[idx % 3] + 12 * (1 + Math.floor(idx / 3));
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = cfg.arpType;
    osc.frequency.value = mtof(note);
    const len = eighth * 2.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(cfg.arpVol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(g);
    g.connect(dest);
    g.connect(delay);
    osc.start(t);
    osc.stop(t + len + 0.05);
  }

  // Kick
  if (cfg.kick && pos % cfg.kick === 0) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Hi-hat di off-beat
  if (cfg.hat && pos % 2 === 1 && bgm.noiseBuf) {
    const src = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = bgm.noiseBuf;
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    g.gain.setValueAtTime(cfg.hat, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(hp);
    hp.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + 0.07);
  }
}

function startBgm(mode) {
  mode = BGM_MODES[mode] ? mode : 'ambient';
  bgm.wantMode = mode;
  if (!bgm.enabled) return;
  const ctx = getRoboAudioCtx();
  if (!ctx) return;

  // Browser memblokir audio sebelum ada interaksi user → tunggu, lalu coba lagi otomatis
  if (ctx.state !== 'running') {
    ctx.resume().then(() => {
      if (bgm.enabled && !bgm.playing) startBgm(bgm.wantMode);
    }).catch(() => {});
    return;
  }

  if (bgm.playing && bgm.mode === mode) return;

  stopBgm();
  bgm.mode = mode;
  bgm.playing = true;
  bgm.step = 0;
  bgm.nextTime = ctx.currentTime + 0.1;
  const cfg = BGM_MODES[mode];

  if (!bgm.noiseBuf) {
    const len = Math.floor(ctx.sampleRate * 0.1);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    bgm.noiseBuf = buf;
  }

  // master → compressor → output
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.linearRampToValueAtTime(bgmTarget(cfg), ctx.currentTime + 0.8); // fade-in
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(ctx.destination);
  bgm.gainNode = master;

  // Delay/echo lembut
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 60 / cfg.bpm * 0.75;
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const dg = ctx.createGain();
  dg.gain.value = 0.5;
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(dg);
  dg.connect(master);

  const eighth = 60 / cfg.bpm / 2;
  const myMaster = master;
  function tick() {
    if (bgm.gainNode !== myMaster) return;
    const c = roboAudioCtx;
    if (!c || c.state !== 'running') return;
    if (bgm.nextTime < c.currentTime) bgm.nextTime = c.currentTime + 0.05; // kejar setelah tab sempat tidur
    while (bgm.nextTime < c.currentTime + 0.5) {
      bgmScheduleStep(c, cfg, myMaster, delay, bgm.step, bgm.nextTime);
      bgm.nextTime += eighth;
      bgm.step++;
    }
  }
  tick();
  bgm.intervalId = setInterval(tick, 120);
}

function setBgmMode(mode) {
  bgm.wantMode = BGM_MODES[mode] ? mode : 'ambient';
  if (!bgm.enabled) {
    stopBgm();
    return;
  }
  startBgm(bgm.wantMode);
}

function toggleMusic() {
  bgm.enabled = !bgm.enabled;
  saveMusicPref();
  updateMusicToggleUI();
  if (bgm.enabled) {
    if (document.getElementById('screen-game')?.classList.contains('active')) {
      const stage = getCurrentStage();
      setBgmMode(stage.isBoss ? 'boss' : 'game');
    } else {
      setBgmMode(bgm.wantMode || 'ambient');
    }
  } else {
    stopBgm();
  }
}

// Buka audio pada interaksi pertama (kebijakan autoplay browser) + hemat saat tab disembunyikan
['pointerdown', 'touchend', 'keydown', 'click'].forEach(evt => {
  window.addEventListener(evt, () => {
    if (!bgm.enabled) return;
    const ctx = getRoboAudioCtx();
    if (ctx && ctx.state === 'running' && !bgm.playing) startBgm(bgm.wantMode);
    else if (ctx && ctx.state !== 'running') {
      ctx.resume().then(() => { if (bgm.enabled && !bgm.playing) startBgm(bgm.wantMode); }).catch(() => {});
    }
  }, { passive: true });
});

document.addEventListener('visibilitychange', () => {
  const ctx = roboAudioCtx;
  if (!ctx) return;
  if (document.hidden) {
    ctx.suspend().catch(() => {});
  } else if (bgm.enabled) {
    ctx.resume().then(() => { if (!bgm.playing) startBgm(bgm.wantMode); }).catch(() => {});
  }
});

// ========== STAGE / BOSS SYSTEM ==========
// Menentukan "level" soal berdasarkan posisi di urutan
function getStageForIndex(idx, total) {
  if (total <= 0) return { id: 'normal', label: 'Jelajah', icon: '🏝️', isBoss: false, tier: 1 };
  const ratio = (idx + 1) / total;
  if (idx === total - 1 || ratio >= 0.92) {
    return { id: 'boss', label: 'FINAL BOSS', icon: '👹', isBoss: true, tier: 4 };
  }
  if (ratio >= 0.7) {
    return { id: 'elite', label: 'Elite Zone', icon: '⚔️', isBoss: false, tier: 3 };
  }
  if (ratio >= 0.4) {
    return { id: 'rising', label: 'Zona Menantang', icon: '🌋', isBoss: false, tier: 2 };
  }
  return { id: 'normal', label: 'Jelajah', icon: '🏝️', isBoss: false, tier: 1 };
}

function getCurrentStage() {
  const ordered = typeof getOrderedQuestions === 'function' ? getOrderedQuestions() : [];
  const total = ordered.length || playerQuestions().length || 10;
  const q = state.currentQuestion;
  if (!q) return getStageForIndex(0, total);
  const idx = ordered.findIndex(x => x.id === q.id);
  return getStageForIndex(idx >= 0 ? idx : state.answeredIds.length, total);
}

function applyStageUI(stage) {
  const banner = document.getElementById('stage-banner');
  const icon = document.getElementById('stage-icon');
  const label = document.getElementById('stage-label');
  const qArea = document.querySelector('.question-area');
  const gameScreen = document.getElementById('screen-game');

  if (!banner || !stage) return;

  banner.classList.remove('hidden', 'stage-normal', 'stage-rising', 'stage-elite', 'stage-boss');
  banner.classList.add('stage-' + stage.id);
  if (icon) icon.textContent = stage.icon;
  if (label) {
    const progressNum = (typeof getOrderedQuestions === 'function'
      ? getOrderedQuestions().findIndex(x => x.id === state.currentQuestion?.id)
      : -1) + 1;
    const total = (typeof getOrderedQuestions === 'function' ? getOrderedQuestions().length : 0) || playerQuestions().length;
    label.textContent = stage.isBoss
      ? stage.label
      : ('Level ' + Math.max(1, progressNum) + ' · ' + stage.label);
  }

  if (qArea) {
    qArea.classList.remove('theme-normal', 'theme-rising', 'theme-elite', 'theme-boss');
    qArea.classList.add('theme-' + stage.id);
  }
  if (gameScreen) {
    gameScreen.classList.remove('is-boss');
    if (stage.isBoss) gameScreen.classList.add('is-boss');
  }
}

// ========== BOT ==========
function setBotMood(mood) {
  const bots = document.querySelectorAll('.bot-body, .char-avatar');
  bots.forEach(b => {
    b.classList.remove('mood-idle', 'mood-happy', 'mood-sad', 'mood-talk');
    b.classList.add('mood-' + mood);
    // Animasi "one-shot" lompat/goyang saat mood berubah ke senang/sedih
    if (mood === 'happy' || mood === 'sad') {
      b.classList.remove('mood-pop');
      void b.offsetWidth;
      b.classList.add('mood-pop');
    }
  });
}

function startBotBlinking() {
  setInterval(() => {
    document.querySelectorAll('.bot-eye, .avatar-eye').forEach(eye => {
      eye.classList.add('blink');
      setTimeout(() => eye.classList.remove('blink'), 180);
    });
  }, 3200);
}


// ========== SUARA AI STEKO (Web Speech API + efek robotik) ==========
const stekoVoice = {
  enabled: true,
  speaking: false,
  preferredLang: 'id-ID',
  rate: 0.93,     // sedikit lebih lambat & terukur = kesan mekanis
  pitch: 0.78,    // nada lebih rendah & datar = kesan robot, bukan manusia
  volume: 1,
  utterance: null
};

// ---------- Efek bunyi robot (Web Audio API) ----------
let roboAudioCtx = null;
function getRoboAudioCtx() {
  try {
    if (!roboAudioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) roboAudioCtx = new Ctx();
    }
    if (roboAudioCtx && roboAudioCtx.state === 'suspended') {
      roboAudioCtx.resume().catch(() => {});
    }
    return roboAudioCtx;
  } catch (e) {
    return null;
  }
}

// Beep pendek bernada naik-turun ala robot bercerita (R2D2-ish, singkat & tidak mengganggu suara)
function playRoboBeeps(count) {
  const ctx = getRoboAudioCtx();
  if (!ctx) return;
  const n = count || (2 + Math.floor(Math.random() * 2));
  let t = ctx.currentTime;
  for (let i = 0; i < n; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = i % 2 === 0 ? 'square' : 'sawtooth';
    const baseFreq = 620 + Math.random() * 420;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * (i % 2 === 0 ? 1.6 : 0.65), t + 0.07);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.055, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
    t += 0.1;
  }
}

// Bunyi "tick" halus untuk menandai akhir kalimat/penjelasan (opsional, dipakai hemat)
function playRoboTick() {
  const ctx = getRoboAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.09);
}

function loadVoicePref() {
  try {
    const v = localStorage.getItem('mahadipa_voice');
    if (v === '0') stekoVoice.enabled = false;
  } catch (e) {}
  updateVoiceToggleUI();
}

function saveVoicePref() {
  try { localStorage.setItem('mahadipa_voice', stekoVoice.enabled ? '1' : '0'); } catch (e) {}
}

function updateVoiceToggleUI() {
  const icon = document.getElementById('voice-icon');
  const btn = document.getElementById('btn-voice-toggle');
  if (icon) icon.textContent = stekoVoice.enabled ? '🔊' : '🔇';
  if (btn) {
    btn.classList.toggle('muted', !stekoVoice.enabled);
    btn.title = stekoVoice.enabled ? 'Matikan suara Steko' : 'Nyalakan suara Steko';
  }
}

function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim();
}

function pickIndonesianVoice() {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  // Prioritas: id-ID → id → perempuan Indonesia-ish → default
  const prefer = [
    v => /id-ID/i.test(v.lang),
    v => /^id/i.test(v.lang),
    v => /indonesia/i.test(v.name),
    v => /id_/i.test(v.lang)
  ];
  for (const fn of prefer) {
    const found = voices.find(fn);
    if (found) return found;
  }
  // Fallback: suara perempuan sering lebih cocok untuk karakter guide
  const female = voices.find(v => /female|woman|samantha|google uk english female|zira/i.test(v.name));
  return female || voices[0] || null;
}

function setSpeakingUI(on) {
  stekoVoice.speaking = on;
  document.querySelectorAll('.speaking-badge').forEach(el => {
    el.classList.toggle('hidden', !on);
  });
  document.querySelectorAll('.story-container, .dialogue-box, .char-avatar-wrap, .char-avatar').forEach(el => {
    el.classList.toggle('is-speaking', on);
  });
  document.body.classList.toggle('steko-speaking', on);
  if (on) setBotMood('talk');
  else if (!document.getElementById('screen-welcome')?.classList.contains('active') &&
           !document.getElementById('screen-intro')?.classList.contains('active')) {
    setBotMood('idle');
  }
}

function stopStekoVoice() {
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  stekoVoice.utterance = null;
  setSpeakingUI(false);
  if (typeof bgmDuck === 'function') bgmDuck(false);
}

function speakSteko(textOrHtml, opts) {
  opts = opts || {};
  if (!stekoVoice.enabled && !opts.force) return;
  if (!window.speechSynthesis) return;

  const text = stripHtml(textOrHtml);
  if (!text) return;

  stopStekoVoice();

  // Chrome bug: kadang butuh resume
  try { window.speechSynthesis.resume(); } catch (e) {}

  const u = new SpeechSynthesisUtterance(text);
  u.lang = stekoVoice.preferredLang;
  u.rate = opts.rate != null ? opts.rate : stekoVoice.rate;
  u.pitch = opts.pitch != null ? opts.pitch : stekoVoice.pitch;
  u.volume = stekoVoice.volume;

  const voice = pickIndonesianVoice();
  if (voice) u.voice = voice;

  u.onstart = () => {
    setSpeakingUI(true);
    if (typeof bgmDuck === 'function') bgmDuck(true);
    playRoboBeeps(2 + Math.floor(Math.random() * 2));
  };
  u.onend = () => {
    setSpeakingUI(false);
    if (typeof bgmDuck === 'function' && stekoVoice.utterance === u) bgmDuck(false);
    playRoboTick();
    if (opts.onEnd) opts.onEnd();
  };
  u.onerror = () => {
    setSpeakingUI(false);
    if (typeof bgmDuck === 'function' && stekoVoice.utterance === u) bgmDuck(false);
  };

  stekoVoice.utterance = u;
  // Delay kecil biar voices sempat load di beberapa browser, dan beep sempat terdengar dulu
  setTimeout(() => {
    try { window.speechSynthesis.speak(u); } catch (e) { setSpeakingUI(false); }
  }, 130);
}

// ---------- Reveal teks kata-per-kata (animasi "robot bercerita") ----------
// Membungkus setiap kata (atau frasa <b>...</b>) dalam span beranimasi fade+naik,
// tetap mempertahankan tag HTML sederhana yang dipakai di dialog (<b>).
function animateRevealText(el, html) {
  if (!el) return;
  el.innerHTML = html;
  let delayIndex = 0;
  const STEP = 48; // ms antar kata, selaras ritme bicara robot

  const nodes = Array.from(el.childNodes);
  nodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.textContent.split(/(\s+)/).filter(p => p.length);
      const frag = document.createDocumentFragment();
      parts.forEach(part => {
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          return;
        }
        const span = document.createElement('span');
        span.className = 'rv-word';
        span.textContent = part;
        span.style.animationDelay = (delayIndex * STEP) + 'ms';
        delayIndex++;
        frag.appendChild(span);
      });
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.classList.add('rv-word');
      node.style.animationDelay = (delayIndex * STEP) + 'ms';
      delayIndex++;
    }
  });
}

// Pastikan daftar voice ter-load (Chrome)
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
}

document.getElementById('btn-voice-toggle')?.addEventListener('click', () => {
  stekoVoice.enabled = !stekoVoice.enabled;
  saveVoicePref();
  updateVoiceToggleUI();
  if (!stekoVoice.enabled) stopStekoVoice();
  else {
    // Feedback singkat
    speakSteko('Oke, suara Steko nyala.', { rate: 1.05 });
  }
});

document.getElementById('btn-music-toggle')?.addEventListener('click', () => {
  toggleMusic();
});

document.querySelectorAll('.btn-replay-voice').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    if (target === 'welcome') {
      const t = document.getElementById('welcome-text')?.innerHTML;
      if (t) speakSteko(t, { force: true });
    } else if (target === 'intro') {
      const t = document.getElementById('dialogue-text')?.innerHTML;
      if (t) speakSteko(t, { force: true });
    }
  });
});

// ========== DIALOGUE / STORY ==========
const welcomeChapters = ['📖 Prolog — Sinyal Pertama', '📖 Prolog — Gerbang Pendaftaran'];
const welcomeLines = [
  "Hai bestie! Aku <b>Steko</b>, temen digital angkatan <b>Mahadipa 2026</b>. 🤖 Welcome to the chaos — eh, maksudnya petualangan STEKOM.",
  "Sebelum gas, aku butuh tau siapa kamu dulu. Isi nama sama prodi aja, gampang. Literally cuma dua field."
];
let welcomeIndex = 0;

function showWelcomeLine() {
  setBotMood('talk');
  const html = welcomeLines[welcomeIndex];
  const chapterEl = document.getElementById('chapter-tag-welcome');
  if (chapterEl) {
    chapterEl.textContent = welcomeChapters[welcomeIndex] || '';
    chapterEl.classList.remove('chapter-pop');
    void chapterEl.offsetWidth; // restart animasi
    chapterEl.classList.add('chapter-pop');
  }
  animateRevealText(document.getElementById('welcome-text'), html);
  document.getElementById('btn-welcome-next').textContent =
    welcomeIndex >= welcomeLines.length - 1 ? 'Isi data dulu 📝' : 'Gas →';
  speakSteko(html);
}

function startWelcome() {
  welcomeIndex = 0;
  showScreen('screen-welcome');
  showWelcomeLine();
}

document.getElementById('btn-welcome-next').addEventListener('click', () => {
  stopStekoVoice();
  welcomeIndex++;
  if (welcomeIndex >= welcomeLines.length) {
    showScreen('screen-login');
  } else {
    showWelcomeLine();
  }
});
document.getElementById('go-board')?.addEventListener('click', (e) => {
  e.preventDefault();
  showScreen('screen-dashboard');
});
document.getElementById('go-welcome')?.addEventListener('click', (e) => {
  e.preventDefault();
  startWelcome();
});

const introChapters = [
  '📖 Bab 1 — Identitas Terkonfirmasi',
  '📖 Bab 1 — Peta Dunia Mahadipa',
  '📖 Bab 2 — Empat Gerbang Pengetahuan',
  '📖 Bab 2 — Aturan Petualangan',
  '📖 Bab 3 — Gerbang Terbuka'
];
const dialogues = [
  "Oke <b>{nama}</b>, data kamu udah masuk. Sekarang kita masuk dunia Mahadipa beneran. 🌏",
  "Bayangin STEKOM kayak pulau petualangan. Tiap soal = satu pos. Kamu harus lewatin satu-satu, no skip-skip ya.",
  "Nanti di dashboard ada peta pulau, skor, sama progress kamu. Aku bakalan jelasin sebentar biar gak bingung.",
  "Soal baru cuma bisa dikerjain kalau <b>admin udah buka ronde</b>. Jadi semua start bareng — which is fair banget.",
  "Siap? Yuk masuk dashboard. Gas, jangan shy! 🚀"
];

let dialogueIndex = 0;

function startIntro() {
  dialogueIndex = 0;
  showScreen('screen-intro');
  showDialogue();
}

function showDialogue() {
  const textEl = document.getElementById('dialogue-text');
  const btn = document.getElementById('btn-next-dialogue');
  setBotMood('talk');
  const html = dialogues[dialogueIndex]
    .replace('{nama}', escapeHtml(state.player?.nama || 'Petualang'))
    .replace('{prodi}', escapeHtml(state.player?.prodi || '-'));
  const chapterEl = document.getElementById('chapter-tag-intro');
  if (chapterEl) {
    chapterEl.textContent = introChapters[dialogueIndex] || '';
    chapterEl.classList.remove('chapter-pop');
    void chapterEl.offsetWidth;
    chapterEl.classList.add('chapter-pop');
  }
  animateRevealText(textEl, html);
  btn.textContent = dialogueIndex >= dialogues.length - 1 ? 'Masuk dashboard 🎮' : 'Gas →';
  speakSteko(html);
}

document.getElementById('btn-next-dialogue').addEventListener('click', () => {
  stopStekoVoice();
  dialogueIndex++;
  if (dialogueIndex >= dialogues.length) {
    enterPlayerDashboard();
  } else {
    showDialogue();
  }
});

// ========== DASHBOARD PUBLIK (Welcome) ==========
document.getElementById('btn-start-game').addEventListener('click', () => {
  showScreen('screen-login');
});
document.getElementById('btn-login-back-dash').addEventListener('click', () => {
  startWelcome();
});

function loadDashboard() {
  if (!db) return;

  if (state.unsubscribeDashLeaderboard) state.unsubscribeDashLeaderboard();
  state.unsubscribeDashLeaderboard = db.collection(COLLECTION_PLAYERS)
    .onSnapshot((snapshot) => {
      const players = [];
      snapshot.forEach(doc => players.push({ id: doc.id, ...doc.data() }));

      document.getElementById('dash-total').textContent = players.length;
      const finished = players.filter(p => p.finished).length;
      document.getElementById('dash-finished').textContent = finished;
      const avg = players.length
        ? Math.round(players.reduce((s, p) => s + (p.score || 0), 0) / players.length)
        : 0;
      document.getElementById('dash-avg').textContent = avg;

      const ranked = players.filter(p => (p.totalScore > 0) || p.score > 0 || p.finished).sort((a, b) => {
        const ta = Number(a.totalScore) || sumRoundScoresObj(a.roundScores) || (a.score || 0);
        const tb = Number(b.totalScore) || sumRoundScoresObj(b.roundScores) || (b.score || 0);
        if (tb !== ta) return tb - ta;
        return (a.timeSpent || 99999) - (b.timeSpent || 99999);
      });
      renderPodiumInto('dash-podium', ranked.slice(0, 3));
      renderLeaderboardListInto('dash-leaderboard-list', ranked.slice(0, 10));
    });
}

function useLocalSeedQuestions() {
  // Fallback demo: pakai SEED_QUESTIONS agar alur tetap bisa dicoba
  if (typeof SEED_QUESTIONS === 'undefined' || !SEED_QUESTIONS.length) return false;
  state.allQuestions = SEED_QUESTIONS.map((q, i) => ({
    ...q,
    id: q.id || ('seed-' + i),
    timeLimit: q.timeLimit || state.defaultTimeLimit
  }));
  const el = document.getElementById('dash-qcount');
  if (el) el.textContent = state.allQuestions.length;
  return true;
}

function listenQuestions() {
  if (!db) {
    useLocalSeedQuestions();
    state.questionsLoaded = true;
    return;
  }
  if (state.unsubscribeQuestions) state.unsubscribeQuestions();
  state.unsubscribeQuestions = db.collection(COLLECTION_QUESTIONS)
    .onSnapshot((snapshot) => {
      const qs = [];
      snapshot.forEach(doc => qs.push({ id: doc.id, ...doc.data() }));
      if (qs.length === 0) {
        // Firestore kosong → fallback seed supaya alur bisa dicoba
        useLocalSeedQuestions();
      } else {
        state.allQuestions = qs;
      }
      state.questionsLoaded = true;
      document.getElementById('dash-qcount').textContent = state.allQuestions.length;
      const qtotalEl = document.getElementById('admin-qtotal');
      if (qtotalEl) qtotalEl.textContent = state.allQuestions.length;

      if (document.getElementById('screen-player-dashboard')?.classList.contains('active')) {
        renderPlayerDashboard();
      }
      if (state.isAdmin && document.getElementById('tab-questions')?.classList.contains('active')) {
        renderQuestionAdminList();
      }
    }, (err) => {
      console.warn('Gagal listen questions, pakai seed lokal:', err);
      useLocalSeedQuestions();
    });
}

// ========== LOGIN / REGISTER ==========
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nama = document.getElementById('nama').value.trim();
  const prodi = document.getElementById('prodi').value;
  if (!nama || !prodi) return;

  if (state.allQuestions.length === 0) {
    useLocalSeedQuestions();
  }
  if (state.allQuestions.length === 0) {
    alert('Belum ada soal tersedia. Hubungi admin untuk menambahkan soal terlebih dahulu.');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  try {
    let playerData;
    let docId;

    if (db) {
      const snapshot = await db.collection(COLLECTION_PLAYERS)
        .where('nama', '==', nama)
        .where('prodi', '==', prodi)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        docId = doc.id;
        playerData = doc.data();
        if (!Array.isArray(playerData.answeredIds)) playerData.answeredIds = [];
        if (!Array.isArray(playerData.questionOrder)) playerData.questionOrder = [];
        await db.collection(COLLECTION_PLAYERS).doc(docId).update({
          lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const order = shuffleArray(questionsForProdi(prodi).map(q => q.id));
        const newPlayer = {
          nama,
          prodi,
          score: 0,
          correct: 0,
          totalAnswered: 0,
          timeSpent: 0,
          finished: false,
          answeredIds: [],
          questionOrder: order,
          roundScores: { 1: 0, 2: 0, 3: 0 },
          totalScore: 0,
          currentRound: state.activeRound || 1,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        };
        const ref = await db.collection(COLLECTION_PLAYERS).add(newPlayer);
        docId = ref.id;
        playerData = newPlayer;
      }
    } else {
      // Mode demo offline
      const order = shuffleArray(questionsForProdi(prodi).map(q => q.id));
      docId = 'demo-local';
      playerData = {
        nama, prodi, score: 0, correct: 0, totalAnswered: 0,
        timeSpent: 0, finished: false, answeredIds: [], questionOrder: order
      };
    }

    state.player = playerData;
    state.playerDocId = docId;
    state.score = playerData.score || 0;
    state.correct = playerData.correct || 0;
    state.answeredIds = Array.isArray(playerData.answeredIds) ? [...playerData.answeredIds] : [];
    state.questionOrder = Array.isArray(playerData.questionOrder) ? [...playerData.questionOrder] : [];
    state.streak = 0;
    state.maxStreak = 0;
    state.startTime = Date.now() - ((playerData.timeSpent || 0) * 1000);
    if (db && docId !== 'demo-local') saveSession(docId, playerData.nama || nama, playerData.prodi || prodi);
    ensureQuestionOrder();
    startIntro();
  } catch (err) {
    console.error(err);
    // Fallback demo jika Firebase gagal
    const order = shuffleArray(questionsForProdi(prodi).map(q => q.id));
    state.player = {
      nama, prodi, score: 0, correct: 0, totalAnswered: 0,
      timeSpent: 0, finished: false, answeredIds: [], questionOrder: order
    };
    state.playerDocId = 'demo-local';
    state.score = 0;
    state.correct = 0;
    state.answeredIds = [];
    state.streak = 0;
    state.maxStreak = 0;
    state.questionOrder = order;
    state.startTime = Date.now();
    ensureQuestionOrder();
    startIntro();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Gas petualangan 🚀';
  }
});

// ========== PLAYER DASHBOARD ==========
function enterPlayerDashboard() {
  // Bersihkan status "sedang main" di Firestore
  if (db && state.playerDocId && state.playerDocId !== 'demo-local') {
    db.collection(COLLECTION_PLAYERS).doc(state.playerDocId).update({
      playing: false,
      currentQuestionId: null,
      lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});
  }
  showScreen('screen-player-dashboard');
  renderPlayerDashboard();
  const key = 'mahadipa_tour_' + (state.playerDocId || 'x');
  let seen = false;
  try { seen = localStorage.getItem(key) === '1'; } catch (e) {}
  if (!seen) startTour();
}

// ========== PANDUAN STEKO DI DASHBOARD ==========
const tourSteps = [
  { sel: null, text: "Ini <b>dashboard</b> kamu. Dari sini kamu pilih soal, cek skor, liat progress. Short tour dulu ya, biar gak lost." },
  { sel: '.pd-stats', text: "Di sini ada <b>skor</b> sama <b>progress</b>. Jawab bener dapet poin. Makin cepet, makin gede bonusnya — literally free points." },
  { sel: '#pd-question-grid', text: "Ini <b>peta pulau</b>. Soal diacak buat kamu, harus berurutan. Pulau berikutnya kebuka abis yang sebelumnya kelar." },
  { sel: null, text: "Tiap soal ada <b>timer</b>. Kalau kehabisan waktu, dianggap salah trus balik ke peta. Jadi jangan terlalu santuy." },
  { sel: '#pd-gate', text: "Bagian ini nunjukin <b>status ronde</b>. Soal baru bisa diklik abis admin buka. Tunggu di sini, nanti countdown otomatis." }
];
let tourIndex = 0;

function clearTourHighlight() {
  document.querySelectorAll('.tour-hl').forEach(el => el.classList.remove('tour-hl'));
}

function showTourStep() {
  clearTourHighlight();
  const step = tourSteps[tourIndex];
  animateRevealText(document.getElementById('tour-text'), step.text);
  document.getElementById('tour-next').textContent = tourIndex >= tourSteps.length - 1 ? 'Oke sip 👍' : 'Gas';
  if (step.sel) {
    const el = document.querySelector(step.sel);
    if (el) {
      el.classList.add('tour-hl');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  speakSteko(step.text);
}

function startTour() {
  tourIndex = 0;
  document.getElementById('tour').classList.remove('hidden');
  showTourStep();
}

function endTour() {
  document.getElementById('tour').classList.add('hidden');
  clearTourHighlight();
  try { localStorage.setItem('mahadipa_tour_' + (state.playerDocId || 'x'), '1'); } catch (e) {}
}

document.getElementById('tour-next')?.addEventListener('click', () => {
  stopStekoVoice();
  tourIndex++;
  if (tourIndex >= tourSteps.length) endTour(); else showTourStep();
});
document.getElementById('tour-skip')?.addEventListener('click', () => { stopStekoVoice(); endTour(); });
document.getElementById('btn-tour')?.addEventListener('click', startTour);

// ========== STATUS GAME (dibuka admin) & HITUNG MUNDUR SERENTAK ==========
function updateGateUI() {
  const gate = document.getElementById('pd-gate');
  if (!gate) return;
  const r = state.activeRound || 1;
  gate.classList.toggle('waiting', !state.gameOpen);
  gate.classList.toggle('open', state.gameOpen);
  const title = document.getElementById('pd-gate-title');
  const text = document.getElementById('pd-gate-text');
  if (title) {
    title.textContent = state.gameOpen
      ? ('Ronde ' + r + ' udah dibuka — gas kerjain!')
      : ('Lagi nunggu admin buka Ronde ' + r);
  }
  if (text) {
    text.textContent = state.gameOpen
      ? ('Ini soal Ronde ' + r + '. Kerjain berurutan ya, jangan loncat-loncat.')
      : ('Stay di halaman ini. Admin bakalan buka Ronde ' + r + ' buat semua orang bareng.');
  }
  const banner = document.getElementById('pd-round-banner-text');
  if (banner) banner.textContent = 'Ronde ' + r;
  const sub = document.getElementById('pd-round-banner-sub');
  if (sub) {
    sub.textContent = state.gameOpen
      ? ('Ronde ' + r + ' lagi jalan · soal beda dari ronde lain')
      : ('Masih dikunci · nunggu paket Ronde ' + r);
  }
  const badge = document.getElementById('pd-round-badge');
  if (badge) badge.textContent = 'Ronde ' + r;
}

function updateAdminGateUI() {
  const el = document.getElementById('gc-status');
  if (el) el.textContent = state.gameOpen ? 'Dibuka' : 'Ditutup';
}

function runCountdown(done) {
  // Hitung mundur singkat (total ~1.2s) agar buka ronde terasa langsung
  const overlay = document.getElementById('countdown-overlay');
  const num = document.getElementById('countdown-num');
  if (!overlay || !num) {
    state.countingDown = false;
    try { done && done(); } catch (e) {}
    return;
  }

  state.countingDown = true;
  document.getElementById('tour')?.classList.add('hidden');
  try { clearTourHighlight(); } catch (e) {}

  let n = 3;
  const tickMs = 800; // tempo nyaman (tidak terlalu cepat, tidak terlalu lambat)

  const show = (label) => {
    num.textContent = label;
    num.classList.toggle('word', typeof label === 'string');
    num.classList.remove('pop');
    void num.offsetWidth;
    num.classList.add('pop');
    if (label === 'Mulai!') {
      try { playSfx('levelup'); } catch (e) {}
      try { spawnConfetti(20); } catch (e) {}
    } else {
      try { playSfx('click'); } catch (e) {}
    }
  };

  overlay.classList.remove('hidden');
  show(n);
  clearInterval(state.countdownTimer);
  state.countdownTimer = setInterval(() => {
    n--;
    if (n > 0) { show(n); return; }
    clearInterval(state.countdownTimer);
    show('Mulai!');
    setTimeout(() => {
      overlay.classList.add('hidden');
      state.countingDown = false;
      try { done && done(); } catch (e) { console.warn(e); }
    }, 900);
  }, tickMs);
}

function showRoundClosedToast() {
  let t = document.getElementById('round-closed-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'round-closed-toast';
    t.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:9999;' +
      'background:#1e293b;color:#fff;padding:10px 16px;border-radius:12px;font-size:.9rem;' +
      'box-shadow:0 6px 24px rgba(0,0,0,.4);max-width:90vw;text-align:center;pointer-events:none;';
    document.body.appendChild(t);
  }
  t.textContent = 'Ronde ditutup admin. Skor kamu tersimpan ✅';
  t.style.display = 'block';
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.style.display = 'none'; }, 3500);
}

function applyGameStatus(open, session) {
  // Normalisasi session (Firestore kadang number / string)
  const sess = session == null ? null : String(session);

  // Jangan ganggu hitung mundur yang sedang berjalan untuk sesi yang sama
  if (open && state.countingDown && sess && sess === state.gameSession) return;

  const wasOpen = !!state.gameOpen;
  const isNewOpen = open && !wasOpen && state.gameKnown && sess !== state.gameSession;
  const firstKnownOpen = open && !state.gameKnown;
  state.gameKnown = true;
  if (sess) state.gameSession = sess;

  if (!open) {
    clearInterval(state.countdownTimer);
    state.countingDown = false;
    document.getElementById('countdown-overlay')?.classList.add('hidden');
    state.gameOpen = false;
    // Ronde ditutup admin saat peserta masih di layar soal → hentikan timer & balik ke dashboard
    if (wasOpen && document.getElementById('screen-game')?.classList.contains('active')) {
      stopTimer();
      try { clearQuestionStart(); } catch (e) {}
      state.currentQuestion = null;
      state.answered = true;
      try { stopStekoVoice(); } catch (e) {}
      showRoundClosedToast();
      try { enterPlayerDashboard(); } catch (e) {}
    } else if (wasOpen) {
      showRoundClosedToast();
    }
  } else if ((isNewOpen || (firstKnownOpen && wasOpen === false)) &&
             document.getElementById('screen-player-dashboard')?.classList.contains('active')) {
    // Hitung mundur 3-2-1 (versi cepat), baru buka soal
    runCountdown(() => {
      state.gameOpen = true;
      updateGateUI();
      try { updateAdminGateUI(); } catch (e) {}
      renderPlayerDashboard();
    });
    return;
  } else {
    // Sudah open / bukan di dashboard / snapshot awal → langsung set terbuka
    state.gameOpen = true;
  }
  updateGateUI();
  try { updateAdminGateUI(); } catch (e) {}
  if (document.getElementById('screen-player-dashboard')?.classList.contains('active')) {
    renderPlayerDashboard();
  }
}

function updateEntryUI() {
  const el = document.getElementById('entry-status');
  if (el) el.textContent = state.entryOpen ? 'Dibuka' : 'Ditutup';
  const title = document.getElementById('lobby-title');
  const sub = document.getElementById('lobby-sub');
  if (title) {
    title.textContent = state.entryOpen
      ? 'Sesi kebuka! Bentaran, masuk intro…'
      : 'Lagi nunggu admin buka sesi nih…';
  }
  if (sub) {
    sub.textContent = state.entryOpen
      ? 'Semua masuk bareng, isi data, trus gas petualangan.'
      : 'Tenang, semua start bareng. Nunggu admin kasih izin dulu biar fair.';
  }
}

function tryStartFromLobby() {
  // Dipanggil saat entry dibuka atau saat loading selesai & entry sudah open
  if (!state._lobbyReady) return;
  if (!state.entryOpen) return;
  if (state.isAdmin) return;
  // Hanya jalan dari lobi (loading masih aktif). Jangan ganggu intro/game/dashboard.
  const loading = document.getElementById('screen-loading');
  if (!loading || !loading.classList.contains('active')) return;
  // Cegah double-start
  if (state._entryStarting) return;
  state._entryStarting = true;
  state._pendingEntryStart = false;
  beginSynchronizedEntry().finally(() => {
    state._entryStarting = false;
  });
}

async function beginSynchronizedEntry() {
  // Unlock audio (tidak menahan alur)
  try { getRoboAudioCtx(); } catch (e) {}
  if (typeof setBgmMode === 'function') {
    setTimeout(() => setBgmMode('ambient'), 50);
  }

  const session = loadSession();
  if (session) {
    const info = document.getElementById('lobby-session-info');
    if (info) {
      info.textContent = 'Lanjut sebagai ' + session.nama + '…';
      info.classList.remove('hidden');
    }
    let result = 'error';
    try {
      // Timeout ketat: jangan biarkan lobi menggantung menunggu Firestore
      result = await Promise.race([
        restoreSession(session).then(ok => ok ? 'ok' : 'gone'),
        new Promise(resolve => setTimeout(() => resolve('timeout'), 1200))
      ]);
    } catch (err) {
      console.warn('Gagal memulihkan sesi:', err);
      result = 'error';
    }
    if (result === 'ok') {
      enterPlayerDashboard();
      return;
    }
    if (result === 'timeout' || result === 'error') {
      // Jangan stuck di lobi — lanjut welcome agar sesi tetap jalan
      clearSession();
    } else {
      // gone
      clearSession();
    }
  }

  if (!state.allQuestions.length) {
    try { useLocalSeedQuestions(); } catch (e) {}
  }
  startWelcome();
  if (!db) {
    const warn = document.createElement('p');
    warn.style.cssText = 'color:#ff6b35;font-size:0.85rem;margin-top:1rem;text-align:center;';
    warn.innerHTML = '⚠️ Mode demo (tanpa Firebase). Alur tetap bisa dicoba.';
    document.getElementById('screen-welcome')?.querySelector('.story-container')?.prepend(warn);
  }
}

function applyEntryStatus(open, session) {
  const wasOpen = state.entryOpen;
  const isNewOpen = open && !wasOpen && state.entryKnown && session !== state.entrySession;
  const firstOpen = open && !state.entryKnown;
  state.entryKnown = true;
  state.entrySession = session;
  state.entryOpen = !!open;
  updateEntryUI();

  // Saat pintu dibuka (baru atau pertama kali diketahui sudah open) → peserta di lobi masuk bersama
  if (open && (isNewOpen || firstOpen || (!wasOpen && open))) {
    tryStartFromLobby();
  }
}

function listenGameStatus() {
  if (!db) {
    // Mode demo tanpa Firebase: pintu masuk & soal langsung terbuka
    state.gameOpen = true;
    state.gameKnown = true;
    state.entryOpen = true;
    state.entryKnown = true;
    updateEntryUI();
    updateAdminGateUI();
    return;
  }
  if (state.unsubscribeGame) state.unsubscribeGame();
  state.unsubscribeGame = db.collection(COLLECTION_META).doc('game')
    .onSnapshot({ includeMetadataChanges: true }, (doc) => {
      // PENTING: abaikan data dari cache lokal (offline persistence). Data lama bisa berisi
      // status 'open' dari sesi sebelumnya → peserta langsung masuk tanpa nunggu admin.
      // Tunggu data asli dari server dulu; sebelum itu status dianggap TERTUTUP.
      if (doc.metadata && doc.metadata.fromCache) return;
      const d = doc.exists ? doc.data() : {};
      // Dedupe: snapshot metadata-only tidak perlu render ulang (penyebab layar kedip di HP)
      const sig = [d.entryStatus, d.entrySession, d.status, d.session, d.activeRound].join('|');
      if (sig === state._lastMetaSig) return;
      state._lastMetaSig = sig;
      // entryStatus: 'open' | 'closed' (default closed agar peserta menunggu)
      const entryOpen = d.entryStatus === 'open';
      const gameOpen = d.status === 'open' || d.status === true || d.status === 'opened';
      const newRound = Number(d.activeRound) || 1;
      console.log('[game-meta]', { entryStatus: d.entryStatus, status: d.status, session: d.session, activeRound: newRound });
      if (state.activeRound && newRound !== state.activeRound) {
        // Ronde diganti admin → reset progres lokal ronde (skor ronde tersimpan di roundScores server)
        state.score = 0;
        state.correct = 0;
        state.answeredIds = [];
        state.questionOrder = [];
        state.currentQuestion = null;
        state.answered = false;
        if (document.getElementById('screen-player-dashboard')?.classList.contains('active') ||
            document.getElementById('screen-game')?.classList.contains('active')) {
          // Kembali ke dashboard agar ambil soal baru
          try { enterPlayerDashboard(); } catch (e) {}
        }
      }
      state.activeRound = newRound;
      applyEntryStatus(entryOpen, d.entrySession || null);
      applyGameStatus(gameOpen, d.session != null ? d.session : null);
      updateGateUI();
      // renderPlayerDashboard sudah dipanggil di applyGameStatus (jangan dobel → kedip di HP)
    }, (err) => console.warn('Gagal listen status game:', err));
}

async function setGameStatus(open) {
  if (!db) { alert('Firebase tidak aktif.'); return; }
  try {
    const sessionId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    await db.collection(COLLECTION_META).doc('game').set({
      status: open ? 'open' : 'closed',
      session: sessionId,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    alert('Gagal mengubah status soal: ' + err.message);
  }
}

async function setEntryStatus(open) {
  if (!db) { alert('Firebase tidak aktif.'); return; }
  try {
    const sessionId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    await db.collection(COLLECTION_META).doc('game').set({
      entryStatus: open ? 'open' : 'closed',
      entrySession: sessionId,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    alert('Gagal mengubah status pintu masuk: ' + err.message);
  }
}

document.getElementById('btn-game-open')?.addEventListener('click', () => {
  if (confirm('Buka soal sekarang? Semua peserta di dashboard akan hitung mundur dan mulai bersamaan.')) setGameStatus(true);
});
document.getElementById('btn-game-close')?.addEventListener('click', () => {
  if (confirm('Tutup soal? Peserta tidak bisa membuka soal baru sampai kamu membukanya lagi.')) setGameStatus(false);
});
document.getElementById('btn-entry-open')?.addEventListener('click', () => {
  setEntryStatus(true);
});
document.getElementById('btn-entry-close')?.addEventListener('click', () => {
  if (confirm('Tutup pintu masuk? Peserta baru yang belum masuk akan menunggu di lobi.')) setEntryStatus(false);
});

function renderPlayerDashboard() {
  ensureQuestionOrder();

  const nameEl = document.getElementById('pd-player-name');
  const prodiEl = document.getElementById('pd-player-prodi');
  const scoreEl = document.getElementById('pd-score');
  const progressEl = document.getElementById('pd-progress');
  const grid = document.getElementById('pd-question-grid');
  const finishBtn = document.getElementById('btn-finish-all');

  if (nameEl) nameEl.textContent = state.player?.nama || '-';
  if (prodiEl) prodiEl.textContent = state.player?.prodi || '-';
  if (scoreEl) scoreEl.textContent = state.score;
  const totalEl = document.getElementById('pd-total-score');
  if (totalEl) totalEl.textContent = state.totalScore || sumRoundScoresObj(state.roundScores) || state.score || 0;
  const badge = document.getElementById('pd-round-badge');
  if (badge) badge.textContent = 'Ronde ' + (state.activeRound || 1);

  const ordered = getOrderedQuestions();
  const total = ordered.length;
  const done = state.answeredIds.length;
  if (progressEl) progressEl.textContent = done + ' / ' + total + ' soal';

  if (!grid) return;
  grid.innerHTML = '';

  if (total === 0) {
    grid.innerHTML = '<p class="pd-empty">Belum ada soal. Hubungi admin.</p>';
    return;
  }

  const unlockIdx = getNextUnlockIndex(ordered);
  updateGateUI();

  // Posisi zig-zag tiap pulau (persen dari kiri) supaya jembatan terlihat berkelok
  const xs = [10, 52, 20, 58, 8, 48, 24, 56];

  ordered.forEach((q, idx) => {
    const isDone = state.answeredIds.includes(q.id);
    const isLocked = !isDone && idx > unlockIdx;
    const isCurrent = !isDone && idx === unlockIdx;
    const waiting = isCurrent && !state.gameOpen;

    const row = document.createElement('div');
    row.className = 'island-row';
    row.style.paddingLeft = xs[idx % xs.length] + '%';

    const btn = document.createElement('button');
    btn.className = 'island' + (isDone ? ' done' : '') + (isLocked ? ' locked' : '') +
      (isCurrent ? ' current' : '') + (waiting ? ' waiting' : '');
    btn.disabled = isDone || isLocked || waiting;
    btn.dataset.idx = idx;
    btn.setAttribute('aria-label', 'Pulau ' + (idx + 1) + (isDone ? ', selesai' : isLocked ? ', terkunci' : isCurrent ? ', siap dibuka' : ''));

    let badge = '';
    if (isDone) badge = '✅';
    else if (isLocked) badge = '🔒';
    else if (isCurrent) badge = state.gameOpen ? '⛵' : '⏳';

    btn.innerHTML = `
      <div class="island-disc">${idx + 1}<span class="island-badge">${badge}</span></div>
      <div class="island-cat">${escapeHtml(q.category || (q.type === 'puzzle' ? 'Teka-teki' : 'Kuis'))}</div>
      <div class="island-meta">${q.type === 'puzzle' ? 'Teka-teki' : 'Pilihan Ganda'} · ⏱ ${q.timeLimit || state.defaultTimeLimit}s · ⭐ ${q.points || 10}</div>
      ${isCurrent ? `<span class=\"island-flag\">${state.gameOpen ? 'Gas ke sini' : 'Nunggu admin'}</span>` : ''}
    `;
    if (isCurrent && state.gameOpen) {
      btn.addEventListener('click', () => openQuestion(q));
    }
    row.appendChild(btn);
    grid.appendChild(row);
  });

  requestAnimationFrame(drawIslandBridges);

  // Tombol selesai pertandingan HANYA di ronde 3
  const roundNow = Number(state.activeRound) || 1;
  const roundComplete = done >= total && total > 0;
  if (finishBtn) {
    if (roundNow >= 3 && roundComplete) {
      finishBtn.classList.remove('hidden');
      finishBtn.disabled = false;
      finishBtn.textContent = 'Kelarin pertandingan 🏆';
      finishBtn.title = 'Ronde 3 udah beres — liat skor total R1+R2+R3';
    } else {
      finishBtn.classList.add('hidden');
      finishBtn.disabled = true;
    }
  }

  // Banner status ronde untuk R1/R2
  let banner = document.getElementById('pd-round-complete-banner');
  if (!banner) {
    const grid = document.getElementById('pd-question-grid');
    if (grid && grid.parentElement) {
      banner = document.createElement('div');
      banner.id = 'pd-round-complete-banner';
      banner.className = 'pd-round-banner hidden';
      grid.parentElement.insertBefore(banner, grid.nextSibling);
    }
  }
  if (banner) {
    if (roundComplete && roundNow < 3) {
      banner.classList.remove('hidden');
      banner.innerHTML = '<strong>Ronde ' + roundNow + ' beres.</strong> Skor ronde ini udah ke-save. Nunggu admin nutup ronde ini trus buka <b>Ronde ' + (roundNow + 1) + '</b>. Finalnya di ronde 3 ya.';
    } else if (roundComplete && roundNow >= 3) {
      banner.classList.remove('hidden');
      banner.innerHTML = '<strong>Ronde 3 beres.</strong> Bisa kelarin pertandingan sekarang dan liat ranking akhir. Gila sih kalau podium.';
    } else {
      banner.classList.add('hidden');
      banner.innerHTML = '';
    }
  }
}

document.getElementById('btn-finish-all')?.addEventListener('click', () => {
  const r = Number(state.activeRound) || 1;
  const ordered = playerQuestions();
  const done = state.answeredIds.length;
  if (r < 3) {
    alert('Pertandingan cuma bisa dikelarin di Ronde 3.\n\nSekarang masih Ronde ' + r + '. Habisin soal ronde ini dulu, trus nunggu admin buka ronde berikutnya.');
    return;
  }
  if (done < ordered.length) {
    alert('Habisin dulu semua soal Ronde 3 baru boleh kelarin pertandingan.');
    return;
  }
  finishGame();
});

document.getElementById('btn-pd-back')?.addEventListener('click', () => {
  if (confirm('Keluar dari sesi? Skor tetep ke-save, tapi nanti isi nama lagi buat lanjut.')) {
    clearSession();
    startWelcome();
  }
});

// ========== STREAK UI ==========
function updateStreakUI() {
  const el = document.getElementById('streak-display');
  if (!el) return;
  const s = state.streak || 0;
  if (s >= 2) {
    el.classList.remove('hidden');
    el.innerHTML = '🔥 <span>' + s + '</span>';
    el.classList.toggle('hot', s >= 4);
    el.classList.toggle('on-fire', s >= 6);
  } else {
    el.classList.add('hidden');
    el.classList.remove('hot', 'on-fire');
  }
}

// ========== GAME: BUKA SATU SOAL ==========
function openQuestion(q) {
  if (!state.gameOpen) {
    alert('Soal belum dibuka admin. Tunggu sebentar.');
    return;
  }
  // Hanya boleh buka soal yang sedang unlock (keamanan ekstra)
  const ordered = getOrderedQuestions();
  const unlockIdx = getNextUnlockIndex(ordered);
  if (!ordered[unlockIdx] || ordered[unlockIdx].id !== q.id) {
    alert('Selesain dulu pulau sebelumnya, baru boleh lanjut.');
    return;
  }

  state.currentQuestion = q;
  state.selectedAnswer = null;
  state.answered = false;
  state.timeLimitCurrent = q.timeLimit || state.defaultTimeLimit;
  // Tandai sedang mengerjakan agar admin bisa pantau live
  if (db && state.playerDocId && state.playerDocId !== 'demo-local') {
    db.collection(COLLECTION_PLAYERS).doc(state.playerDocId).update({
      playing: true,
      currentQuestionId: q.id,
      lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});
  }
  // Jika soal yang sama sedang berjalan sebelum refresh, lanjutkan sisa waktunya (bukan mulai ulang)
  let startedAt = Date.now();
  const savedStart = loadQuestionStart();
  if (savedStart && savedStart.docId === state.playerDocId && savedStart.qid === q.id &&
      savedStart.t > 0 && savedStart.t <= startedAt) {
    startedAt = savedStart.t;
  } else {
    saveQuestionStart(state.playerDocId, q.id, startedAt);
  }
  state.questionStartTime = startedAt;

  document.getElementById('player-name-display').textContent = state.player.nama;
  document.getElementById('player-prodi-display').textContent = state.player.prodi;
  document.getElementById('current-score').textContent = state.score;
  updateStreakUI();

  showScreen('screen-game');
  renderQuestion();

  // Stage / Boss theme
  const stage = getCurrentStage();
  applyStageUI(stage);
  if (stage.isBoss) {
    playSfx('boss');
    spawnEmojiRain(['👹', '⚔️', '🔥', '💀', '⚡'], 14);
    setTimeout(() => speakSteko('Hati-hati bestie, ini Final Boss. Tunjukkin skill kamu!'), 400);
  } else {
    playSfx('whoosh');
  }
  setBgmMode(stage.isBoss ? 'boss' : 'game');

  startTimer(Math.max(0, Math.ceil(state.timeLimitCurrent - (Date.now() - startedAt) / 1000)));
}

function startTimer(seconds) {
  stopTimer();
  state.timeLeft = seconds;
  updateTimerUI();
  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    updateTimerUI();
    if (state.timeLeft <= 0) {
      stopTimer();
      if (!state.answered) {
        // Waktu habis → dianggap salah
        forceTimeout();
      }
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function updateTimerUI() {
  const el = document.getElementById('timer-display');
  const wrap = document.getElementById('timer-wrap');
  if (!el) return;
  el.textContent = formatTimerDisplay(Math.max(0, state.timeLeft));
  if (wrap) {
    wrap.classList.remove('timer-warn', 'timer-danger');
    if (state.timeLeft <= 10) wrap.classList.add('timer-danger');
    else if (state.timeLeft <= 20) wrap.classList.add('timer-warn');
  }
}

function forceTimeout() {
  state.answered = true;
  state.streak = 0;
  updateStreakUI();
  clearQuestionStart();
  stopTimer();
  const q = state.currentQuestion;
  const feedback = document.getElementById('feedback');
  feedback.className = 'feedback show wrong';
  const correctText = q.type === 'quiz'
    ? (q.options || [])[q.answer]
    : (Array.isArray(q.answer) ? q.answer[0] : q.answer);
  feedback.innerHTML = '⏰ Waktu abis!<br>Jawabannya: <b>' + escapeHtml(correctText) + '</b><br><small>' + escapeHtml(q.explanation || '') + '</small>';
  setBotMood('sad');
  screenPulse('wrong');
  playSfx('wrong');
  speakSteko('Waktu abis. Jawaban yang bener: ' + stripHtml(String(correctText)) + '.');

  document.querySelectorAll('.option-btn').forEach(b => {
    b.disabled = true;
    if (q.type === 'quiz' && parseInt(b.dataset.index) === q.answer) {
      b.classList.add('correct');
    }
  });

  document.getElementById('btn-submit').classList.add('hidden');
  document.getElementById('btn-back-to-pd').classList.remove('hidden');
  document.getElementById('btn-next').classList.add('hidden');

  // Tandai sudah dijawab (salah)
  markAnswered(false);
}

function renderQuestion() {
  const q = state.currentQuestion;
  if (!q) {
    enterPlayerDashboard();
    return;
  }

  state.selectedAnswer = null;
  state.answered = false;

  document.getElementById('q-type').textContent = q.category || (q.type || '').toUpperCase();
  document.getElementById('question-text').textContent = q.question;
  document.getElementById('progress-text').textContent =
    (state.answeredIds.length + 1) + ' / ' + playerQuestions().length;
  document.getElementById('progress-fill').style.width =
    ((state.answeredIds.length / Math.max(1, playerQuestions().length)) * 100) + '%';

  const optionsEl = document.getElementById('options-container');
  const puzzleEl = document.getElementById('puzzle-area');
  const feedback = document.getElementById('feedback');
  const btnSubmit = document.getElementById('btn-submit');
  const btnNext = document.getElementById('btn-next');
  const btnBack = document.getElementById('btn-back-to-pd');

  feedback.className = 'feedback';
  feedback.textContent = '';
  btnSubmit.classList.add('hidden');
  btnNext.classList.add('hidden');
  if (btnBack) btnBack.classList.add('hidden');

  if (q.type === 'quiz') {
    optionsEl.classList.remove('hidden');
    puzzleEl.classList.add('hidden');
    optionsEl.innerHTML = '';
    // Urutan opsi diacak tiap tampil; index asli (o.i) tetap dipakai untuk penilaian
    const shuffledOpts = shuffleArray((q.options || []).map((t, i) => ({ t, i })));
    shuffledOpts.forEach((o, pos) => {
      const optBtn = document.createElement('button');
      optBtn.className = 'option-btn';
      optBtn.innerHTML = '<span class="option-letter">' + String.fromCharCode(65 + pos) + '</span> <span>' + escapeHtml(o.t) + '</span>';
      optBtn.dataset.index = o.i;
      optBtn.addEventListener('click', () => selectOption(optBtn, o.i));
      optionsEl.appendChild(optBtn);
    });
  } else {
    optionsEl.classList.add('hidden');
    puzzleEl.classList.remove('hidden');
    puzzleEl.innerHTML = '<input type="text" class="puzzle-input" id="puzzle-input" placeholder="Ketik jawabanmu di sini..." autocomplete="off">' +
      (q.hint ? '<p style="margin-top:0.8rem;color:var(--muted);font-size:0.9rem;">💡 Petunjuk: ' + escapeHtml(q.hint) + '</p>' : '');
    btnSubmit.classList.remove('hidden');
    setTimeout(() => {
      const inp = document.getElementById('puzzle-input');
      if (inp) inp.focus();
    }, 100);
  }
}

function selectOption(btn, index) {
  if (state.answered) return;
  playSfx('click');
  document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.selectedAnswer = index;
  checkAnswer();
}

function checkAnswer() {
  if (state.answered) return;
  const q = state.currentQuestion;
  let isCorrect = false;

  if (q.type === 'quiz') {
    if (state.selectedAnswer === null) return;
    isCorrect = state.selectedAnswer === q.answer;
  } else {
    const input = document.getElementById('puzzle-input');
    if (!input) return;
    const userAnswer = normalizeAnswer(input.value);
    const correctAnswers = Array.isArray(q.answer) ? q.answer : [q.answer];
    isCorrect = !!userAnswer && correctAnswers.some(a => {
      const ans = normalizeAnswer(a);
      if (userAnswer === ans) return true;
      // Jawaban berupa kata (bukan angka, min. 4 huruf) boleh terselip dalam kalimat
      return /^[A-Z ]{4,}$/.test(ans) && userAnswer.includes(ans);
    });
  }

  state.answered = true;
  clearQuestionStart();
  stopTimer();

  document.querySelectorAll('.option-btn').forEach(b => {
    b.disabled = true;
    const idx = parseInt(b.dataset.index);
    if (q.type === 'quiz') {
      if (idx === q.answer) b.classList.add('correct');
      else if (idx === state.selectedAnswer && !isCorrect) b.classList.add('wrong');
    }
  });

  const feedback = document.getElementById('feedback');
  feedback.classList.add('show');
  if (isCorrect) {
    const bonus = calcBonusPoints(state.timeLeft, state.timeLimitCurrent);
    let gained = (q.points || 10) + bonus;

    // Streak system
    state.streak = (state.streak || 0) + 1;
    if (state.streak > (state.maxStreak || 0)) state.maxStreak = state.streak;
    let streakBonus = 0;
    if (state.streak >= 3) {
      streakBonus = Math.min(15, (state.streak - 2) * 3); // +3, +6, +9... max 15
      gained += streakBonus;
    }
    // Bonus ekstra untuk mengalahkan boss
    const stageNow = getCurrentStage();
    let bossBonus = 0;
    if (stageNow.isBoss) {
      bossBonus = 15;
      gained += bossBonus;
    }
    state.score += gained;
    state.correct += 1;
    state.lastScoreGain = gained;

    feedback.classList.add('correct');
    let streakHtml = '';
    if (state.streak >= 2) {
      streakHtml = ' <span class="streak-badge">🔥 x' + state.streak + '</span>';
    }
    feedback.innerHTML = (stageNow.isBoss ? '👑 BOSS DITAKLUKKAN! ' : '✅ Benar! ') + '+' + gained + ' poin' +
      (bonus ? ' <span style="color:#ffb800">(+' + bonus + ' kecepatan)</span>' : '') +
      (streakBonus ? ' <span style="color:#ff6b35">(+' + streakBonus + ' streak)</span>' : '') +
      (bossBonus ? ' <span style="color:#ffd700">(+' + bossBonus + ' boss)</span>' : '') +
      streakHtml +
      '<br><small>' + escapeHtml(q.explanation || '') + '</small>';

    setBotMood('happy');
    spawnConfetti(stageNow.isBoss || state.streak >= 5 ? 48 : 18);
    spawnFloatingScore(gained);
    screenPulse(stageNow.isBoss || state.streak >= 4 ? 'streak' : 'correct');
    playSfx(stageNow.isBoss ? 'levelup' : (state.streak >= 3 ? 'streak' : 'correct'));

    if (stageNow.isBoss) {
      spawnEmojiRain(['👑', '🏆', '🔥', '⭐', '💎', '🎉'], 22);
      speakSteko('Luar biasa! Final Boss berhasil ditaklukkan! Plus ' + gained + ' poin. Kamu juara!');
    } else if (state.streak === 3) {
      spawnEmojiRain(['🔥', '⚡', '✨'], 10);
      speakSteko('Benar! Plus ' + gained + ' poin. Streak tiga! Terus panas!');
    } else if (state.streak >= 5) {
      spawnEmojiRain(['🔥', '💥', '🌟', '⚡', '🎉'], 18);
      playSfx('levelup');
      speakSteko('Luar biasa! Streak ' + state.streak + '! Plus ' + gained + ' poin. Kamu on fire!');
    } else if (state.streak >= 2) {
      speakSteko('Benar lagi! Plus ' + gained + ' poin. Streak ' + state.streak + '!');
    } else {
      speakSteko('Nice! Bener. Plus ' + gained + ' poin' + (bonus ? ', plus bonus cepet ' + bonus : '') + '.');
    }
    updateStreakUI();
  } else {
    state.streak = 0;
    updateStreakUI();
    feedback.classList.add('wrong');
    const correctText = q.type === 'quiz'
      ? (q.options || [])[q.answer]
      : (Array.isArray(q.answer) ? q.answer[0] : q.answer);
    feedback.innerHTML = '❌ Kurang pas. Jawabannya: <b>' + escapeHtml(correctText) + '</b><br><small>' + escapeHtml(q.explanation || '') + '</small>';
    setBotMood('sad');
    screenPulse('wrong');
    playSfx('wrong');
    speakSteko('Yah kurang pas. Jawaban yang bener: ' + stripHtml(String(correctText)) + '.');
  }

  document.getElementById('current-score').textContent = state.score;
  // Animasi skor naik
  const scoreEl = document.getElementById('current-score');
  if (scoreEl) {
    scoreEl.classList.remove('score-pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('score-pop');
  }
  document.getElementById('btn-submit').classList.add('hidden');
  document.getElementById('btn-back-to-pd').classList.remove('hidden');

  markAnswered(isCorrect);
}

async function markAnswered(isCorrect) {
  const q = state.currentQuestion;
  if (!q || state.answeredIds.includes(q.id)) return;

  state.answeredIds.push(q.id);

  if (!db || !state.playerDocId || state.playerDocId === 'demo-local') return;
  const timeSpent = Math.floor((Date.now() - (state.startTime || Date.now())) / 1000);
  try {
    const roundUpdate = buildRoundScoreUpdate(state.score);
    await db.collection(COLLECTION_PLAYERS).doc(state.playerDocId).update({
      score: state.score,
      correct: state.correct,
      totalAnswered: state.answeredIds.length,
      timeSpent,
      answeredIds: state.answeredIds,
      finished: (Number(state.activeRound) || 1) >= 3 && state.answeredIds.length >= playerQuestions().length,
      playing: false,
      currentQuestionId: null,
      ...roundUpdate,
      lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.warn('Gagal update skor:', e);
  }
}

document.getElementById('btn-submit').addEventListener('click', checkAnswer);

document.getElementById('btn-back-to-pd')?.addEventListener('click', () => {
  setBotMood('idle');
  enterPlayerDashboard();
});

// Tombol next lama disembunyikan (tidak dipakai di alur baru)
document.getElementById('btn-next')?.addEventListener('click', () => {
  setBotMood('idle');
  enterPlayerDashboard();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.getElementById('screen-game')?.classList.contains('active')) {
    if (!state.answered) {
      const input = document.getElementById('puzzle-input');
      if (input) checkAnswer();
    } else {
      document.getElementById('btn-back-to-pd')?.click();
    }
  }
});

async function finishGame() {
  const r = Number(state.activeRound) || 1;
  if (r < 3) {
    alert('Hasil akhir kebuka abis Ronde 3 beres ya.');
    return;
  }
  stopTimer();
  if (db && state.playerDocId && state.playerDocId !== 'demo-local') {
    const timeSpent = Math.floor((Date.now() - (state.startTime || Date.now())) / 1000);
    try {
      const roundUpdate = buildRoundScoreUpdate(state.score);
      await db.collection(COLLECTION_PLAYERS).doc(state.playerDocId).update({
        score: state.score,
        correct: state.correct,
        totalAnswered: state.answeredIds.length,
        timeSpent,
        answeredIds: state.answeredIds,
        finished: true,
        playing: false,
        currentQuestionId: null,
        ...roundUpdate,
        lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.warn(e);
    }
  }

  const total = state.totalScore || sumRoundScoresObj(state.roundScores) || state.score;
  document.getElementById('final-score').textContent = total;
  document.getElementById('final-correct').textContent = state.correct;
  document.getElementById('final-total').textContent = playerQuestions().length;
  const rs = state.roundScores || {};
  const br = document.getElementById('final-round-breakdown');
  if (br) {
    br.textContent = 'R1: ' + (rs[1]||rs['1']||0) + ' · R2: ' + (rs[2]||rs['2']||0) + ' · R3: ' + (rs[3]||rs['3']||0) + ' · Ronde ini: ' + (state.score||0);
  }
  document.getElementById('final-time').textContent = formatTime(
    Math.floor((Date.now() - (state.startTime || Date.now())) / 1000)
  );
  // Tampilkan max streak jika elemen ada
  const maxStreakEl = document.getElementById('final-max-streak');
  if (maxStreakEl) maxStreakEl.textContent = state.maxStreak || 0;

  showScreen('screen-result');
  const goodScore = state.correct >= playerQuestions().length / 2;
  const greatStreak = (state.maxStreak || 0) >= 4;
  setBotMood(goodScore ? 'happy' : 'idle');
  if (goodScore) {
    spawnConfetti(greatStreak ? 90 : 60);
    if (greatStreak) spawnEmojiRain(['🏆', '🔥', '⭐', '🎉', '💎'], 20);
    playSfx('levelup');
    const streakMsg = greatStreak ? ' Streak tertinggimu ' + state.maxStreak + '! ' : ' ';
    speakSteko('Luar biasa, ' + stripHtml(state.player?.nama || 'Petualang') + '!' + streakMsg + 'Petualanganmu di Mahadipa 2026 selesai dengan hasil gemilang.');
  } else {
    speakSteko('Petualangan selesai. Terus asah pengetahuanmu untuk hasil yang lebih baik lagi.');
  }
  loadLeaderboard();
}

// ========== LEADERBOARD ==========
function loadLeaderboard() {
  if (!db) return;
  if (state.unsubscribeLeaderboard) state.unsubscribeLeaderboard();

  state.unsubscribeLeaderboard = db.collection(COLLECTION_PLAYERS)
    .limit(80)
    .onSnapshot((snapshot) => {
      const players = [];
      snapshot.forEach(doc => players.push({ id: doc.id, ...doc.data() }));
      players.sort((a, b) => {
        const ta = Number(a.totalScore) || sumRoundScoresObj(a.roundScores) || (a.score || 0);
        const tb = Number(b.totalScore) || sumRoundScoresObj(b.roundScores) || (b.score || 0);
        if (tb !== ta) return tb - ta;
        return (a.timeSpent || 99999) - (b.timeSpent || 99999);
      });
      renderPodiumInto('podium', players.slice(0, 3));
      renderLeaderboardListInto('leaderboard-list', players.slice(0, 30));
    });
}

function renderPodiumInto(elId, players) {
  const el = document.getElementById(elId);
  if (!el) return;
  const order = [1, 0, 2]; // 2nd, 1st, 3rd visual
  const medals = ['🥈', '🥇', '🥉'];
  const heights = ['h-2', 'h-1', 'h-3'];
  el.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const p = players[order[i]];
    const div = document.createElement('div');
    div.className = 'podium-place ' + heights[i];
    if (p) {
      div.innerHTML = `
        <div class="podium-medal">${medals[i]}</div>
        <div class="podium-name">${escapeHtml(p.nama || '-')}</div>
        <div class="podium-score">${Number(p.totalScore) || sumRoundScoresObj(p.roundScores) || (p.score || 0)} pts</div>
        <div class="podium-bar"></div>
      `;
    } else {
      div.innerHTML = `<div class="podium-medal">${medals[i]}</div><div class="podium-name">—</div><div class="podium-bar"></div>`;
    }
    el.appendChild(div);
  }
}

function renderLeaderboardListInto(elId, players) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = '';
  players.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row';
    row.innerHTML = `
      <span class="lb-rank">${i + 1}</span>
      <span class="lb-name">${escapeHtml(p.nama || '-')}</span>
      <span class="lb-prodi">${escapeHtml(p.prodi || '')}</span>
      <span class="lb-score">${Number(p.totalScore) || sumRoundScoresObj(p.roundScores) || (p.score || 0)}</span>
    `;
    el.appendChild(row);
  });
}

// Result actions
document.getElementById('btn-play-again')?.addEventListener('click', () => {
  clearSession();
  showScreen('screen-login');
});
document.getElementById('btn-to-dashboard')?.addEventListener('click', () => {
  showScreen('screen-dashboard');
});

// ========== ADMIN ==========
// Panel admin dipisah ke admin.html (akses langsung, tidak lewat web publik)
document.querySelectorAll('.js-go-admin').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = 'admin.html';
}));

document.getElementById('btn-admin-login')?.addEventListener('click', () => {
  const pass = document.getElementById('admin-pass').value;
  if (pass === ADMIN_PASSWORD) {
    state.isAdmin = true;
    document.getElementById('admin-login-box').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    loadAdminData();
    updateAdminGateUI();
  } else {
    alert('Password salah');
  }
});

document.getElementById('btn-logout-admin')?.addEventListener('click', () => {
  state.isAdmin = false;
  if (state.unsubscribeAdminPlayers) {
    state.unsubscribeAdminPlayers();
    state.unsubscribeAdminPlayers = null;
  }
  startWelcome();
});

document.querySelectorAll('.admin-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const tab = document.getElementById(btn.dataset.tab);
    if (tab) tab.classList.add('active');
    if (btn.dataset.tab === 'tab-questions') renderQuestionAdminList();
    if (btn.dataset.tab === 'tab-progress') renderProgressMatrix();
    if (btn.dataset.tab === 'tab-players' || btn.dataset.tab === 'tab-overview') loadAdminData();
  });
});

function loadAdminData() {
  if (!db) return;

  // Real-time: satu listener untuk overview + tabel peserta + matrix progress
  if (state.unsubscribeAdminPlayers) state.unsubscribeAdminPlayers();

  state.unsubscribeAdminPlayers = db.collection(COLLECTION_PLAYERS)
    .onSnapshot((snapshot) => {
      const players = [];
      snapshot.forEach(doc => players.push({ id: doc.id, ...doc.data() }));
      state._adminPlayersCache = players;

      document.getElementById('admin-total').textContent = players.length;
      document.getElementById('admin-finished').textContent = players.filter(p => p.finished).length;
      document.getElementById('admin-avg').textContent = players.length
        ? Math.round(players.reduce((s, p) => s + (p.score || 0), 0) / players.length)
        : 0;

      const tbody = document.querySelector('#admin-table tbody');
      if (tbody) {
        tbody.innerHTML = '';
        players.sort((a, b) => (b.score || 0) - (a.score || 0)).forEach((p, i) => {
          const tr = document.createElement('tr');
          const answered = Array.isArray(p.answeredIds) ? p.answeredIds.length : (p.totalAnswered || 0);
          tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${escapeHtml(p.nama)}</td>
            <td>${escapeHtml(p.prodi)}</td>
            <td>${p.score || 0}</td>
            <td>${p.correct || 0}</td>
            <td>${answered}</td>
            <td>${p.finished ? '✅ Selesai' : (p.playing ? '🎮 Mengerjakan' : (answered > 0 ? '📋 Dashboard' : '⏳ Siap'))}</td>
            <td><button class="btn btn-sm btn-danger btn-del-player" data-id="${p.id}">Hapus</button></td>
          `;
          tbody.appendChild(tr);
        });
        tbody.querySelectorAll('.btn-del-player').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!confirm('Hapus peserta ini?')) return;
            await db.collection(COLLECTION_PLAYERS).doc(btn.dataset.id).delete();
          });
        });
      }

      // Auto-refresh matrix jika tab progress aktif
      if (document.getElementById('tab-progress')?.classList.contains('active')) {
        renderProgressMatrix();
      }
    }, (err) => console.error('Admin players listener:', err));
}

function renderProgressMatrix() {
  const head = document.getElementById('progress-matrix-head');
  const body = document.getElementById('progress-matrix-body');
  if (!head || !body) return;

  const players = state._adminPlayersCache || [];
  const questions = state.allQuestions || [];

  if (!questions.length) {
    head.innerHTML = '';
    body.innerHTML = '<tr><td colspan="99" style="text-align:center;padding:1.5rem;color:var(--muted)">Belum ada soal.</td></tr>';
    return;
  }

  // Header: Peserta | Q1 | Q2 | ... | Selesai
  let headHtml = '<tr><th class="sticky-col">Peserta</th><th>Prodi</th><th>Skor</th>';
  questions.forEach((q, i) => {
    const short = (q.category || 'Q').slice(0, 8);
    headHtml += '<th title="' + escapeHtml(q.question || '') + '">S' + (i + 1) + '<br><small>' + escapeHtml(short) + '</small></th>';
  });
  headHtml += '<th>Total</th></tr>';
  head.innerHTML = headHtml;

  body.innerHTML = '';
  if (!players.length) {
    body.innerHTML = '<tr><td colspan="' + (questions.length + 4) + '" style="text-align:center;padding:1.5rem;color:var(--muted)">Belum ada peserta.</td></tr>';
    return;
  }

  players
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .forEach(p => {
      const answered = new Set(Array.isArray(p.answeredIds) ? p.answeredIds : []);
      const tr = document.createElement('tr');
      let cells = '<td class="sticky-col"><b>' + escapeHtml(p.nama || '-') + '</b></td>';
      cells += '<td>' + escapeHtml((p.prodi || '').slice(0, 18)) + '</td>';
      cells += '<td><b>' + (p.score || 0) + '</b></td>';
      questions.forEach(q => {
        if (!questionAppliesTo(q, p.prodi)) {
          cells += '<td class="cell-na" title="Bukan untuk prodi ini">–</td>';
        } else if (answered.has(q.id)) {
          cells += '<td class="cell-done" title="Sudah dijawab">✓</td>';
        } else if (p.playing && p.currentQuestionId === q.id) {
          cells += '<td class="cell-playing" title="Sedang dikerjakan">▶</td>';
        } else {
          cells += '<td class="cell-pending" title="Belum">·</td>';
        }
      });
      cells += '<td>' + answered.size + '/' + questions.filter(q => questionAppliesTo(q, p.prodi)).length + '</td>';
      tr.innerHTML = cells;
      body.appendChild(tr);
    });
}

document.getElementById('btn-refresh-progress')?.addEventListener('click', () => {
  renderProgressMatrix();
});

function renderQuestionAdminList() {
  const list = document.getElementById('q-list');
  if (!list) return;
  const search = (document.getElementById('q-search')?.value || '').toLowerCase();
  let qs = state.allQuestions;
  if (search) {
    qs = qs.filter(q =>
      (q.question || '').toLowerCase().includes(search) ||
      (q.category || '').toLowerCase().includes(search)
    );
  }
  list.innerHTML = '';
  qs.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'q-admin-item';
    div.innerHTML = `
      <div class="q-admin-info">
        <span class="q-admin-cat">${escapeHtml(q.category || '-')}</span>
        <span class="q-admin-type">${q.type || 'quiz'}</span>
        <span class="q-admin-timer">⏱ ${q.timeLimit || state.defaultTimeLimit}s</span>
        <span class="q-admin-type">${escapeHtml(q.rumpun || 'umum')}</span>
        <span class="q-admin-timer">⭐ ${q.points || 10}</span>
        <p>${escapeHtml((q.question || '').slice(0, 100))}${(q.question || '').length > 100 ? '…' : ''}</p>
      </div>
      <div class="q-admin-actions">
        <button class="btn btn-sm btn-secondary btn-edit-q" data-id="${q.id}">Edit</button>
        <button class="btn btn-sm btn-danger btn-del-q" data-id="${q.id}">Hapus</button>
      </div>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll('.btn-edit-q').forEach(btn => {
    btn.addEventListener('click', () => openQuestionModal(btn.dataset.id));
  });
  list.querySelectorAll('.btn-del-q').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Hapus soal ini?')) return;
      await db.collection(COLLECTION_QUESTIONS).doc(btn.dataset.id).delete();
    });
  });
}

document.getElementById('q-search')?.addEventListener('input', renderQuestionAdminList);
document.getElementById('btn-add-question')?.addEventListener('click', () => openQuestionModal(null));

function openQuestionModal(id) {
  const modal = document.getElementById('question-modal');
  modal.classList.remove('hidden');
  state.editingQuestionId = id;

  if (id) {
    const q = state.allQuestions.find(x => x.id === id);
    document.getElementById('q-modal-title').textContent = 'Edit Soal';
    document.getElementById('qf-id').value = id;
    document.getElementById('qf-type').value = q.type || 'quiz';
    document.getElementById('qf-category').value = q.category || '';
    document.getElementById('qf-question').value = q.question || '';
    document.getElementById('qf-explanation').value = q.explanation || '';
    document.getElementById('qf-timelimit').value = q.timeLimit || state.defaultTimeLimit;
    document.getElementById('qf-rumpun').value = q.rumpun || 'umum';
    document.getElementById('qf-points').value = q.points || 10;

    if (q.type === 'puzzle') {
      const ans = Array.isArray(q.answer) ? q.answer.join(', ') : (q.answer || '');
      document.getElementById('qf-answer-text').value = ans;
      document.getElementById('qf-hint').value = q.hint || '';
    } else {
      (q.options || []).forEach((opt, i) => {
        const inp = document.getElementById('qf-opt-' + i);
        if (inp) inp.value = opt;
      });
      const radio = document.querySelector('input[name="qf-correct"][value="' + (q.answer || 0) + '"]');
      if (radio) radio.checked = true;
    }
  } else {
    document.getElementById('q-modal-title').textContent = 'Tambah Soal';
    document.getElementById('qf-id').value = '';
    document.getElementById('question-form').reset();
    document.getElementById('qf-timelimit').value = state.defaultTimeLimit;
  }
  toggleQuestionFormFields();
}

document.getElementById('qf-type')?.addEventListener('change', toggleQuestionFormFields);

function toggleQuestionFormFields() {
  const type = document.getElementById('qf-type').value;
  document.getElementById('qf-quiz-fields').classList.toggle('hidden', type !== 'quiz');
  document.getElementById('qf-puzzle-fields').classList.toggle('hidden', type !== 'puzzle');
}

document.getElementById('btn-cancel-modal')?.addEventListener('click', () => {
  document.getElementById('question-modal').classList.add('hidden');
});

document.getElementById('question-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('qf-id').value;
  const type = document.getElementById('qf-type').value;
  const category = document.getElementById('qf-category').value.trim();
  const question = document.getElementById('qf-question').value.trim();
  const explanation = document.getElementById('qf-explanation').value.trim();
  const timeLimit = parseInt(document.getElementById('qf-timelimit').value) || state.defaultTimeLimit;

  if (!category || !question) {
    alert('Kategori dan pertanyaan wajib diisi.');
    return;
  }

  const rumpun = document.getElementById('qf-rumpun').value || 'umum';
  const points = Math.max(5, Math.min(50, parseInt(document.getElementById('qf-points').value) || 10));
  const payload = { type, category, question, explanation, timeLimit, rumpun, points };

  if (type === 'quiz') {
    const options = [0, 1, 2, 3].map(i => document.getElementById('qf-opt-' + i).value.trim());
    if (options.some(o => !o)) {
      alert('Semua 4 opsi jawaban wajib diisi.');
      return;
    }
    const correctIndex = parseInt(document.querySelector('input[name="qf-correct"]:checked').value);
    payload.options = options;
    payload.answer = correctIndex;
  } else {
    const answerRaw = document.getElementById('qf-answer-text').value.trim();
    if (!answerRaw) {
      alert('Jawaban wajib diisi.');
      return;
    }
    const answers = answerRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    payload.answer = answers.length > 1 ? answers : answers[0];
    payload.hint = document.getElementById('qf-hint').value.trim();
  }

  try {
    if (id) {
      await db.collection(COLLECTION_QUESTIONS).doc(id).update(payload);
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection(COLLECTION_QUESTIONS).add(payload);
    }
    document.getElementById('question-modal').classList.add('hidden');
  } catch (err) {
    alert('Gagal menyimpan soal: ' + err.message);
  }
});

document.getElementById('btn-seed-questions')?.addEventListener('click', async () => {
  if (!confirm('Isi database dengan ' + SEED_QUESTIONS.length + ' soal contoh? Soal yang sudah ada tidak akan dihapus.')) return;
  try {
    const batch = db.batch();
    SEED_QUESTIONS.forEach(q => {
      const ref = db.collection(COLLECTION_QUESTIONS).doc();
      batch.set(ref, {
        ...q,
        timeLimit: q.timeLimit || 45,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    alert('Soal contoh berhasil ditambahkan!');
  } catch (err) {
    alert('Gagal mengisi soal contoh: ' + err.message);
  }
});

document.getElementById('btn-replace-questions')?.addEventListener('click', async () => {
  if (!db) { alert('Firebase tidak aktif.'); return; }
  if (!confirm('HAPUS semua soal yang ada, lalu isi ' + SEED_QUESTIONS.length + ' soal baru?\n\nDisarankan juga menekan "Reset Semua Peserta" agar progres lama tidak bentrok dengan soal baru.')) return;
  try {
    const snap = await db.collection(COLLECTION_QUESTIONS).get();
    const batch = db.batch();
    snap.forEach(d => batch.delete(d.ref));
    SEED_QUESTIONS.forEach(q => {
      const ref = db.collection(COLLECTION_QUESTIONS).doc();
      batch.set(ref, {
        ...q,
        timeLimit: q.timeLimit || 45,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    alert('Selesai. ' + SEED_QUESTIONS.length + ' soal baru aktif.');
  } catch (err) {
    alert('Gagal mengganti soal: ' + err.message);
  }
});

// ========== INIT ==========
// Browser memblokir suara otomatis sebelum ada interaksi. Jadi: loading dulu,
// lalu peserta menekan tombol Start. Klik itu "membuka kunci" suara Steko.
function unlockStekoAudio() {
  getRoboAudioCtx();
  if (!window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.lang = stekoVoice.preferredLang;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

function waitForVoices(maxMs) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) return resolve();
    const have = () => (window.speechSynthesis.getVoices() || []).length > 0;
    if (have()) return resolve();
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (have() || Date.now() - t0 > maxMs) { clearInterval(iv); resolve(); }
    }, 150);
  });
}

window.addEventListener('load', () => {
  loadVoicePref();
  loadMusicPref();
  startBotBlinking();
  setBotMood('idle');
  const ok = initFirebase();
  const bar = document.getElementById('loader-bar-fill');
  const loadingText = document.getElementById('loading-text');
  const setProgress = (p, txt) => {
    if (bar) bar.style.width = p + '%';
    if (txt && loadingText) loadingText.textContent = txt;
  };
  setProgress(25, 'Lagi nyiapin petualangan...');

  if (ok) listenQuestions();
  listenGameStatus();
  if (ok) loadDashboard();
  if (!state.allQuestions.length) useLocalSeedQuestions();

  const minWait = new Promise(r => setTimeout(r, 1200));
  setProgress(60, 'Lagi nyiapin suara Steko...');
  Promise.all([minWait, waitForVoices(2500)]).then(() => {
    setProgress(100, 'Udah siap semua!');
    document.querySelector('#screen-loading .loader')?.classList.add('ready');

    // Tampilkan lobi tunggu — TIDAK ada tombol "Mulai Petualangan"
    const lobby = document.getElementById('lobby-wait');
    lobby?.classList.remove('hidden');
    document.getElementById('loading-hint')?.classList.remove('hidden');
    document.getElementById('loader-bar-fill')?.parentElement?.classList.add('hidden');
    const loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.textContent = 'Siap. Nunggu admin…';

    state._lobbyReady = true;
    updateEntryUI();

    // Sesi tersimpan? Info di lobi + opsi ganti pemain
    let session = ok ? loadSession() : null;
    const switchLink = document.getElementById('btn-switch-player');
    const sessionInfo = document.getElementById('lobby-session-info');
    const refreshLobbySessionUI = () => {
      session = ok ? loadSession() : null;
      if (session) {
        if (sessionInfo) {
          sessionInfo.textContent = 'Sesi ke-save: ' + session.nama + ' · lanjut otomatis pas admin buka sesi';
          sessionInfo.classList.remove('hidden');
        }
        switchLink?.classList.remove('hidden');
      } else {
        sessionInfo?.classList.add('hidden');
        switchLink?.classList.add('hidden');
      }
    };
    refreshLobbySessionUI();
    switchLink?.addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      refreshLobbySessionUI();
    });

    // Mode demo (tanpa Firebase): langsung buka sesi agar bisa dicoba
    if (!ok) {
      state.entryOpen = true;
      state.entryKnown = true;
      updateEntryUI();
      setTimeout(() => tryStartFromLobby(), 400);
    } else {
      // Jika admin sudah membuka sesi sebelumnya, masuk otomatis
      tryStartFromLobby();
    }
  });
});

// ========== JEMBATAN ANTAR PULAU ==========
function drawIslandBridges() {
  const map = document.getElementById('pd-question-grid');
  if (!map) return;
  map.querySelector('.island-bridges')?.remove();
  const discs = Array.from(map.querySelectorAll('.island'));
  if (discs.length < 2) return;

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'island-bridges');
  const mapRect = map.getBoundingClientRect();
  if (!mapRect.width) return;
  svg.setAttribute('viewBox', `0 0 ${mapRect.width} ${mapRect.height}`);

  const centers = discs.map(btn => {
    const r = btn.querySelector('.island-disc').getBoundingClientRect();
    return { x: r.left - mapRect.left + r.width / 2, y: r.top - mapRect.top + r.height / 2 };
  });

  for (let i = 0; i < centers.length - 1; i++) {
    const a = centers[i], b = centers[i + 1];
    const midY = (a.y + b.y) / 2;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`);
    path.setAttribute('class', discs[i].classList.contains('done') ? 'bridge-done' : 'bridge-todo');
    svg.appendChild(path);
  }
  map.prepend(svg);
}
window.addEventListener('resize', () => requestAnimationFrame(drawIslandBridges));
