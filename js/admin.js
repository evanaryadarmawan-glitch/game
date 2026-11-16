// Mahadipa 2026 — Admin Panel (halaman terpisah: admin.html)
// Mengontrol pintu masuk sesi, buka/tutup soal, peserta, progress, dan CRUD soal.

let db = null;
const state = {
  isAdmin: false,
  allQuestions: [],
  questionsLoaded: false,
  defaultTimeLimit: 45,
  editingQuestionId: null,
  gameOpen: false,
  entryOpen: false,
  activeRound: 1,
  unsubscribeGame: null,
  unsubscribeQuestions: null,
  unsubscribeAdminPlayers: null,
  _adminPlayersCache: []
};

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

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sumRoundScores(p) {
  const rs = (p && p.roundScores) || {};
  return [1, 2, 3].reduce((s, k) => s + (Number(rs[k]) || Number(rs[String(k)]) || 0), 0);
}

function initFirebase() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    return true;
  } catch (e) {
    console.error('Firebase init gagal:', e);
    db = null;
    return false;
  }
}

// ========== STATUS ENTRY & GAME ==========
function updateEntryUI() {
  const el = document.getElementById('entry-status');
  if (el) el.textContent = state.entryOpen ? 'Dibuka' : 'Ditutup';
}

function updateAdminGateUI() {
  const el = document.getElementById('gc-status');
  if (el) el.textContent = state.gameOpen ? 'Dibuka' : 'Ditutup';
}

function listenGameStatus() {
  if (!db) {
    state.gameOpen = false;
    state.entryOpen = false;
    updateEntryUI();
    updateAdminGateUI();
    return;
  }
  if (state.unsubscribeGame) state.unsubscribeGame();
  state.unsubscribeGame = db.collection(COLLECTION_META).doc('game')
    .onSnapshot((doc) => {
      const d = doc.exists ? doc.data() : {};
      state.entryOpen = d.entryStatus === 'open';
      state.gameOpen = d.status === 'open';
      state.activeRound = Number(d.activeRound) || 1;
      updateEntryUI();
      updateAdminGateUI();
      updateRoundUI();
    }, (err) => console.warn('Gagal listen status game:', err));
}

function updateRoundUI() {
  const r = state.activeRound || 1;
  const el = document.getElementById('round-status');
  if (el) el.textContent = String(r);
  const ar = document.getElementById('admin-round');
  if (ar) ar.textContent = String(r);
  document.querySelectorAll('.btn-round').forEach(btn => {
    const n = Number(btn.dataset.round);
    btn.classList.toggle('btn-primary', n === r);
    btn.classList.toggle('btn-secondary', n !== r);
  });
  const phase = document.getElementById('round-phase');
  if (phase) {
    phase.textContent = state.gameOpen
      ? ('Ronde ' + r + ' sedang berjalan')
      : ('Ronde ' + r + ' dipilih · belum dibuka / sudah ditutup');
  }
  const hint = document.getElementById('round-hint');
  if (hint) {
    if (state.gameOpen) {
      hint.innerHTML = 'Peserta sedang mengerjakan <b>Ronde ' + r + '</b>. Setelah selesai, tekan <b>Tutup Ronde &amp; Simpan Skor</b>.';
    } else if (r < 3) {
      hint.innerHTML = 'Ronde <b>' + r + '</b> siap. Tekan <b>Buka Ronde</b> untuk memulai, atau pilih ronde lain dulu. Soal tiap ronde berbeda.';
    } else {
      hint.innerHTML = 'Ronde <b>3</b> siap. Setelah ditutup, cek tab Peserta untuk total R1+R2+R3 dan juara 1–2–3.';
    }
  }
  updateAdminGateUI();
}

function getSeedForRound(n) {
  if (typeof getSeedRound === 'function') return getSeedRound(n);
  if (typeof SEED_ROUNDS !== 'undefined' && SEED_ROUNDS[n]) return SEED_ROUNDS[n];
  return (typeof SEED_QUESTIONS !== 'undefined') ? SEED_QUESTIONS : [];
}

async function replaceQuestionsWithSeed(round) {
  const seed = getSeedForRound(round);
  if (!seed.length) throw new Error('Paket seed ronde ' + round + ' kosong');
  const snap = await db.collection(COLLECTION_QUESTIONS).get();
  // Hapus batch per 400
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  for (let i = 0; i < seed.length; i += 400) {
    const batch = db.batch();
    seed.slice(i, i + 400).forEach(q => {
      const ref = db.collection(COLLECTION_QUESTIONS).doc();
      const { id, ...rest } = q;
      batch.set(ref, {
        ...rest,
        seedRound: round,
        timeLimit: q.timeLimit || state.defaultTimeLimit,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
  }
  return seed.length;
}

async function resetPlayersForNewRound(round) {
  // Simpan skor ronde sebelumnya sudah ada di roundScores; reset progres ronde baru
  const snap = await db.collection(COLLECTION_PLAYERS).get();
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 200) {
    const batch = db.batch();
    docs.slice(i, i + 200).forEach(doc => {
      const d = doc.data() || {};
      const rs = d.roundScores && typeof d.roundScores === 'object' ? { ...d.roundScores } : {};
      // Pastikan total dari R1+R2+R3
      const total = [1, 2, 3].reduce((s, k) => s + (Number(rs[k]) || Number(rs[String(k)]) || 0), 0);
      batch.update(doc.ref, {
        score: 0,
        correct: 0,
        totalAnswered: 0,
        answeredIds: [],
        questionOrder: [],
        finished: false,
        playing: false,
        currentQuestionId: null,
        currentRound: round,
        roundScores: rs,
        totalScore: total,
        lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
  }
}

async function activateRound(round) {
  if (!db) { alert('Firebase tidak aktif.'); return; }
  round = Number(round) || 1;
  const seed = getSeedForRound(round);

  if (state.gameOpen) {
    alert('Ronde masih dibuka. Tutup ronde & simpan skor dulu sebelum pilih ronde lain.');
    return;
  }

  if (state.activeRound === round) {
    // Sudah ronde ini — tanya apakah muat ulang seed
    if (!confirm('Ronde ' + round + ' sudah dipilih.\nMuat ulang ' + seed.length + ' soal seed ronde ' + round + ' (progres ronde ini direset)?')) return;
  } else {
    if (!confirm(
      'Pilih RONDE ' + round + '?\n\n' +
      '• Soal diganti paket Ronde ' + round + ' (' + seed.length + ' soal, berbeda dari ronde lain)\n' +
      '• Dashboard mahasiswa akan menampilkan "Ronde ' + round + '"\n' +
      '• Progres jawaban ronde ini direset\n' +
      '• Skor R1/R2/R3 yang sudah tersimpan tetap aman\n\n' +
      'Setelah ini tekan "Buka Ronde" saat semua siap.'
    )) return;
  }

  const buttons = document.querySelectorAll('.btn-round, #btn-game-open, #btn-game-close');
  buttons.forEach(b => b.disabled = true);
  try {
    await replaceQuestionsWithSeed(round);
    await resetPlayersForNewRound(round);
    await db.collection(COLLECTION_META).doc('game').set({
      activeRound: round,
      status: 'closed',
      session: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    state.activeRound = round;
    state.gameOpen = false;
    updateRoundUI();
    alert('Ronde ' + round + ' dipilih.\n' + seed.length + ' soal unik dimuat.\n\nLangkah berikutnya: tekan "Buka Ronde (mulai serentak)".');
  } catch (err) {
    console.error(err);
    alert('Gagal pilih ronde: ' + err.message);
  } finally {
    buttons.forEach(b => b.disabled = false);
  }
}

/** Tutup ronde: kunci skor ronde aktif ke roundScores semua peserta, total dihitung ulang */
async function closeRoundAndSaveScores() {
  if (!db) { alert('Firebase tidak aktif.'); return; }
  const round = state.activeRound || 1;
  if (!confirm(
    'Tutup Ronde ' + round + ' dan simpan skor?\n\n' +
    '• Soal ditutup (peserta tidak bisa lanjut)\n' +
    '• Skor ronde ' + round + ' dikunci ke total\n' +
    '• Siap pilih ronde berikutnya'
  )) return;

  const btn = document.getElementById('btn-game-close');
  if (btn) btn.disabled = true;
  try {
    const snap = await db.collection(COLLECTION_PLAYERS).get();
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 200) {
      const batch = db.batch();
      docs.slice(i, i + 200).forEach(doc => {
        const d = doc.data() || {};
        const rs = { 1: 0, 2: 0, 3: 0, ...(d.roundScores || {}) };
        // Kunci skor ronde ini dari field score (progres ronde berjalan)
        const current = Number(d.score) || 0;
        // Jangan timpa skor ronde yang lebih tinggi jika sudah pernah dikunci lebih besar? Ambil max dengan current
        const prevLocked = Number(rs[round]) || Number(rs[String(round)]) || 0;
        const locked = Math.max(prevLocked, current);
        rs[round] = locked;
        rs[String(round)] = locked;
        const total = [1, 2, 3].reduce((s, k) => s + (Number(rs[k]) || Number(rs[String(k)]) || 0), 0);
        batch.update(doc.ref, {
          roundScores: rs,
          totalScore: total,
          finished: true,
          playing: false,
          currentQuestionId: null,
          lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
    }

    await db.collection(COLLECTION_META).doc('game').set({
      status: 'closed',
      session: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      lastClosedRound: round,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    state.gameOpen = false;
    updateRoundUI();
    alert('Ronde ' + round + ' ditutup. Skor tersimpan.\n\n' +
      (round < 3
        ? 'Lanjut: tekan "Pilih Ronde ' + (round + 1) + '", lalu Buka Ronde.'
        : 'Ketiga ronde selesai. Cek tab Peserta untuk juara berdasarkan Total R1+R2+R3.'));
  } catch (err) {
    console.error(err);
    alert('Gagal tutup ronde: ' + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}


async function setGameStatus(open) {
  if (!db) { alert('Firebase tidak aktif.'); return; }
  const btnOpen = document.getElementById('btn-game-open');
  const btnClose = document.getElementById('btn-game-close');
  if (btnOpen) btnOpen.disabled = true;
  if (btnClose) btnClose.disabled = true;

  // Optimistic UI: status berubah langsung di admin, tidak menunggu Firestore
  const prevOpen = state.gameOpen;
  state.gameOpen = !!open;
  updateAdminGateUI();
  updateRoundUI();

  try {
    const sessionId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    // Tulis status dulu tanpa serverTimestamp agar snapshot peserta lebih cepat
    await db.collection(COLLECTION_META).doc('game').set({
      status: open ? 'open' : 'closed',
      session: sessionId,
      activeRound: state.activeRound || 1,
      updatedAt: Date.now()
    }, { merge: true });
    // updatedAt server di background (tidak memblokir)
    db.collection(COLLECTION_META).doc('game').set({
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => {});
  } catch (err) {
    console.error(err);
    state.gameOpen = prevOpen;
    updateAdminGateUI();
    updateRoundUI();
    alert('Gagal mengubah status soal: ' + err.message +
      '\n\nCek Firestore Rules: pastikan collection "meta" boleh di-write dari web.');
  } finally {
    if (btnOpen) btnOpen.disabled = false;
    if (btnClose) btnClose.disabled = false;
  }
}

async function setEntryStatus(open) {
  if (!db) { alert('Firebase tidak aktif.'); return; }
  const prev = state.entryOpen;
  state.entryOpen = !!open;
  updateEntryUI();
  try {
    const sessionId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    await db.collection(COLLECTION_META).doc('game').set({
      entryStatus: open ? 'open' : 'closed',
      entrySession: sessionId,
      updatedAt: Date.now()
    }, { merge: true });
    db.collection(COLLECTION_META).doc('game').set({
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => {});
  } catch (err) {
    console.error(err);
    state.entryOpen = prev;
    updateEntryUI();
    alert('Gagal mengubah status pintu masuk: ' + err.message +
      '\n\nCek Firestore Rules untuk collection "meta".');
  }
}

document.getElementById('btn-game-open')?.addEventListener('click', () => {
  setGameStatus(true).then(() => updateRoundUI());
});
document.getElementById('btn-game-close')?.addEventListener('click', () => {
  closeRoundAndSaveScores();
});
document.getElementById('btn-entry-open')?.addEventListener('click', () => {
  setEntryStatus(true);
});
document.getElementById('btn-entry-close')?.addEventListener('click', () => {
  if (confirm('Tutup pintu masuk? Peserta baru yang belum masuk akan menunggu di lobi.')) setEntryStatus(false);
});
document.querySelectorAll('.btn-round').forEach(btn => {
  btn.addEventListener('click', () => activateRound(btn.dataset.round));
});

// ========== QUESTIONS LISTENER ==========
function listenQuestions() {
  if (!db) return;
  if (state.unsubscribeQuestions) state.unsubscribeQuestions();
  state.unsubscribeQuestions = db.collection(COLLECTION_QUESTIONS)
    .onSnapshot((snapshot) => {
      const qs = [];
      snapshot.forEach(doc => qs.push({ id: doc.id, ...doc.data() }));
      state.allQuestions = qs;
      state.questionsLoaded = true;
      const qtotalEl = document.getElementById('admin-qtotal');
      if (qtotalEl) qtotalEl.textContent = qs.length;
      if (state.isAdmin && document.getElementById('tab-questions')?.classList.contains('active')) {
        renderQuestionAdminList();
      }
      if (state.isAdmin && document.getElementById('tab-progress')?.classList.contains('active')) {
        renderProgressMatrix();
      }
    }, (err) => console.warn('Gagal listen questions:', err));
}

// ========== PLAYERS / PROGRESS ==========
function startAdminPlayersListener() {
  if (!db) return;
  if (state.unsubscribeAdminPlayers) {
    state.unsubscribeAdminPlayers();
    state.unsubscribeAdminPlayers = null;
  }
  state.unsubscribeAdminPlayers = db.collection(COLLECTION_PLAYERS)
    .onSnapshot((snapshot) => {
      const players = [];
      snapshot.forEach(doc => players.push({ id: doc.id, ...doc.data() }));
      state._adminPlayersCache = players;

      document.getElementById('admin-total').textContent = players.length;
      document.getElementById('admin-finished').textContent = players.filter(p => p.finished).length;
      const avgBase = players.map(p => Number(p.totalScore) || sumRoundScores(p) || (p.score || 0));
      document.getElementById('admin-avg').textContent = players.length
        ? Math.round(avgBase.reduce((s, v) => s + v, 0) / players.length)
        : 0;

      const tbody = document.querySelector('#admin-table tbody');
      if (tbody) {
        tbody.innerHTML = '';
        players.sort((a, b) => {
          const ta = Number(a.totalScore) || sumRoundScores(a) || 0;
          const tb = Number(b.totalScore) || sumRoundScores(b) || 0;
          if (tb !== ta) return tb - ta;
          return (b.score || 0) - (a.score || 0);
        }).forEach((p, i) => {
          const tr = document.createElement('tr');
          const answered = Array.isArray(p.answeredIds) ? p.answeredIds.length : (p.totalAnswered || 0);
          const status = p.finished
            ? '✅ Selesai'
            : (p.playing ? '🎮 Mengerjakan' : (answered > 0 ? '📋 Dashboard' : '⏳ Siap'));
          const rs = p.roundScores || {};
          const r1 = Number(rs[1] ?? rs['1']) || 0;
          const r2 = Number(rs[2] ?? rs['2']) || 0;
          const r3 = Number(rs[3] ?? rs['3']) || 0;
          const total = Number(p.totalScore) || (r1 + r2 + r3);
          const medal = i === 0 ? ' 🥇' : (i === 1 ? ' 🥈' : (i === 2 ? ' 🥉' : ''));
          tr.innerHTML = `
            <td>${i + 1}${medal}</td>
            <td>${escapeHtml(p.nama)}</td>
            <td>${escapeHtml(p.prodi)}</td>
            <td>${r1}</td>
            <td>${r2}</td>
            <td>${r3}</td>
            <td><b>${total}</b></td>
            <td>${p.score || 0}</td>
            <td>${status}</td>
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

document.getElementById('btn-refresh-admin')?.addEventListener('click', () => {
  // Snapshot real-time sudah aktif; tombol ini hanya konfirmasi visual
  const n = (state._adminPlayersCache || []).length;
  alert('Data real-time aktif. Saat ini ' + n + ' peserta terpantau.');
});

document.getElementById('btn-reset-all')?.addEventListener('click', async () => {
  if (!db) return;
  if (!confirm('Hapus SEMUA data peserta? Tindakan ini tidak bisa dibatalkan.')) return;
  if (!confirm('Yakin sekali lagi? Semua skor dan progres akan hilang.')) return;
  const snap = await db.collection(COLLECTION_PLAYERS).get();
  const batch = db.batch();
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  alert('Semua peserta dihapus.');
});

// ========== QUESTION CRUD ==========
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
  qs.forEach((q) => {
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
    if (!q) return;
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
  if (!db) { alert('Firebase tidak aktif.'); return; }

  const id = document.getElementById('qf-id').value;
  const type = document.getElementById('qf-type').value;
  const category = document.getElementById('qf-category').value.trim();
  const question = document.getElementById('qf-question').value.trim();
  const explanation = document.getElementById('qf-explanation').value.trim();
  const timeLimit = parseInt(document.getElementById('qf-timelimit').value, 10) || state.defaultTimeLimit;
  const rumpun = document.getElementById('qf-rumpun').value || 'umum';
  const points = parseInt(document.getElementById('qf-points').value, 10) || 10;

  const data = {
    type,
    category,
    question,
    explanation,
    timeLimit,
    rumpun,
    points,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (type === 'quiz') {
    data.options = [0, 1, 2, 3].map(i => document.getElementById('qf-opt-' + i).value.trim());
    const checked = document.querySelector('input[name="qf-correct"]:checked');
    data.answer = checked ? parseInt(checked.value, 10) : 0;
  } else {
    const raw = document.getElementById('qf-answer-text').value.trim();
    data.answer = raw.split(',').map(s => s.trim()).filter(Boolean);
    data.hint = document.getElementById('qf-hint').value.trim();
  }

  try {
    if (id) {
      await db.collection(COLLECTION_QUESTIONS).doc(id).update(data);
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection(COLLECTION_QUESTIONS).add(data);
    }
    document.getElementById('question-modal').classList.add('hidden');
  } catch (err) {
    alert('Gagal menyimpan soal: ' + err.message);
  }
});

document.getElementById('btn-seed-questions')?.addEventListener('click', async () => {
  if (!db) return;
  const round = state.activeRound || 1;
  const seed = getSeedForRound(round);
  if (!seed.length) { alert('Seed ronde ' + round + ' tidak tersedia.'); return; }
  if (!confirm('Tambahkan ' + seed.length + ' soal seed Ronde ' + round + '? Soal lama tidak dihapus.')) return;
  try {
    const batch = db.batch();
    seed.forEach((q) => {
      const ref = db.collection(COLLECTION_QUESTIONS).doc();
      batch.set(ref, {
        ...q,
        seedRound: round,
        timeLimit: q.timeLimit || state.defaultTimeLimit,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    alert('Seed Ronde ' + round + ' ditambahkan.');
  } catch (err) {
    alert('Gagal seed: ' + err.message);
  }
});

document.getElementById('btn-replace-questions')?.addEventListener('click', async () => {
  if (!db) return;
  const round = state.activeRound || 1;
  if (!confirm('HAPUS semua soal dan ganti dengan seed Ronde ' + round + '?')) return;
  try {
    const n = await replaceQuestionsWithSeed(round);
    alert('Semua soal diganti dengan seed Ronde ' + round + ' (' + n + ' soal).');
  } catch (err) {
    alert('Gagal ganti soal: ' + err.message);
  }
});

// ========== LOGIN / TABS ==========
function enterAdminDashboard() {
  state.isAdmin = true;
  document.getElementById('admin-login-box').classList.add('hidden');
  document.getElementById('admin-dashboard').classList.remove('hidden');
  startAdminPlayersListener();
  renderQuestionAdminList();
  listenGameStatus();
  listenQuestions();
}

document.getElementById('btn-admin-login')?.addEventListener('click', () => {
  const pass = document.getElementById('admin-pass').value;
  if (pass === ADMIN_PASSWORD) {
    enterAdminDashboard();
  } else {
    alert('Password salah.');
  }
});

document.getElementById('admin-pass')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-admin-login')?.click();
});

document.getElementById('btn-logout-admin')?.addEventListener('click', () => {
  state.isAdmin = false;
  if (state.unsubscribeAdminPlayers) {
    state.unsubscribeAdminPlayers();
    state.unsubscribeAdminPlayers = null;
  }
  document.getElementById('admin-dashboard').classList.add('hidden');
  document.getElementById('admin-login-box').classList.remove('hidden');
  document.getElementById('admin-pass').value = '';
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
  });
});

// ========== BOOT ==========
window.addEventListener('load', () => {
  const ok = initFirebase();
  if (!ok) {
    const box = document.getElementById('admin-login-box');
    if (box) {
      const p = document.createElement('p');
      p.style.cssText = 'color:#ff6b35;margin-top:0.8rem;font-size:0.9rem;';
      p.textContent = '⚠️ Firebase tidak aktif. Periksa konfigurasi.';
      box.appendChild(p);
    }
    return;
  }
  // Pre-listen status agar UI status akurat setelah login
  listenGameStatus();
  listenQuestions();
});
