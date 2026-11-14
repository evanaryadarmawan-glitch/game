// Soal-soal Mahadipa 2026 (v10) - semua soal UMUM (untuk semua prodi), tingkat mudah sampai sedang.
// File ini HANYA dipakai sebagai data awal (seed) untuk mengisi Firestore.
// Setelah ter-seed, semua soal dikelola lewat Admin Panel & tersimpan di koleksi "questions".
//
// Field:
//   rumpun : "umum" = tampil untuk semua prodi (fitur soal khusus jurusan tetap ada di Admin, tapi tidak dipakai di seed ini)
//   level  : mudah | sedang
//   points : poin dasar (mudah 10, sedang 15). Bonus kecepatan tetap +0..10.
//
// Soal isian (type "puzzle"): jawaban dibandingkan setelah dinormalisasi (huruf besar,
// "1.000"->"1000", "3,2"->"3.2", awalan "Rp" dibuang), jadi "Rp80.000" dan "80000" sama-sama benar.

const PTS = { mudah: 10, sedang: 15 };

// Pilihan ganda. answer = index opsi yang benar (0-3). Urutan opsi diacak otomatis saat tampil.
function mc(level, category, question, options, answer, explanation, timeLimit) {
  return { type: "quiz", rumpun: "umum", level, points: PTS[level], category, question, options, answer, explanation, timeLimit };
}
// Isian. answer = string atau array variasi jawaban yang diterima
function fill(level, category, question, answer, hint, explanation, timeLimit) {
  return { type: "puzzle", rumpun: "umum", level, points: PTS[level], category, question, answer, hint, explanation, timeLimit };
}

const SEED_QUESTIONS = [

  // ================= WAWASAN KAMPUS =================
  mc("mudah", "STEKOM Knowledge", "Apa kepanjangan dari STEKOM?",
    ["Sekolah Tinggi Elektronika dan Komputer", "Universitas Sains dan Teknologi Komputer", "Sekolah Tinggi Ekonomi Komputer", "Sistem Teknologi Komputer Modern"],
    1, "STEKOM adalah Universitas Sains dan Teknologi Komputer yang berfokus pada bidang sains, teknologi, dan komputer.", 30),
  mc("mudah", "STEKOM Knowledge", "Kampus pusat Universitas STEKOM berada di kota mana?",
    ["Jakarta", "Yogyakarta", "Semarang", "Surabaya"],
    2, "Kampus pusat STEKOM terletak di Jl. Majapahit No. 605, Semarang, Jawa Tengah.", 30),
  mc("mudah", "Mahadipa", "Mahadipa 2026 merujuk pada apa?",
    ["Nama aplikasi kampus", "Angkatan mahasiswa baru tahun 2026", "Nama gedung baru STEKOM", "Program beasiswa khusus"],
    1, "Mahadipa 2026 adalah sebutan untuk angkatan mahasiswa STEKOM tahun 2026.", 30),
  mc("mudah", "Kewirausahaan", "Technopreneurship berarti...",
    ["Hanya fokus belajar teori", "Menggabungkan teknologi dengan jiwa kewirausahaan", "Menjadi programmer saja", "Menghindari bisnis"],
    1, "Technopreneurship = memanfaatkan teknologi untuk menciptakan peluang usaha dan inovasi.", 30),
  mc("mudah", "Nilai Kampus", "Yang TIDAK termasuk sikap yang diharapkan dari mahasiswa adalah...",
    ["Integritas dan jujur", "Inovatif dan adaptif", "Menyontek demi nilai tinggi", "Siap berkolaborasi"],
    2, "Integritas adalah fondasi. Menyontek merusak karakter dan kepercayaan.", 30),

  // ================= SOFT SKILL =================
  mc("mudah", "Soft Skill", "Saat ice breaking di makrab, hal terbaik yang bisa kamu lakukan adalah...",
    ["Diam saja biar tidak malu", "Ikut aktif, perkenalkan diri, dan kenali teman baru", "Hanya ngobrol dengan teman se-prodi", "Main HP terus"],
    1, "Makrab adalah momen terbaik membangun relasi. Jangan sia-siakan!", 30),
  mc("mudah", "Soft Skill", "Apa yang sebaiknya dilakukan jika ada teman sekelompok yang kesulitan dalam tugas?",
    ["Biarkan saja, itu tanggung jawabnya sendiri", "Bantu dan ajak diskusi bersama", "Laporkan ke dosen segera", "Kerjakan semua sendiri biar cepat selesai"],
    1, "Kolaborasi dan saling membantu adalah kunci keberhasilan di dunia kampus maupun kerja.", 30),
  mc("mudah", "Soft Skill", "Tugas dikumpulkan lusa dan kamu punya banyak kegiatan. Langkah terbaik adalah...",
    ["Menunda sampai malam terakhir", "Membuat jadwal dan mengerjakannya sedikit demi sedikit", "Meminta teman mengerjakannya", "Mengabaikannya saja"],
    1, "Manajemen waktu: bagi pekerjaan menjadi bagian kecil dan kerjakan sesuai jadwal supaya tidak panik di menit terakhir.", 30),

  // ================= HITUNGAN MAHASISWA =================
  mc("sedang", "Hitungan Mahasiswa",
    "Semester ini kamu mengambil 2 mata kuliah: MK1 (3 SKS) nilai A (bobot 4) dan MK2 (2 SKS) nilai B (bobot 3). Berapa IPS-mu?",
    ["3,4", "3,5", "3,6", "3,8"],
    2, "Total mutu = 3×4 + 2×3 = 18. Total SKS = 5. IPS = 18 ÷ 5 = 3,6.", 60),
  mc("mudah", "Hitungan Mahasiswa",
    "Dari 10 pertemuan kuliah, kamu hadir 8 kali. Berapa persen kehadiranmu?",
    ["60%", "70%", "80%", "90%"],
    2, "8 ÷ 10 × 100% = 80%.", 30),
  mc("sedang", "Hitungan Mahasiswa",
    "Syarat ikut ujian adalah kehadiran minimal 75%. Jika ada 16 pertemuan, paling sedikit berapa kali kamu harus hadir?",
    ["10", "11", "12", "14"],
    2, "75% × 16 = 12 pertemuan.", 60),
  fill("mudah", "Hitungan Mahasiswa",
    "Buku seharga Rp100.000 mendapat diskon 20%. Berapa harga yang harus dibayar (dalam rupiah)?",
    ["80000"], "Angka saja, contoh: 80000",
    "Diskon = 20% × 100.000 = 20.000. Harga bayar = 100.000 − 20.000 = Rp80.000.", 60),
  mc("sedang", "Hitungan Mahasiswa",
    "Uang sakumu Rp1.500.000 per bulan. Kos Rp600.000 dan makan Rp500.000. Berapa sisa uangmu?",
    ["Rp300.000", "Rp400.000", "Rp500.000", "Rp600.000"],
    1, "Pengeluaran = 600.000 + 500.000 = 1.100.000. Sisa = 1.500.000 − 1.100.000 = Rp400.000.", 60),
  mc("sedang", "Hitungan Mahasiswa",
    "Kuliah dimulai pukul 07.30. Perjalanan ke kampus 40 menit, ditambah 10 menit untuk parkir dan jalan ke kelas. Paling lambat pukul berapa kamu berangkat?",
    ["06.30", "06.40", "06.50", "07.00"],
    1, "Total waktu = 40 + 10 = 50 menit. 07.30 − 50 menit = 06.40.", 60),
  mc("sedang", "Hitungan Mahasiswa",
    "Kuota internetmu 5 GB dan kamu memakai 250 MB per hari. Kira-kira berapa hari kuotamu bertahan?",
    ["10", "15", "20", "25"],
    2, "5 GB ≈ 5.000 MB. 5.000 ÷ 250 = 20 hari.", 60),

  // ================= LOGIKA & MATEMATIKA DASAR =================
  mc("mudah", "Logika", "Lanjutkan deret berikut: 2, 4, 8, 16, ...",
    ["24", "30", "32", "64"],
    2, "Tiap angka dikali 2: 16 × 2 = 32.", 30),
  mc("sedang", "Logika", "Sebuah dadu dilempar sekali. Berapa peluang muncul mata dadu genap?",
    ["1/6", "1/3", "1/2", "2/3"],
    2, "Mata genap ada 3 (2, 4, 6) dari 6 kemungkinan, jadi peluangnya 3/6 = 1/2.", 45),
  fill("sedang", "Logika", "Berapa hasil dari 15 + 25 × 2 ?",
    ["65"], "Ingat urutan operasi hitung",
    "Perkalian dikerjakan lebih dulu: 25 × 2 = 50. Lalu 15 + 50 = 65.", 45),
  mc("mudah", "Logika", "Jika semua mahasiswa STEKOM adalah generasi unggul, dan kamu adalah mahasiswa STEKOM, maka...",
    ["Kamu pasti sudah kaya", "Kamu adalah bagian dari generasi unggul", "Kamu harus pindah jurusan", "Tidak ada kesimpulan yang bisa diambil"],
    1, "Silogisme sederhana: jika A adalah B, dan kamu adalah A, maka kamu adalah B.", 45),

  // ================= TEKA-TEKI =================
  fill("mudah", "Teka-teki", "Susun huruf berikut menjadi kata yang berhubungan dengan teknologi: O-T-K-E-M-S",
    ["STEKOM"], "Nama kampus kita!",
    "Jawaban: STEKOM", 45),
  fill("mudah", "Teka-teki", "Aku punya kunci tapi bukan untuk pintu. Aku bisa membuka dunia digital. Apakah aku?",
    ["PASSWORD", "KATA SANDI", "KATA KUNCI"], "Atau kata sandi...",
    "Password / kata sandi adalah kunci digital.", 45),

  // ================= IT DASAR & LITERASI DIGITAL =================
  mc("mudah", "IT Dasar", "Kepanjangan dari CPU adalah...",
    ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Control Processing Unit"],
    0, "CPU (Central Processing Unit) adalah otak dari komputer yang memproses instruksi.", 30),
  mc("mudah", "IT Dasar", "Apa fungsi utama dari RAM pada komputer?",
    ["Menyimpan data secara permanen", "Menyimpan data sementara saat program berjalan", "Menghubungkan ke internet", "Menampilkan gambar di layar"],
    1, "RAM (Random Access Memory) menyimpan data sementara yang sedang diproses.", 30),
  mc("mudah", "IT Dasar", "Yang termasuk perangkat input adalah...",
    ["Monitor", "Speaker", "Keyboard & Mouse", "Printer"],
    2, "Keyboard dan mouse digunakan untuk memasukkan data/perintah ke komputer.", 30),
  mc("mudah", "Literasi Digital", "Manakah password yang paling kuat?",
    ["123456", "namaku2005", "K0pi!Hangat_92#", "password"],
    2, "Password kuat itu panjang, memadukan huruf besar-kecil, angka, dan simbol, serta tidak mudah ditebak.", 30),
  mc("sedang", "Literasi Digital",
    "Kamu menerima pesan: \"SIAKAD akan ditutup hari ini. Klik tautan ini dan masukkan password untuk verifikasi.\" Langkah paling tepat adalah...",
    ["Segera klik dan isi password sebelum akun ditutup",
     "Teruskan pesan itu ke grup angkatan agar semua ikut verifikasi",
     "Abaikan tautan itu, lalu cek lewat situs resmi kampus atau tanyakan ke bagian akademik",
     "Balas pesan itu dan tanyakan apakah benar"],
    2, "Itu ciri phishing: mendesak, membawa tautan palsu, dan meminta password. Verifikasi lewat kanal resmi yang kamu buka sendiri.", 45),

  // ================= BAHASA & WAWASAN UMUM =================
  mc("mudah", "Bahasa Indonesia", "Penulisan kata baku yang benar adalah...",
    ["Apotik", "Apotek", "Apoteck", "Apotec"],
    1, "Bentuk baku menurut KBBI adalah \"apotek\".", 30),
  mc("mudah", "Bahasa Inggris", "Dalam tugas kuliah, istilah deadline berarti...",
    ["Daftar nilai", "Batas waktu pengumpulan", "Nama dosen pengampu", "Ruangan ujian"],
    1, "Deadline = batas waktu terakhir pengumpulan tugas.", 30),
  mc("mudah", "Wawasan Umum", "Sumpah Pemuda diikrarkan pada tanggal...",
    ["17 Agustus 1945", "28 Oktober 1928", "20 Mei 1908", "1 Juni 1945"],
    1, "Sumpah Pemuda diikrarkan pada 28 Oktober 1928 (Kongres Pemuda II).", 30)
];
