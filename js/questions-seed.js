// Soal Mahadipa 2026 — 3 paket seed (Ronde 1, 2, 3) — versi sedikit lebih sulit
// Admin memilih ronde → soal diganti sesuai paket, skor tiap ronde dijumlahkan untuk peringkat akhir.
//
// rumpun "umum" = semua prodi
// points: mudah 10, sedang 15, sulit 20 (+ bonus kecepatan di app)

const PTS = { mudah: 10, sedang: 15, sulit: 20 };

function mc(level, category, question, options, answer, explanation, timeLimit) {
  return { type: "quiz", rumpun: "umum", level, points: PTS[level] || 10, category, question, options, answer, explanation, timeLimit };
}
function fill(level, category, question, answer, hint, explanation, timeLimit) {
  return { type: "puzzle", rumpun: "umum", level, points: PTS[level] || 10, category, question, answer, hint, explanation, timeLimit };
}

// ========== RONDE 1 — Wawasan kampus, STEKOM, literasi dasar ==========
const SEED_ROUND_1 = [
  mc("sedang", "Stekom Knowledge", "Kepanjangan resmi Stekom yang benar adalah...",
    ["Sekolah Tinggi Elektronika dan Komputer", "Universitas Sains dan Teknologi Komputer", "Sekolah Tinggi Ekonomi Komputer", "Sistem Teknologi Komputer Modern"],
    1, "Stekom adalah Universitas Sains dan Teknologi Komputer.", 25),
  mc("mudah", "Stekom Knowledge", "Kampus pusat Universitas Stekom berada di kota mana?",
    ["Jakarta", "Yogyakarta", "Semarang", "Surabaya"],
    2, "Kampus pusat Stekom di Semarang, Jawa Tengah.", 25),
  mc("sedang", "Mahadipa", "Mahadipa 2026 paling tepat merujuk pada...",
    ["Nama aplikasi SIAKAD kampus", "Angkatan mahasiswa baru tahun 2026", "Nama gedung rektorat baru", "Program beasiswa khusus S1"],
    1, "Mahadipa 2026 adalah sebutan angkatan mahasiswa Stekom tahun 2026.", 25),
  mc("sedang", "Kewirausahaan", "Technopreneurship paling tepat digambarkan sebagai...",
    ["Fokus hanya pada teori pemrograman", "Menggabungkan teknologi dengan jiwa kewirausahaan", "Menjadi programmer full-time saja", "Menghindari risiko bisnis sama sekali"],
    1, "Technopreneurship = teknologi + jiwa wirausaha.", 30),
  mc("sedang", "Nilai Kampus", "Sikap yang BERTENTANGAN dengan integritas akademik adalah...",
    ["Mengutip sumber dengan benar", "Berdiskusi kelompok secara jujur", "Menyontek demi nilai tinggi", "Melaporkan kesalahan data dengan transparan"],
    2, "Menyontek bertentangan dengan integritas akademik.", 25),
  mc("sedang", "IT Dasar", "Komponen yang secara spesifik disebut 'otak' pemrosesan instruksi komputer adalah...",
    ["RAM", "CPU (Central Processing Unit)", "SSD", "GPU saja"],
    1, "CPU = Central Processing Unit, unit pemrosesan pusat.", 25),
  mc("sedang", "IT Dasar", "Yang bukan fungsi utama sistem operasi adalah...",
    ["Mengelola memori dan proses", "Menyediakan antarmuka ke perangkat keras", "Menjalankan aplikasi pengguna", "Mengganti seluruh hardware secara fisik"],
    3, "OS mengelola resource & software, bukan mengganti hardware fisik.", 30),
  mc("sedang", "Soft Skill", "Komunikasi efektif di lingkungan kampus menekankan...",
    ["Hanya bicara saat diminta dosen", "Menyampaikan ide jelas sambil menghargai pendapat orang lain", "Selalu setuju agar tidak ada konflik", "Menghindari diskusi kelompok"],
    1, "Komunikasi efektif = jelas + menghargai lawan bicara.", 25),
  mc("sedang", "Logika", "Premis: Semua mahasiswa Stekom punya NIM. Budi adalah mahasiswa Stekom. Kesimpulan yang valid:",
    ["Budi belum tentu punya NIM", "Budi pasti punya NIM", "Hanya Budi yang punya NIM", "NIM tidak berhubungan dengan status mahasiswa"],
    1, "Dari premis universal, kesimpulan khusus mengikuti.", 30),
  mc("sedang", "Hitungan Mahasiswa", "Jika 1 SKS setara 50 menit tatap muka, berapa total menit untuk mata kuliah 4 SKS?",
    ["150", "180", "200", "250"],
    2, "4 × 50 = 200 menit.", 25),
  mc("sedang", "Literasi Digital", "Ciri password yang lebih aman di antara opsi berikut:",
    ["nama + tanggal lahir", "kata yang sama di semua akun", "kombinasi huruf, angka, simbol yang panjang & unik", "password kosong / default"],
    2, "Password kuat: panjang, beragam, dan unik per akun.", 30),
  mc("sulit", "Literasi Digital",
    "Pesan: \"SIAKAD akan ditutup dalam 1 jam. Klik tautan ini dan masukkan password.\" Respons paling tepat:",
    ["Segera klik dan isi password agar tidak ketinggalan", "Teruskan ke grup angkatan agar semua tahu", "Abaikan tautan, verifikasi lewat situs/kanal resmi kampus", "Balas pesan dan tanya apakah pengirim benar admin"],
    2, "Ciri phishing: mendesak + minta kredensial. Verifikasi lewat kanal resmi.", 40),
  mc("sedang", "Bahasa Indonesia", "Penulisan baku yang benar menurut KBBI adalah...",
    ["Apotik", "Apotek", "Apoteck", "Apotec"],
    1, "Bentuk baku: apotek.", 20),
  mc("sedang", "Bahasa Inggris", "Dalam konteks tugas kuliah, 'deadline' berarti...",
    ["Daftar nilai akhir", "Batas waktu pengumpulan", "Nama dosen pengampu", "Ruangan ujian"],
    1, "Deadline = batas waktu pengumpulan.", 20),
  mc("sedang", "Wawasan Umum", "Sumpah Pemuda diikrarkan pada...",
    ["17 Agustus 1945", "28 Oktober 1928", "20 Mei 1908", "1 Juni 1945"],
    1, "Sumpah Pemuda: 28 Oktober 1928.", 25),
  fill("sedang", "Teka-teki", "Kepanjangan HTML dalam dunia web adalah...",
    ["HYPERTEXT MARKUP LANGUAGE", "HyperText Markup Language", "hypertext markup language"],
    "Bahasa penanda halaman web", "HTML = HyperText Markup Language.", 35),
  fill("sedang", "Hitungan Mahasiswa", "Rata-rata dari 65, 80, dan 95 adalah...",
    ["80", "80.0"], "Jumlah dibagi banyak data", "(65+80+95)/3 = 80.", 35),
  mc("sulit", "Logika", "Jika semua A adalah B, dan beberapa B adalah C, maka kesimpulan yang pasti benar:",
    ["Semua A adalah C", "Beberapa A pasti C", "Tidak ada kesimpulan pasti bahwa A adalah C", "Tidak ada B yang C"],
    2, "Dari premis itu hubungan A dengan C belum tentu.", 40),
];

// ========== RONDE 2 — Kuliah, mahasiswa, kehidupan kampus ==========
const SEED_ROUND_2 = [
  mc("sedang", "Kuliah", "Persiapan paling tepat sebelum masuk kelas adalah...",
    ["Tidur di kursi belakang sampai dosen datang", "Menyiapkan alat tulis dan membaca materi sekilas", "Memainkan game sampai kuliah dimulai", "Merencanakan meninggalkan kelas lebih awal"],
    1, "Persiapan singkat membantu fokus saat kuliah.", 25),
  mc("sedang", "Mahasiswa", "IPS (Indeks Prestasi Semester) menggambarkan...",
    ["Jumlah organisasi yang diikuti", "Rata-rata nilai tertimbang pada satu semester", "Jumlah teman sekelas", "Nilai satu mata kuliah saja"],
    1, "IPS = rata-rata nilai tertimbang per semester.", 25),
  mc("sedang", "Pembelajaran", "Active learning menekankan bahwa mahasiswa...",
    ["Hanya mendengarkan ceramah dosen", "Ikut berpikir, bertanya, dan praktik", "Menyalin catatan teman tanpa memahami", "Menghafal definisi tanpa konteks"],
    1, "Active learning melibatkan partisipasi dan pemahaman.", 25),
  mc("sedang", "Kuliah", "Absensi kuliah penting terutama karena...",
    ["Hanya formalitas tanpa dampak akademik", "Berkaitan dengan kehadiran minimal dan disiplin akademik", "Bisa diganti aktivitas game di kelas", "Tidak pernah menjadi pertimbangan dosen"],
    1, "Kehadiran adalah bagian dari aturan akademik.", 25),
  mc("sulit", "Mahasiswa", "Jika bentrok jadwal organisasi penting dan ujian akhir, prioritas yang lebih tepat secara akademik:",
    ["Organisasi selalu diutamakan", "Ujian/akademik tetap diprioritaskan; organisasi diatur ulang", "Bolos keduanya agar 'adil'", "Menyerahkan keputusan sepenuhnya ke orang lain"],
    1, "Kewajiban akademik tetap prioritas; organisasi bisa dijadwalkan ulang.", 35),
  mc("sedang", "Soft Skill", "Kerja kelompok efektif biasanya ditandai dengan...",
    ["Satu orang mengerjakan hampir semua tugas", "Pembagian tugas jelas dan komunikasi rutin", "Tidak ada diskusi sama sekali", "Saling menyalahkan saat hasil kurang baik"],
    1, "Tim efektif: peran jelas + komunikasi.", 25),
  mc("sedang", "Kuliah", "Silabus mata kuliah biasanya berisi...",
    ["Hanya daftar nama teman sekelas", "Tujuan, materi, penilaian, dan referensi kuliah", "Password WiFi kampus", "Jadwal libur nasional saja"],
    1, "Silabus memandu isi dan penilaian kuliah.", 25),
  mc("sedang", "Pembelajaran", "Teknik Pomodoro dalam belajar adalah...",
    ["Belajar 25 menit fokus lalu istirahat singkat", "Belajar 8 jam tanpa berhenti", "Hanya belajar malam hari", "Mengganti tidur dengan kopi"],
    0, "Pomodoro: fokus singkat + istirahat agar konsisten.", 30),
  mc("sedang", "Mahasiswa", "Dosen Pembimbing Akademik (PA/DPA) berperan untuk...",
    ["Menggantikan seluruh tugas mahasiswa", "Membimbing rencana studi dan memberi saran akademik", "Menjadi teman bermain game", "Menghapus semua nilai jelek secara otomatis"],
    1, "PA membantu perencanaan dan konsultasi studi.", 25),
  mc("sedang", "Hitungan Mahasiswa", "Mahasiswa mengambil 20 SKS. Jika biaya per SKS Rp150.000, total biaya SKS adalah...",
    ["Rp1.500.000", "Rp3.000.000", "Rp2.000.000", "Rp15.000.000"],
    1, "20 × 150.000 = 3.000.000.", 30),
  fill("sedang", "Kuliah", "Singkatan SKS dalam sistem perkuliahan adalah...",
    ["SATUAN KREDIT SEMESTER", "Satuan Kredit Semester", "satuan kredit semester"],
    "Ukuran beban studi", "SKS = Satuan Kredit Semester.", 30),
  mc("sulit", "Literasi Digital", "Sumber referensi tugas yang PALING dapat dipercaya di antara opsi berikut:",
    ["Status media sosial tanpa sumber jelas", "Jurnal ilmiah atau buku teks dengan penulis & penerbit jelas", "Komentar anonim di forum", "Pesan berantai WhatsApp"],
    1, "Utamakan sumber yang bisa diverifikasi dan bereputasi.", 35),
  mc("sedang", "Soft Skill", "Memberi dan menerima feedback dengan baik terutama membantu...",
    ["Menjaga ego agar tidak berubah", "Memperbaiki kinerja dan hubungan kerja tim", "Menghindari perbaikan diri", "Menutup diskusi lebih cepat"],
    1, "Feedback konstruktif mendorong perbaikan.", 25),
  mc("sulit", "Logika", "Semua mahasiswa yang lulus harus memenuhi SKS minimum. Andi belum memenuhi SKS minimum. Kesimpulan yang valid:",
    ["Andi pasti sudah lulus", "Andi belum bisa dinyatakan lulus", "Andi pasti tidak akan pernah lulus", "SKS minimum tidak relevan"],
    1, "Modus tollens: jika P→Q dan ¬Q maka ¬P.", 40),
  mc("sedang", "Pembelajaran", "Spaced repetition (pengulangan berjarak) berguna karena...",
    ["Cukup sekali baca malam sebelum ujian", "Menguatkan ingatan jangka panjang dengan review terjadwal", "Menggantikan seluruh praktik soal", "Hanya cocok untuk hafalan angka"],
    1, "Review berjarak memperkuat retensi jangka panjang.", 30),
  fill("sedang", "Hitungan Mahasiswa", "Jika 15 dari 20 soal benar, persentase benar adalah...",
    ["75", "75%", "75.0"], "Benar dibagi total × 100", "15/20 × 100% = 75%.", 30),
];

// ========== RONDE 3 — Pembelajaran, logika, etika akademik ==========
const SEED_ROUND_3 = [
  mc("sedang", "Pembelajaran", "Cara belajar yang umumnya lebih tahan lama diingat adalah...",
    ["Hanya membaca sekali malam sebelum ujian", "Mengulang, menjelaskan ulang, dan berlatih soal", "Menyontek catatan teman saat ujian", "Tidur sepanjang hari tanpa review"],
    1, "Spaced repetition + praktik memperkuat ingatan.", 25),
  mc("sedang", "Etika Akademik", "Plagiarisme adalah...",
    ["Mengutip dengan mencantumkan sumber", "Menyalin karya orang lain seolah milik sendiri", "Diskusi kelompok yang sah", "Meminjam buku di perpustakaan"],
    1, "Plagiarisme = mengambil karya tanpa pengakuan sumber.", 25),
  mc("sedang", "Pembelajaran", "Mind map paling berguna untuk...",
    ["Mengganti seluruh ujian", "Memvisualkan hubungan antar konsep agar mudah diingat", "Menghapus catatan kuliah", "Membuat password WiFi"],
    1, "Mind map membantu struktur dan hapalan bermakna.", 25),
  mc("sulit", "Logika", "Semua A adalah B. Beberapa B adalah C. Kesimpulan yang pasti benar:",
    ["Semua A adalah C", "Beberapa A pasti C", "Tidak ada kesimpulan pasti bahwa A adalah C", "Tidak ada B yang C"],
    2, "Dari premis itu, A belum tentu berhubungan dengan C.", 40),
  mc("sedang", "Mahasiswa", "Manajemen waktu kuliah yang baik biasanya dimulai dengan...",
    ["Mengerjakan yang paling mudah saja terus-menerus", "Mencatat deadline dan membagi tugas menjadi langkah kecil", "Menunggu motivasi datang baru mulai", "Mengabaikan kalender akademik"],
    1, "Catat tenggat + pecah tugas = lebih terkendali.", 25),
  mc("sedang", "Soft Skill", "Berpikir kritis berarti...",
    ["Menerima semua informasi tanpa cek", "Menilai argumen berdasarkan bukti dan logika", "Menolak semua pendapat dosen", "Menghafal tanpa bertanya"],
    1, "Critical thinking = evaluasi berbasis bukti.", 25),
  mc("sulit", "Pembelajaran", "Metakognisi dalam belajar adalah...",
    ["Menghafal definisi saja", "Kesadaran dan pengaturan cara belajar diri sendiri", "Menyalin PR teman", "Tidur di kelas"],
    1, "Metakognisi = tahu bagaimana cara belajarmu sendiri.", 35),
  mc("sedang", "Kuliah", "Presentasi di kelas sebaiknya...",
    ["Membaca slide kata per kata tanpa kontak mata", "Menjelaskan poin utama dengan jelas dan berinteraksi dengan audiens", "Berbicara secepat mungkin agar cepat selesai", "Mengabaikan pertanyaan audiens"],
    1, "Presentasi efektif: jelas, ringkas, interaktif.", 25),
  mc("sedang", "Hitungan Mahasiswa", "Dari 40 soal, benar 28. Persentase benar adalah...",
    ["28%", "65%", "70%", "75%"],
    2, "28/40 × 100% = 70%.", 25),
  mc("sedang", "Wawasan Umum", "Perpustakaan kampus paling tepat dimanfaatkan untuk...",
    ["Hanya foto di media sosial", "Mencari referensi dan tempat belajar yang kondusif", "Tempat tidur siang saja", "Menyimpan motor"],
    1, "Fungsi utama: literasi dan ruang belajar.", 20),
  fill("sedang", "Pembelajaran", "Kepanjangan dari KRS dalam administrasi kuliah biasanya adalah...",
    ["KARTU RENCANA STUDI", "Kartu Rencana Studi", "kartu rencana studi"],
    "Dokumen rencana mata kuliah", "KRS = Kartu Rencana Studi.", 30),
  mc("sulit", "Etika Akademik", "Jika menemukan teman menyontek saat ujian, sikap yang lebih tepat secara akademik adalah...",
    ["Ikut menyontek agar 'adil'", "Menjaga integritas diri dan mengikuti aturan ujian yang berlaku", "Menyebarkan foto di media sosial saat ujian berlangsung", "Mengancam teman tersebut di tempat"],
    1, "Jaga integritas sendiri; laporkan lewat jalur resmi bila perlu.", 35),
  mc("sedang", "Soft Skill", "Growth mindset percaya bahwa kemampuan...",
    ["Sudah tetap sejak lahir dan tidak bisa diubah", "Dapat berkembang melalui usaha dan latihan", "Hanya milik orang jenius", "Tidak berhubungan dengan belajar"],
    1, "Growth mindset: kemampuan bisa tumbuh dengan latihan.", 25),
  mc("sulit", "Logika", "Jika hujan maka jalan basah. Jalan tidak basah. Kesimpulan yang valid:",
    ["Pasti sedang hujan", "Tidak sedang hujan", "Jalan selalu basah", "Tidak ada hubungan"],
    1, "Modus tollens: jika P→Q dan ¬Q maka ¬P.", 35),
  mc("sedang", "Literasi Digital", "Yang paling aman saat memakai WiFi publik untuk urusan akademik sensitif:",
    ["Login SIAKAD tanpa proteksi tambahan", "Hindari input password penting, atau gunakan VPN / jaringan terpercaya", "Bagikan password ke teman di cafe", "Matikan semua keamanan browser"],
    1, "WiFi publik berisiko; batasi data sensitif atau gunakan proteksi.", 35),
  fill("sedang", "Teka-teki", "Kepanjangan dari URL dalam konteks web adalah...",
    ["UNIFORM RESOURCE LOCATOR", "Uniform Resource Locator", "uniform resource locator"],
    "Alamat sumber di web", "URL = Uniform Resource Locator.", 35),
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

function getSeedForRound(n) {
  return getSeedRound(n);
}
