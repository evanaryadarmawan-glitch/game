// Soal Mahadipa 2026 — 3 paket seed (Ronde 1, 2, 3)
// Admin memilih ronde → soal diganti sesuai paket, skor tiap ronde dijumlahkan untuk peringkat akhir.
//
// rumpun "umum" = semua prodi
// points: mudah 10, sedang 15 (+ bonus kecepatan di app)

const PTS = { mudah: 10, sedang: 15 };

function mc(level, category, question, options, answer, explanation, timeLimit) {
  return { type: "quiz", rumpun: "umum", level, points: PTS[level], category, question, options, answer, explanation, timeLimit };
}
function fill(level, category, question, answer, hint, explanation, timeLimit) {
  return { type: "puzzle", rumpun: "umum", level, points: PTS[level], category, question, answer, hint, explanation, timeLimit };
}

// ========== RONDE 1 — Wawasan kampus, STEKOM, literasi dasar ==========
const SEED_ROUND_1 = [
  mc("mudah", "STEKOM Knowledge", "Apa kepanjangan dari STEKOM?",
    ["Sekolah Tinggi Elektronika dan Komputer", "Universitas Sains dan Teknologi Komputer", "Sekolah Tinggi Ekonomi Komputer", "Sistem Teknologi Komputer Modern"],
    1, "STEKOM adalah Universitas Sains dan Teknologi Komputer.", 30),
  mc("mudah", "STEKOM Knowledge", "Kampus pusat Universitas STEKOM berada di kota mana?",
    ["Jakarta", "Yogyakarta", "Semarang", "Surabaya"],
    2, "Kampus pusat STEKOM di Semarang, Jawa Tengah.", 30),
  mc("mudah", "Mahadipa", "Mahadipa 2026 merujuk pada apa?",
    ["Nama aplikasi kampus", "Angkatan mahasiswa baru tahun 2026", "Nama gedung baru STEKOM", "Program beasiswa khusus"],
    1, "Mahadipa 2026 adalah sebutan angkatan mahasiswa STEKOM tahun 2026.", 30),
  mc("mudah", "Kewirausahaan", "Technopreneurship berarti...",
    ["Hanya fokus belajar teori", "Menggabungkan teknologi dengan jiwa kewirausahaan", "Menjadi programmer saja", "Menghindari bisnis"],
    1, "Technopreneurship = teknologi + jiwa wirausaha.", 30),
  mc("mudah", "Nilai Kampus", "Yang TIDAK termasuk sikap yang diharapkan dari mahasiswa adalah...",
    ["Integritas dan jujur", "Inovatif dan adaptif", "Menyontek demi nilai tinggi", "Siap berkolaborasi"],
    2, "Menyontek bertentangan dengan integritas akademik.", 30),
  mc("mudah", "IT Dasar", "Perangkat lunak yang mengoperasikan komputer disebut...",
    ["Browser", "Sistem operasi", "Spreadsheet", "Printer"],
    1, "Sistem operasi (OS) mengelola hardware dan software.", 30),
  mc("mudah", "IT Dasar", "Singkatan CPU adalah...",
    ["Central Processing Unit", "Computer Personal Utility", "Central Program Upload", "Core Power Unit"],
    0, "CPU = Central Processing Unit, otak pemrosesan komputer.", 30),
  mc("mudah", "Soft Skill", "Komunikasi yang baik di kampus berarti...",
    ["Hanya bicara saat diminta dosen", "Menyampaikan ide dengan jelas dan menghargai pendapat orang lain", "Selalu setuju agar tidak ribut", "Menghindari diskusi kelompok"],
    1, "Komunikasi efektif = jelas + menghargai lawan bicara.", 30),
  mc("mudah", "Logika", "Jika semua mahasiswa STEKOM punya NIM, dan Budi mahasiswa STEKOM, maka...",
    ["Budi belum tentu punya NIM", "Budi pasti punya NIM", "Hanya Budi yang punya NIM", "NIM tidak berhubungan dengan mahasiswa"],
    1, "Kesimpulan logis dari premis universal.", 30),
  mc("mudah", "Hitungan Mahasiswa", "Jika 1 SKS setara 50 menit tatap muka, berapa menit untuk 3 SKS?",
    ["100", "120", "150", "180"],
    2, "3 × 50 = 150 menit.", 30),
  mc("sedang", "Literasi Digital", "Password yang lebih aman adalah...",
    ["nama + tanggal lahir", "kata yang sama di semua akun", "kombinasi huruf, angka, simbol yang panjang", "password kosong"],
    2, "Password kuat: panjang dan beragam karakter.", 30),
  mc("sedang", "Literasi Digital",
    "Pesan: \"SIAKAD akan ditutup. Klik tautan ini dan masukkan password.\" Langkah tepat:",
    ["Segera klik dan isi password", "Teruskan ke grup angkatan", "Abaikan tautan, cek lewat situs resmi kampus", "Balas dan tanya apakah benar"],
    2, "Ciri phishing: mendesak + minta password. Verifikasi lewat kanal resmi.", 45),
  mc("mudah", "Bahasa Indonesia", "Penulisan kata baku yang benar adalah...",
    ["Apotik", "Apotek", "Apoteck", "Apotec"],
    1, "Bentuk baku KBBI: apotek.", 30),
  mc("mudah", "Bahasa Inggris", "Dalam tugas kuliah, deadline berarti...",
    ["Daftar nilai", "Batas waktu pengumpulan", "Nama dosen pengampu", "Ruangan ujian"],
    1, "Deadline = batas waktu pengumpulan.", 30),
  mc("mudah", "Wawasan Umum", "Sumpah Pemuda diikrarkan pada tanggal...",
    ["17 Agustus 1945", "28 Oktober 1928", "20 Mei 1908", "1 Juni 1945"],
    1, "Sumpah Pemuda: 28 Oktober 1928.", 30),
  fill("mudah", "Teka-teki", "Kepanjangan dari HTML dalam dunia web adalah...",
    ["HYPERTEXT MARKUP LANGUAGE", "HyperText Markup Language", "hypertext markup language"],
    "Bahasa penanda halaman web", "HTML = HyperText Markup Language.", 40),
  fill("sedang", "Hitungan Mahasiswa", "Rata-rata dari 70, 80, dan 90 adalah...",
    ["80", "80.0"], "Jumlah dibagi banyak data", "(70+80+90)/3 = 80.", 40),
];

// ========== RONDE 2 — Kuliah, mahasiswa, kehidupan kampus ==========
const SEED_ROUND_2 = [
  mc("mudah", "Kuliah", "Yang paling tepat dilakukan sebelum masuk kelas adalah...",
    ["Tidur di kursi belakang", "Menyiapkan alat tulis dan membaca materi sekilas", "Memainkan game sampai dosen datang", "Meninggalkan kelas lebih awal"],
    1, "Persiapan singkat membantu fokus saat kuliah.", 30),
  mc("mudah", "Mahasiswa", "IPS (Indeks Prestasi Semester) menggambarkan...",
    ["Jumlah organisasi yang diikuti", "Rata-rata nilai tertimbang pada satu semester", "Jumlah teman sekelas", "Nilai satu mata kuliah saja"],
    1, "IPS = rata-rata nilai tertimbang per semester.", 30),
  mc("mudah", "Pembelajaran", "Belajar aktif (active learning) menekankan...",
    ["Hanya mendengarkan ceramah", "Mahasiswa ikut berpikir, bertanya, dan praktik", "Menyalin catatan teman tanpa memahami", "Menghafal tanpa konteks"],
    1, "Active learning melibatkan partisipasi dan pemahaman.", 30),
  mc("mudah", "Kuliah", "Absensi kuliah penting karena...",
    ["Hanya formalitas tanpa dampak", "Berkaitan dengan kehadiran minimal dan disiplin akademik", "Bisa diganti main game", "Tidak pernah dicek dosen"],
    1, "Kehadiran adalah bagian dari aturan akademik.", 30),
  mc("sedang", "Mahasiswa", "Jika bentrok jadwal organisasi dan ujian, prioritas utama biasanya...",
    ["Organisasi selalu diutamakan", "Ujian/akademik tetap diprioritaskan, organisasi diatur ulang", "Bolos keduanya", "Menyerahkan keputusan ke orang lain saja"],
    1, "Kewajiban akademik tetap prioritas; organisasi bisa dijadwalkan ulang.", 40),
  mc("mudah", "Soft Skill", "Kerja kelompok yang efektif ditandai dengan...",
    ["Satu orang mengerjakan semua", "Pembagian tugas jelas dan komunikasi rutin", "Tidak ada diskusi sama sekali", "Saling menyalahkan saat gagal"],
    1, "Tim efektif: peran jelas + komunikasi.", 30),
  mc("mudah", "Kuliah", "Silabus mata kuliah biasanya berisi...",
    ["Hanya daftar teman sekelas", "Tujuan, materi, penilaian, dan referensi kuliah", "Password WiFi kampus", "Jadwal libur nasional saja"],
    1, "Silabus memandu isi dan penilaian kuliah.", 30),
  mc("sedang", "Pembelajaran", "Teknik pomodoro dalam belajar adalah...",
    ["Belajar 25 menit fokus lalu istirahat singkat", "Belajar 8 jam tanpa berhenti", "Hanya belajar malam hari", "Mengganti tidur dengan kopi"],
    0, "Pomodoro: fokus singkat + istirahat agar konsisten.", 35),
  mc("mudah", "Mahasiswa", "Dosen pembimbing akademik (PA/DPA) berperan untuk...",
    ["Menggantikan seluruh tugas mahasiswa", "Membimbing rencana studi dan memberi saran akademik", "Menjadi teman bermain game", "Menghapus semua nilai jelek otomatis"],
    1, "PA membantu perencanaan dan konsultasi studi.", 30),
  mc("mudah", "Hitungan Mahasiswa", "Mahasiswa mengambil 18 SKS. Jika biaya per SKS Rp100.000, total biaya SKS adalah...",
    ["Rp1.000.000", "Rp1.800.000", "Rp18.000.000", "Rp800.000"],
    1, "18 × 100.000 = 1.800.000.", 35),
  fill("mudah", "Kuliah", "Singkatan SKS dalam sistem perkuliahan adalah...",
    ["SATUAN KREDIT SEMESTER", "Satuan Kredit Semester", "satuan kredit semester"],
    "Ukuran beban studi", "SKS = Satuan Kredit Semester.", 35),
  mc("sedang", "Literasi Digital", "Sumber referensi tugas yang lebih dapat dipercaya adalah...",
    ["Status media sosial tanpa sumber", "Jurnal ilmiah atau buku teks yang jelas penulisnya", "Komentar anonim di forum", "Pesan berantai WhatsApp"],
    1, "Utamakan sumber yang bisa diverifikasi.", 35),
  mc("mudah", "Soft Skill", "Memberi dan menerima umpan balik (feedback) dengan baik membantu...",
    ["Menjaga ego agar tidak berubah", "Memperbaiki kinerja dan hubungan kerja tim", "Menghindari perbaikan diri", "Menutup diskusi"],
    1, "Feedback konstruktif mendorong perbaikan.", 30),
];

// ========== RONDE 3 — Pembelajaran umum, logika, etika akademik ==========
const SEED_ROUND_3 = [
  mc("mudah", "Pembelajaran", "Cara belajar yang umumnya lebih tahan lama diingat adalah...",
    ["Hanya membaca sekali malam sebelum ujian", "Mengulang, menjelaskan ulang, dan berlatih soal", "Menyontek catatan teman saat ujian", "Tidur sepanjang hari tanpa review"],
    1, "Spaced repetition + praktik memperkuat ingatan.", 30),
  mc("mudah", "Etika Akademik", "Plagiarisme adalah...",
    ["Mengutip dengan mencantumkan sumber", "Menyalin karya orang lain seolah milik sendiri", "Diskusi kelompok yang sah", "Meminjam buku di perpustakaan"],
    1, "Plagiarisme = mengambil karya tanpa pengakuan sumber.", 30),
  mc("mudah", "Pembelajaran", "Mind map berguna untuk...",
    ["Mengganti seluruh ujian", "Memvisualkan hubungan antar konsep agar mudah diingat", "Menghapus catatan kuliah", "Membuat password WiFi"],
    1, "Mind map membantu struktur dan hapalan bermakna.", 30),
  mc("sedang", "Logika", "Semua A adalah B. Beberapa B adalah C. Kesimpulan yang PASTI benar:",
    ["Semua A adalah C", "Beberapa A pasti C", "Tidak ada kesimpulan pasti bahwa A adalah C", "Tidak ada B yang C"],
    2, "Dari premis itu, A belum tentu berhubungan dengan C.", 45),
  mc("mudah", "Mahasiswa", "Manajemen waktu kuliah yang baik biasanya dimulai dengan...",
    ["Mengerjakan yang paling mudah saja terus-menerus", "Mencatat deadline dan membagi tugas menjadi langkah kecil", "Menunggu motivasi datang baru mulai", "Mengabaikan kalender akademik"],
    1, "Catat tenggat + pecah tugas = lebih terkendali.", 30),
  mc("mudah", "Soft Skill", "Berpikir kritis berarti...",
    ["Menerima semua informasi tanpa cek", "Menilai argumen berdasarkan bukti dan logika", "Menolak semua pendapat dosen", "Menghafal tanpa bertanya"],
    1, "Critical thinking = evaluasi berbasis bukti.", 30),
  mc("sedang", "Pembelajaran", "Metakognisi dalam belajar adalah...",
    ["Menghafal definisi saja", "Kesadaran dan pengaturan cara belajar diri sendiri", "Menyalin PR teman", "Tidur di kelas"],
    1, "Metakognisi = tahu bagaimana cara belajarmu sendiri.", 40),
  mc("mudah", "Kuliah", "Presentasi di kelas sebaiknya...",
    ["Membaca slide kata per kata tanpa kontak mata", "Menjelaskan poin utama dengan jelas dan berinteraksi dengan audiens", "Berbicara secepat mungkin agar cepat selesai", "Mengabaikan pertanyaan audiens"],
    1, "Presentasi efektif: jelas, ringkas, interaktif.", 30),
  mc("mudah", "Hitungan Mahasiswa", "Dari 40 soal, benar 30. Persentase benar adalah...",
    ["30%", "65%", "75%", "80%"],
    2, "30/40 × 100% = 75%.", 30),
  mc("mudah", "Wawasan Umum", "Perpustakaan kampus paling tepat dimanfaatkan untuk...",
    ["Hanya foto di media sosial", "Mencari referensi dan tempat belajar yang kondusif", "Tempat tidur siang saja", "Menyimpan motor"],
    1, "Fungsi utama: literasi dan ruang belajar.", 30),
  fill("mudah", "Pembelajaran", "Kepanjangan dari KRS dalam administrasi kuliah biasanya adalah...",
    ["KARTU RENCANA STUDI", "Kartu Rencana Studi", "kartu rencana studi"],
    "Dokumen rencana mata kuliah", "KRS = Kartu Rencana Studi.", 35),
  mc("sedang", "Etika Akademik", "Jika menemukan teman menyontek saat ujian, sikap yang lebih tepat secara akademik adalah...",
    ["Ikut menyontek agar adil", "Menjaga integritas diri dan mengikuti aturan ujian yang berlaku", "Menyebarkan foto di media sosial saat ujian berlangsung", "Mengancam teman tersebut di tempat"],
    1, "Jaga integritas sendiri; laporkan lewat jalur resmi bila perlu.", 40),
  mc("mudah", "Soft Skill", "Growth mindset percaya bahwa kemampuan...",
    ["Sudah tetap sejak lahir dan tidak bisa diubah", "Dapat berkembang melalui usaha dan latihan", "Hanya milik orang jenius", "Tidak berhubungan dengan belajar"],
    1, "Growth mindset: kemampuan bisa tumbuh dengan latihan.", 30),
];

const SEED_ROUNDS = {
  1: SEED_ROUND_1,
  2: SEED_ROUND_2,
  3: SEED_ROUND_3
};

// Kompatibilitas: SEED_QUESTIONS = gabungan / default ronde 1
const SEED_QUESTIONS = SEED_ROUND_1;

function getSeedRound(n) {
  const r = Number(n) || 1;
  return SEED_ROUNDS[r] || SEED_ROUND_1;
}
