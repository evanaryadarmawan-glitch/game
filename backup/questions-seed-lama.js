// Soal-soal Mahadipa 2026 - Mix edukasi STEKOM, soft skill, IT dasar, teka-teki, dan fun makrab
// File ini HANYA dipakai sebagai data awal (seed) untuk mengisi Firestore pertama kali.
// Setelah ter-seed, semua soal dikelola lewat Admin Panel & tersimpan di koleksi "questions".
const SEED_QUESTIONS = [
  // === PENGENALAN STEKOM & MAHADIPA ===
  {
    type: "quiz",
    category: "STEKOM Knowledge",
    question: "Apa kepanjangan dari STEKOM?",
    options: [
      "Sekolah Tinggi Elektronika dan Komputer",
      "Universitas Sains dan Teknologi Komputer",
      "Sekolah Tinggi Ekonomi Komputer",
      "Sistem Teknologi Komputer Modern"
    ],
    answer: 1,
    explanation: "STEKOM adalah Universitas Sains dan Teknologi Komputer yang berfokus pada bidang sains, teknologi, dan komputer."
  },
  {
    type: "quiz",
    category: "STEKOM Knowledge",
    question: "Kampus pusat Universitas STEKOM berada di kota mana?",
    options: ["Jakarta", "Yogyakarta", "Semarang", "Surabaya"],
    answer: 2,
    explanation: "Kampus pusat STEKOM terletak di Jl. Majapahit No. 605, Semarang, Jawa Tengah."
  },
  {
    type: "quiz",
    category: "Mahadipa",
    question: "Mahadipa 2026 merujuk pada apa?",
    options: [
      "Nama aplikasi kampus",
      "Angkatan mahasiswa baru tahun 2026",
      "Nama gedung baru STEKOM",
      "Program beasiswa khusus"
    ],
    answer: 1,
    explanation: "Mahadipa 2026 adalah sebutan untuk angkatan mahasiswa STEKOM tahun 2026."
  },

  // === SOFT SKILL & KEHIDUPAN KAMPUS ===
  {
    type: "quiz",
    category: "Soft Skill",
    question: "Dalam makrab, nilai paling penting yang harus dijunjung adalah...",
    options: [
      "Menang sendiri di semua kompetisi",
      "Kerja sama, saling menghormati, dan kebersamaan",
      "Hanya fokus pada kelompok sendiri",
      "Menghindari interaksi dengan orang baru"
    ],
    answer: 1,
    explanation: "Makrab bertujuan membangun kebersamaan, networking, dan karakter mahasiswa."
  },
  {
    type: "quiz",
    category: "Soft Skill",
    question: "Apa yang sebaiknya dilakukan jika ada teman sekelompok yang kesulitan dalam tugas?",
    options: [
      "Biarkan saja, itu tanggung jawabnya sendiri",
      "Bantu dan ajak diskusi bersama",
      "Laporkan ke dosen segera",
      "Kerjakan semua sendiri biar cepat selesai"
    ],
    answer: 1,
    explanation: "Kolaborasi dan saling membantu adalah kunci keberhasilan di dunia kampus maupun kerja."
  },
  {
    type: "quiz",
    category: "Kehidupan Kampus",
    question: "Sistem kuliah di STEKOM yang memungkinkan mahasiswa kuliah sambil bekerja disebut...",
    options: ["Kelas Reguler", "Kelas Karyawan / Hybrid / Online", "Kelas Intensif", "Kelas Malam Khusus"],
    answer: 1,
    explanation: "STEKOM dikenal dengan sistem kuliah fleksibel: offline, online, dan hybrid yang ramah pekerja."
  },

  // === PENGETAHUAN IT DASAR ===
  {
    type: "quiz",
    category: "IT Dasar",
    question: "Kepanjangan dari CPU adalah...",
    options: [
      "Central Processing Unit",
      "Computer Personal Unit",
      "Central Program Utility",
      "Control Processing Unit"
    ],
    answer: 0,
    explanation: "CPU (Central Processing Unit) adalah otak dari komputer yang memproses instruksi."
  },
  {
    type: "quiz",
    category: "IT Dasar",
    question: "Bahasa pemrograman yang sering digunakan untuk membuat website dinamis di sisi server adalah...",
    options: ["HTML", "CSS", "JavaScript / PHP / Python", "Photoshop"],
    answer: 2,
    explanation: "JavaScript (Node.js), PHP, dan Python adalah bahasa populer untuk backend web."
  },
  {
    type: "quiz",
    category: "IT Dasar",
    question: "Apa fungsi utama dari RAM pada komputer?",
    options: [
      "Menyimpan data secara permanen",
      "Menyimpan data sementara saat program berjalan",
      "Menghubungkan ke internet",
      "Menampilkan gambar di layar"
    ],
    answer: 1,
    explanation: "RAM (Random Access Memory) menyimpan data sementara yang sedang diproses."
  },
  {
    type: "quiz",
    category: "IT Dasar",
    question: "Yang termasuk perangkat input adalah...",
    options: ["Monitor", "Speaker", "Keyboard & Mouse", "Printer"],
    answer: 2,
    explanation: "Keyboard dan mouse digunakan untuk memasukkan data/perintah ke komputer."
  },

  // === TEKA-TEKI & LOGIKA ===
  {
    type: "puzzle",
    category: "Teka-teki",
    question: "Susun huruf berikut menjadi kata yang berhubungan dengan teknologi: O-T-K-E-M-S",
    answer: "STEKOM",
    hint: "Nama kampus kita!",
    explanation: "Jawaban: STEKOM"
  },
  {
    type: "puzzle",
    category: "Teka-teki",
    question: "Aku punya kunci tapi bukan untuk pintu. Aku bisa membuka dunia digital. Apakah aku?",
    answer: "PASSWORD",
    hint: "Atau kata sandi...",
    explanation: "Password / kata sandi adalah kunci digital."
  },
  {
    type: "quiz",
    category: "Logika",
    question: "Jika semua mahasiswa STEKOM adalah generasi unggul, dan kamu adalah mahasiswa STEKOM, maka...",
    options: [
      "Kamu pasti sudah kaya",
      "Kamu adalah bagian dari generasi unggul",
      "Kamu harus pindah jurusan",
      "Tidak ada kesimpulan yang bisa diambil"
    ],
    answer: 1,
    explanation: "Ini adalah silogisme sederhana: jika A adalah B, dan kamu adalah A, maka kamu adalah B."
  },
  {
    type: "quiz",
    category: "Logika",
    question: "Urutan yang benar dalam proses problem solving adalah...",
    options: [
      "Solusi → Masalah → Evaluasi",
      "Identifikasi masalah → Analisis → Solusi → Evaluasi",
      "Kerjakan dulu → Baru pikirkan",
      "Tanya teman → Copy jawaban"
    ],
    answer: 1,
    explanation: "Problem solving yang baik dimulai dari memahami masalah, menganalisis, mencari solusi, lalu mengevaluasi."
  },

  // === FUN & MAKRAB VIBES ===
  {
    type: "quiz",
    category: "Fun Makrab",
    question: "Saat ice breaking di makrab, hal terbaik yang bisa kamu lakukan adalah...",
    options: [
      "Diam saja biar tidak malu",
      "Ikut aktif, perkenalkan diri, dan kenali teman baru",
      "Hanya ngobrol dengan teman se-prodi",
      "Main HP terus"
    ],
    answer: 1,
    explanation: "Makrab adalah momen terbaik membangun relasi. Jangan sia-siakan!"
  },
  {
    type: "quiz",
    category: "Fun Makrab",
    question: "Motto yang paling cocok untuk angkatan Mahadipa 2026 adalah...",
    options: [
      "Sendiri lebih baik",
      "Bersama kita hebat, sendiri kita terbatas",
      "Yang penting lulus",
      "Tidak perlu berinteraksi"
    ],
    answer: 1,
    explanation: "Kebersamaan adalah kekuatan. Mahadipa 2026, solid!"
  },
  {
    type: "quiz",
    category: "Wawasan Umum",
    question: "Dalam presentasi kelompok, keterampilan yang paling dibutuhkan selain menguasai materi adalah...",
    options: [
      "Bicara secepat mungkin",
      "Komunikasi yang jelas, percaya diri, dan teamwork",
      "Membaca teks dari HP terus-menerus",
      "Hanya satu orang yang bicara"
    ],
    answer: 1,
    explanation: "Public speaking + teamwork adalah soft skill penting di dunia akademik dan profesional."
  },
  {
    type: "quiz",
    category: "Entrepreneurship",
    question: "Salah satu semangat yang ditekankan di STEKOM adalah technopreneurship. Artinya...",
    options: [
      "Hanya fokus belajar teori",
      "Menggabungkan teknologi dengan jiwa kewirausahaan",
      "Menjadi programmer saja",
      "Menghindari bisnis"
    ],
    answer: 1,
    explanation: "Technopreneurship = memanfaatkan teknologi untuk menciptakan peluang usaha dan inovasi."
  },
  {
    type: "puzzle",
    category: "Teka-teki",
    question: "Hitung: Jika 1 mahasiswa STEKOM = 1 potensi besar, maka 10 mahasiswa yang solid = ...",
    answer: "10 POTENSI BESAR",
    hint: "Atau 'TIM HEBAT' / 'SOLID'",
    explanation: "Karena setiap individu tetap berharga, dan kebersamaan mengalikannya!"
  },
  {
    type: "quiz",
    category: "Nilai Kampus",
    question: "Yang TIDAK termasuk sikap yang diharapkan dari mahasiswa STEKOM adalah...",
    options: [
      "Integritas dan jujur",
      "Inovatif dan adaptif",
      "Menyontek demi nilai tinggi",
      "Siap berkolaborasi"
    ],
    answer: 2,
    explanation: "Integritas adalah fondasi. Menyontek merusak karakter dan kepercayaan."
  }
];
