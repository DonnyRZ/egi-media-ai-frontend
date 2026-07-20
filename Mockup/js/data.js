/* Dummy data — EGI Media News Dashboard Mockup */
window.EGI = window.EGI || {};

EGI.companies = [
  { id: 'astra', name: 'Astra International', industry: 'Holding & Diversifikasi' },
  { id: 'united-tractors', name: 'United Tractors', industry: 'Alat Berat & Pertambangan' },
  { id: 'astra-honda', name: 'Astra Honda Motor', industry: 'Otomotif' }
];

EGI.user = {
  name: 'Arga Wijaya',
  role: 'CEO',
  email: 'arga.wijaya@astra.co.id',
  title: 'Chief Executive Officer',
  timezone: 'Asia/Jakarta',
  language: 'id',
  avatar: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect fill="#1E3A5F" width="96" height="96"/><text x="48" y="48" text-anchor="middle" dominant-baseline="central" fill="#F8FAFC" font-family="Plus Jakarta Sans,Arial,sans-serif" font-size="30" font-weight="600">AW</text></svg>')
};

EGI.issues = [
  {
    id: 'issue-1',
    title: 'Tarif Impor Bahan Baku Naik 15%',
    summary: 'Pemerintah menaikkan tarif impor bahan baku sebesar 15%, yang berpotensi meningkatkan biaya produksi perusahaan dalam beberapa bulan ke depan.',
    priority: 'tinggi',
    status: 'baru',
    updatedAt: 'Hari ini · 08:45',
    updatedFull: '18 Jul 2026, 08:45',
    period: '24jam',
    companyIds: ['astra', 'united-tractors'],
    saved: false,
    priorityReason: 'Relevansi tinggi terhadap ketergantungan impor bahan baku, dampak biaya langsung, dan urgensi karena kebijakan mulai berlaku dalam 30 hari.',
    whatHappened: 'Pemerintah mengumumkan kenaikan tarif impor untuk beberapa kategori bahan baku industri sebesar 15%, berlaku mulai 1 Agustus 2026.',
    whyMatters: 'Perusahaan mengimpor sebagian bahan baku utama dari pemasok luar negeri untuk operasional di Indonesia. Kenaikan tarif dapat menekan margin produksi pada lini produk inti.',
    impacts: [
      'Biaya bahan baku berpotensi naik pada kontrak impor berikutnya.',
      'Perlu penyesuaian anggaran pengadaan kuartal III–IV.',
      'Harga jual produk akhir mungkin perlu dievaluasi.'
    ],
    risks: [
      'Margin keuntungan dapat menurun jika biaya tidak dapat dialihkan.',
      'Proyek ekspansi produksi berisiko tertunda karena revisi biaya.',
      'Tekanan daya saing jika kompetitor memiliki sumber lokal yang lebih besar.'
    ],
    watch: [
      'Tanggal pemberlakuan resmi dan daftar HS code yang terdampak.',
      'Respons asosiasi industri dan kemungkinan penyesuaian kebijakan.',
      'Pergerakan harga bahan baku di pasar domestik.',
      'Strategi harga kompetitor regional.'
    ],
    facts: [
      'Tarif impor naik 15% untuk kategori bahan baku terpilih.',
      'Kebijakan diumumkan pada 17 Juli 2026.',
      'Mulai berlaku 1 Agustus 2026.',
      'Diumumkan melalui keterangan resmi Kementerian terkait.'
    ],
    analysis: 'Kenaikan tarif berpotensi meningkatkan biaya produksi karena perusahaan masih mengandalkan impor untuk sebagian bahan baku operasional di Indonesia. Dampak paling terasa pada lini dengan margin tipis. Opsi tindak lanjut: pertimbangkan evaluasi pemasok alternatif dan simulasi dampak kenaikan biaya.',
    assumption: 'Volume impor perusahaan diasumsikan tidak berubah secara material dalam 3 bulan pertama setelah tarif baru berlaku.',
    sources: [
      {
        title: 'Pemerintah Naikkan Tarif Impor Bahan Baku Industri 15%',
        date: '17 Jul 2026',
        author: 'Redaksi Ekonomi EGI Media',
        claim: 'Mendukung fakta besaran tarif 15% dan tanggal berlaku.',
        url: '#sumber-egimedia'
      },
      {
        title: 'Dampak Kebijakan Tarif terhadap Sektor Manufaktur',
        date: '17 Jul 2026',
        author: 'Andi Wijaya',
        claim: 'Mendukung konteks industri yang terdampak.',
        url: '#sumber-egimedia'
      }
    ]
  },
  {
    id: 'issue-2',
    title: 'Kompetitor Regional Ekspansi ke Jawa Barat',
    summary: 'Ekspansi kompetitor ke wilayah operasional utama dapat meningkatkan tekanan harga dan perebutan pelanggan industri.',
    priority: 'tinggi',
    status: 'berkembang',
    updatedAt: 'Hari ini · 07:20',
    updatedFull: '18 Jul 2026, 07:20',
    period: '24jam',
    companyIds: ['astra', 'united-tractors', 'astra-honda'],
    saved: false,
    priorityReason: 'Wilayah Jawa Barat adalah area operasional utama; ekspansi kompetitor berdampak langsung pada pangsa pasar dan pricing.',
    whatHappened: 'Kompetitor regional mengumumkan pembukaan fasilitas distribusi baru di Jawa Barat dengan kapasitas operasional penuh pada Q4 2026.',
    whyMatters: 'Jawa Barat menyumbang porsi signifikan dari pendapatan perusahaan. Kehadiran kompetitor dapat memengaruhi retensi pelanggan B2B dan strategi harga.',
    impacts: [
      'Tekanan harga pada segmen industri di Jawa Barat.',
      'Risiko perpindahan sebagian pelanggan kontrak.',
      'Perlu peninjauan kapasitas layanan dan kecepatan pengiriman.'
    ],
    risks: [
      'Penurunan pangsa pasar regional dalam 6–12 bulan.',
      'Margin tertekan jika perang harga terjadi.',
      'Beban biaya pemasaran untuk mempertahankan posisi.'
    ],
    watch: [
      'Jadwal operasional penuh fasilitas kompetitor.',
      'Kampanye harga atau bundling yang diluncurkan.',
      'Respons pelanggan kunci di wilayah Jawa Barat.',
      'Peluang kemitraan distribusi alternatif.'
    ],
    facts: [
      'Kompetitor mengumumkan ekspansi ke Jawa Barat pada 16 Juli 2026.',
      'Target operasional penuh: Q4 2026.',
      'Investasi yang dilaporkan sekitar Rp 450 miliar.'
    ],
    analysis: 'Ekspansi ini dapat meningkatkan tekanan kompetitif di wilayah inti perusahaan. Perlu dipantau apakah kompetitor menargetkan segmen harga yang sama atau berbeda. Opsi tindak lanjut: tinjau kekuatan layanan regional dan skenario retensi pelanggan utama.',
    assumption: 'Asumsi analisis: kompetitor akan menargetkan segmen pelanggan yang tumpang tindih dengan portofolio perusahaan dalam 12 bulan pertama.',
    sources: [
      {
        title: 'Kompetitor Regional Bangun Pusat Distribusi di Jawa Barat',
        date: '16 Jul 2026',
        author: 'Siti Rahma',
        claim: 'Mendukung fakta ekspansi dan target operasional.',
        url: '#sumber-egimedia'
      }
    ]
  },
  {
    id: 'issue-3',
    title: 'Aturan Baru Sertifikasi Produk Mulai Berlaku',
    summary: 'Perubahan regulasi sertifikasi dapat memperlambat peluncuran produk jika proses kepatuhan belum siap.',
    priority: 'sedang',
    status: 'dipantau',
    updatedAt: 'Hari ini · 06:10',
    updatedFull: '18 Jul 2026, 06:10',
    period: '24jam',
    companyIds: ['astra', 'united-tractors'],
    saved: false,
    priorityReason: 'Dampak operasional nyata tetapi timeline masih memberikan ruang penyesuaian; urgensi sedang.',
    whatHappened: 'Regulator memberlakukan persyaratan sertifikasi tambahan untuk kategori produk tertentu yang sudah beredar di pasar.',
    whyMatters: 'Beberapa lini produk perusahaan masuk dalam kategori yang terdampak. Keterlambatan sertifikasi dapat menunda peluncuran atau perpanjangan izin edar.',
    impacts: [
      'Waktu ke pasar untuk produk baru berpotensi bertambah.',
      'Biaya kepatuhan dan uji laboratorium dapat meningkat.',
      'Jadwal peluncuran Q3 perlu ditinjau ulang.'
    ],
    risks: [
      'Penundaan peluncuran produk prioritas.',
      'Sanksi administrasi jika dokumentasi belum lengkap.',
      'Ketertinggalan dibanding kompetitor yang lebih siap.'
    ],
    watch: [
      'Pedoman teknis lengkap dari regulator.',
      'Antrian dan kapasitas lembaga sertifikasi.',
      'Status dokumen kepatuhan internal per lini produk.'
    ],
    facts: [
      'Aturan sertifikasi baru berlaku sejak 15 Juli 2026.',
      'Masa transisi 90 hari untuk produk yang sudah beredar.',
      'Berlaku untuk kategori produk terdaftar tertentu.'
    ],
    analysis: 'Regulasi ini memerlukan penyesuaian proses kepatuhan, tetapi belum berstatus darurat karena ada masa transisi. Tim terkait dapat memprioritaskan produk dengan jadwal peluncuran terdekat.',
    assumption: 'Asumsi analisis: kapasitas lembaga sertifikasi eksternal tetap tersedia tanpa antrean signifikan selama masa transisi.',
    sources: [
      {
        title: 'Regulator Terbitkan Aturan Sertifikasi Produk Baru',
        date: '15 Jul 2026',
        author: 'Redaksi Regulasi EGI Media',
        claim: 'Mendukung fakta tanggal berlaku dan masa transisi.',
        url: '#sumber-egimedia'
      }
    ]
  },
  {
    id: 'issue-4',
    title: 'Permintaan Segmen Industri Menurun',
    summary: 'Penurunan permintaan pada segmen inti dapat memengaruhi target penjualan kuartal berikutnya.',
    priority: 'sedang',
    status: 'dipantau',
    updatedAt: 'Hari ini · 05:30',
    updatedFull: '18 Jul 2026, 05:30',
    period: '24jam',
    companyIds: ['astra', 'united-tractors'],
    saved: false,
    priorityReason: 'Tren permintaan relevan untuk forecasting, tetapi belum menunjukkan lonjakan mendadak yang memerlukan perhatian segera.',
    whatHappened: 'Data industri menunjukkan penurunan permintaan pada segmen manufaktur menengah sebesar sekitar 4% dibandingkan bulan sebelumnya.',
    whyMatters: 'Segmen tersebut termasuk kontributor pendapatan penting. Penurunan berkelanjutan dapat memengaruhi pencapaian target kuartal.',
    impacts: [
      'Volume penjualan berpotensi di bawah proyeksi awal.',
      'Utilisasi kapasitas produksi dapat menurun.',
      'Perlu penyesuaian forecast dan inventory.'
    ],
    risks: [
      'Akumulasi stok jika permintaan terus melambat.',
      'Tekanan pada target pendapatan kuartal.',
      'Efisiensi operasional menurun pada fasilitas tertentu.'
    ],
    watch: [
      'Data permintaan bulan berjalan dari asosiasi industri.',
      'Indikator order masuk dari pelanggan utama.',
      'Pergerakan harga dan promo di pasar.'
    ],
    facts: [
      'Permintaan segmen industri turun sekitar 4% MoM.',
      'Data dirilis oleh asosiasi industri pada 14 Juli 2026.',
      'Penurunan terjadi pada kategori manufaktur menengah.'
    ],
    analysis: 'Penurunan 4% belum tentu bersifat struktural, tetapi cukup untuk meninjau forecast penjualan. Opsi tindak lanjut: bandingkan dengan data order internal dan evaluasi kebutuhan penyesuaian produksi jangka pendek.',
    assumption: 'Asumsi analisis: pola penurunan bersifat sementara dan belum mencerminkan kontraksi tahunan yang lebih dalam.',
    sources: [
      {
        title: 'Permintaan Manufaktur Menengah Turun 4% Bulan Ini',
        date: '14 Jul 2026',
        author: 'Dewi Lestari',
        claim: 'Mendukung angka penurunan permintaan 4%.',
        url: '#sumber-egimedia'
      }
    ]
  },
  {
    id: 'issue-5',
    title: 'Fluktuasi Harga Energi Industri',
    summary: 'Kenaikan harga energi industri dalam seminggu terakhir berpotensi menambah beban biaya operasional pabrik.',
    priority: 'rendah',
    status: 'berkembang',
    updatedAt: 'Kemarin · 16:00',
    updatedFull: '17 Jul 2026, 16:00',
    period: '7hari',
    companyIds: ['united-tractors'],
    saved: false,
    priorityReason: 'Dampak biaya ada, namun skala perubahan masih dalam rentang yang dapat dikelola dalam jangka pendek.',
    whatHappened: 'Harga energi untuk industri naik sekitar 3% dalam tujuh hari terakhir di beberapa wilayah operasi.',
    whyMatters: 'Biaya energi merupakan komponen operasional pabrik. Kenaikan berkelanjutan dapat memengaruhi struktur biaya produksi.',
    impacts: [
      'Biaya utilitas pabrik berpotensi naik.',
      'Margin pada shift produksi malam dapat tertekan.'
    ],
    risks: [
      'Akumulasi biaya jika tren berlanjut hingga akhir kuartal.',
      'Perlu revisi anggaran utilitas.'
    ],
    watch: [
      'Pergerakan harga energi minggu depan.',
      'Kebijakan subsidi atau penyesuaian tarif industri.'
    ],
    facts: [
      'Harga energi industri naik sekitar 3% dalam 7 hari.',
      'Kenaikan tercatat di beberapa wilayah operasi utama.'
    ],
    analysis: 'Dampak saat ini masih terbatas, tetapi perlu dipantau agar tidak menumpuk tanpa penyesuaian anggaran.',
    assumption: 'Asumsi analisis: tidak ada lonjakan harga tambahan di atas 5% dalam 30 hari ke depan.',
    sources: [
      {
        title: 'Harga Energi Industri Naik Tipis dalam Sepekan',
        date: '17 Jul 2026',
        author: 'Redaksi Energi EGI Media',
        claim: 'Mendukung fakta kenaikan sekitar 3%.',
        url: '#sumber-egimedia'
      }
    ]
  },
  {
    id: 'issue-6',
    title: 'Peluang Kemitraan Rantai Pasok Domestik',
    summary: 'Beberapa pemasok domestik membuka kapasitas baru yang berpotensi menjadi alternatif pengadaan bahan baku.',
    priority: 'sedang',
    status: 'baru',
    updatedAt: 'Hari ini · 10:15',
    updatedFull: '18 Jul 2026, 10:15',
    period: '30hari',
    companyIds: ['astra', 'united-tractors'],
    saved: false,
    priorityReason: 'Peluang strategis terkait mitigasi risiko impor, relevan terutama setelah isu tarif.',
    whatHappened: 'Tiga pemasok domestik mengumumkan peningkatan kapasitas produksi bahan baku yang relevan dengan kebutuhan industri.',
    whyMatters: 'Diversifikasi pemasok domestik dapat membantu mengurangi paparan terhadap perubahan tarif impor dan gangguan logistik internasional.',
    impacts: [
      'Opsi pengadaan alternatif berpotensi tersedia dalam 2–3 bulan.',
      'Negosiasi kontrak jangka menengah dapat dibuka lebih awal.'
    ],
    risks: [
      'Kualitas dan konsistensi pasokan belum teruji pada skala besar.',
      'Harga awal mungkin belum kompetitif dibanding impor.'
    ],
    watch: [
      'Spesifikasi teknis produk pemasok baru.',
      'Kapasitas pengiriman dan lead time.',
      'Skema harga kontrak awal.'
    ],
    facts: [
      'Tiga pemasok domestik mengumumkan ekspansi kapasitas.',
      'Pengumuman dipublikasikan dalam dua minggu terakhir.'
    ],
    analysis: 'Peluang ini dapat menjadi opsi mitigasi terhadap risiko tarif impor. Perlu due diligence kualitas sebelum komitmen volume besar.',
    assumption: 'Asumsi analisis: kapasitas yang diumumkan dapat dialokasikan sebagian untuk pembeli baru dalam 90 hari.',
    sources: [
      {
        title: 'Pemasok Domestik Perluas Kapasitas Bahan Baku',
        date: '10 Jul 2026',
        author: 'Rina Putri',
        claim: 'Mendukung fakta ekspansi kapasitas pemasok.',
        url: '#sumber-egimedia'
      }
    ]
  }
];

EGI.alerts = [
  {
    id: 'alert-1',
    eventAt: '2026-07-18T08:50:00+07:00',
    issueId: 'issue-1',
    type: 'langsung',
    title: 'Tarif Impor Bahan Baku Naik 15%',
    change: 'Pemerintah mempercepat pemberlakuan dari September menjadi Agustus.',
    summary: 'Pemerintah mempercepat pemberlakuan dari September menjadi Agustus.',
    priority: 'tinggi',
    createdAt: 'Hari ini · 08:50',
    read: false,
    saved: false,
    completed: false,
    sourceIndexes: [1]
  },
  {
    id: 'alert-1b',
    eventAt: '2026-07-17T16:20:00+07:00',
    issueId: 'issue-1',
    type: 'langsung',
    title: 'Tarif Impor Bahan Baku Naik 15%',
    change: 'Kenaikan tarif 15% diumumkan resmi; berlaku untuk kategori bahan baku terpilih.',
    summary: 'Kenaikan tarif 15% diumumkan resmi; berlaku untuk kategori bahan baku terpilih.',
    priority: 'tinggi',
    createdAt: 'Kemarin · 16:20',
    read: true,
    saved: false,
    completed: false,
    sourceIndexes: [0]
  },
  {
    id: 'alert-2',
    eventAt: '2026-07-18T07:25:00+07:00',
    issueId: 'issue-2',
    type: 'langsung',
    title: 'Kompetitor Regional Ekspansi ke Jawa Barat',
    change: 'Detail investasi sekitar Rp 450 miliar dan target operasional penuh Q4 2026 dipublikasikan.',
    summary: 'Detail investasi sekitar Rp 450 miliar dan target operasional penuh Q4 2026 dipublikasikan.',
    priority: 'tinggi',
    createdAt: 'Hari ini · 07:25',
    read: false,
    saved: false,
    completed: false,
    sourceIndexes: [0]
  },
  {
    id: 'alert-2b',
    eventAt: '2026-07-16T14:10:00+07:00',
    issueId: 'issue-2',
    type: 'langsung',
    title: 'Kompetitor Regional Ekspansi ke Jawa Barat',
    change: 'Kompetitor mengumumkan rencana pusat distribusi baru di Jawa Barat.',
    summary: 'Kompetitor mengumumkan rencana pusat distribusi baru di Jawa Barat.',
    priority: 'tinggi',
    createdAt: '16 Jul · 14:10',
    read: true,
    saved: false,
    completed: false,
    sourceIndexes: [0]
  },
  {
    id: 'alert-3',
    eventAt: '2026-07-18T07:00:00+07:00',
    issueId: null,
    type: 'ringkasan',
    title: 'Ringkasan Harian — 18 Juli 2026',
    change: '4 isu dengan perkembangan baru: tarif impor, ekspansi kompetitor, sertifikasi produk, dan permintaan industri.',
    summary: '4 isu dengan perkembangan baru: tarif impor, ekspansi kompetitor, sertifikasi produk, dan permintaan industri.',
    priority: 'sedang',
    createdAt: 'Hari ini · 07:00',
    read: true,
    saved: false,
    completed: false,
    dailyIssues: ['issue-1', 'issue-2', 'issue-3', 'issue-4']
  },
  {
    id: 'alert-4',
    eventAt: '2026-07-17T18:30:00+07:00',
    issueId: 'issue-3',
    type: 'langsung',
    title: 'Aturan Baru Sertifikasi Produk Mulai Berlaku',
    change: 'Masa berlaku dimulai; masa transisi 90 hari untuk produk yang sudah beredar.',
    summary: 'Masa berlaku dimulai; masa transisi 90 hari untuk produk yang sudah beredar.',
    priority: 'sedang',
    createdAt: 'Kemarin · 18:30',
    read: true,
    saved: false,
    completed: true
  },
  {
    id: 'alert-5',
    eventAt: '2026-07-17T07:00:00+07:00',
    issueId: null,
    type: 'ringkasan',
    title: 'Ringkasan Harian — 17 Juli 2026',
    change: '3 isu dipantau: permintaan industri, harga energi, dan peluang pemasok domestik.',
    summary: '3 isu dipantau: permintaan industri, harga energi, dan peluang pemasok domestik.',
    priority: 'sedang',
    createdAt: 'Kemarin · 07:00',
    read: true,
    saved: false,
    completed: false,
    dailyIssues: ['issue-4', 'issue-5', 'issue-6']
  }
];

/* Arsip email yang benar-benar dikirim oleh sistem. Berbeda dari objek alert
   yang merekam perkembangan isu di mesin monitoring. */
EGI.emails = [
  {
    id: 'email-direct-1',
    type: 'langsung',
    companyIds: ['astra', 'united-tractors'],
    sender: 'EGI Media Alerts <alerts@egimedia.co.id>',
    recipient: 'Arga Wijaya <arga.wijaya@astra.co.id>',
    subject: '[Prioritas Tinggi] Pemberlakuan Tarif Impor Dipercepat',
    preview: 'Pemerintah mempercepat pemberlakuan tarif impor dari September menjadi Agustus 2026.',
    sentAt: '2026-07-18T08:50:00+07:00',
    sentLabel: 'Hari ini · 08:50',
    read: false,
    priority: 'tinggi',
    issueId: 'issue-1',
    issueTitle: 'Tarif Impor Bahan Baku Naik 15%',
    change: 'Pemerintah mempercepat pemberlakuan tarif impor dari September menjadi Agustus 2026.',
    impact: 'Biaya bahan baku perusahaan dapat meningkat satu bulan lebih cepat dari perkiraan sebelumnya.'
  },
  {
    id: 'email-direct-2',
    type: 'langsung',
    companyIds: ['astra', 'united-tractors', 'astra-honda'],
    sender: 'EGI Media Alerts <alerts@egimedia.co.id>',
    recipient: 'Arga Wijaya <arga.wijaya@astra.co.id>',
    subject: '[Prioritas Tinggi] Detail Ekspansi Kompetitor Dipublikasikan',
    preview: 'Nilai investasi sekitar Rp 450 miliar dan target operasional penuh Q4 2026 dipublikasikan.',
    sentAt: '2026-07-18T07:25:00+07:00',
    sentLabel: 'Hari ini · 07:25',
    read: false,
    priority: 'tinggi',
    issueId: 'issue-2',
    issueTitle: 'Kompetitor Regional Ekspansi ke Jawa Barat',
    change: 'Detail investasi sekitar Rp 450 miliar dan target operasional penuh Q4 2026 dipublikasikan.',
    impact: 'Tekanan kompetitif di wilayah Jawa Barat berpotensi meningkat lebih cepat dari proyeksi awal.'
  },
  {
    id: 'email-daily-1',
    type: 'ringkasan',
    companyIds: ['astra', 'united-tractors'],
    sender: 'EGI Media Alerts <alerts@egimedia.co.id>',
    recipient: 'Arga Wijaya <arga.wijaya@astra.co.id>',
    subject: 'Ringkasan 4 Perkembangan Penting — 18 Juli 2026',
    preview: 'Empat perkembangan penting sejak ringkasan terakhir tersedia untuk ditinjau.',
    sentAt: '2026-07-18T07:00:00+07:00',
    sentLabel: 'Hari ini · 07:00',
    read: true,
    intro: 'Berikut perkembangan penting sejak ringkasan terakhir.',
    items: [
      { issueId: 'issue-2', priority: 'tinggi', title: 'Kompetitor Regional Ekspansi ke Jawa Barat', change: 'Kompetitor mengumumkan rencana pusat distribusi baru di Jawa Barat.' },
      { issueId: 'issue-3', priority: 'sedang', title: 'Aturan Baru Sertifikasi Produk Mulai Berlaku', change: 'Regulator menetapkan masa transisi 90 hari untuk produk yang sudah beredar.' },
      { issueId: 'issue-4', priority: 'sedang', title: 'Permintaan Segmen Industri Menurun', change: 'Permintaan pada segmen inti menurun selama dua bulan berturut-turut.' },
      { issueId: 'issue-5', priority: 'sedang', title: 'Harga Bahan Baku Utama Kembali Meningkat', change: 'Harga bahan baku naik 8% dalam satu minggu dan mendekati batas biaya perusahaan.' }
    ]
  },
  {
    id: 'email-direct-3',
    type: 'langsung',
    companyIds: ['astra', 'united-tractors'],
    sender: 'EGI Media Alerts <alerts@egimedia.co.id>',
    recipient: 'Arga Wijaya <arga.wijaya@astra.co.id>',
    subject: '[Prioritas Tinggi] Tarif Impor Naik 15% Diumumkan Resmi',
    preview: 'Kenaikan tarif berlaku untuk kategori bahan baku terpilih.',
    sentAt: '2026-07-17T16:20:00+07:00',
    sentLabel: 'Kemarin · 16:20',
    read: true,
    priority: 'tinggi',
    issueId: 'issue-1',
    issueTitle: 'Tarif Impor Bahan Baku Naik 15%',
    change: 'Kenaikan tarif 15% diumumkan resmi dan berlaku untuk kategori bahan baku terpilih.',
    impact: 'Biaya pengadaan bahan baku impor berpotensi meningkat pada kontrak berikutnya.'
  },
  {
    id: 'email-daily-2',
    type: 'ringkasan',
    companyIds: ['astra', 'united-tractors', 'astra-honda'],
    sender: 'EGI Media Alerts <alerts@egimedia.co.id>',
    recipient: 'Arga Wijaya <arga.wijaya@astra.co.id>',
    subject: 'Ringkasan 3 Perkembangan Penting — 17 Juli 2026',
    preview: 'Tiga perkembangan penting terkait pasar, biaya, dan peluang pemasok.',
    sentAt: '2026-07-17T07:00:00+07:00',
    sentLabel: 'Kemarin · 07:00',
    read: true,
    intro: 'Berikut perkembangan penting sejak ringkasan terakhir.',
    items: [
      { issueId: 'issue-4', priority: 'sedang', title: 'Permintaan Segmen Industri Menurun', change: 'Permintaan pada segmen inti masih berada di bawah proyeksi.' },
      { issueId: 'issue-5', priority: 'sedang', title: 'Harga Bahan Baku Utama Kembali Meningkat', change: 'Harga energi dan bahan baku mulai menekan biaya operasional.' },
      { issueId: 'issue-6', priority: 'rendah', title: 'Peluang Pemasok Domestik Menguat', change: 'Pemasok domestik memperluas kapasitas untuk beberapa bahan baku strategis.' }
    ]
  }
];

EGI.reports = [
  {
    id: 'rep-d-1',
    type: 'harian',
    title: 'Laporan Harian — 18 Juli 2026',
    periodLabel: '18 Jul 2026',
    status: 'approved',
    issueCount: 3,
    updatedAt: 'Hari ini · 18:00',
    summary: 'Empat isu utama membutuhkan perhatian: tarif impor, ekspansi kompetitor, sertifikasi, dan permintaan industri.',
    highlights: [
      'Isu prioritas tinggi: tarif impor 15% dan ekspansi kompetitor di Jawa Barat.',
      'Dampak jangka dekat berfokus pada biaya produksi dan tekanan harga regional.',
      'Hal yang perlu dipantau besok: pedoman teknis sertifikasi dan respons pasar terhadap tarif.'
    ],
    comparison: null,
    risks: ['Margin tertekan jika biaya impor naik tanpa penyesuaian.', 'Pangsa pasar regional berisiko jika kompetitor agresif.'],
    opportunities: ['Evaluasi pemasok domestik sebagai opsi mitigasi.'],
    watch: ['Tanggal berlaku tarif', 'Jadwal operasional kompetitor', 'Status kepatuhan sertifikasi'],
    sources: ['Tarif Impor Bahan Baku Resmi Naik 15 Persen Mulai Agustus 2026', 'Kompetitor Regional Buka Dua Cabang Baru di Jawa Barat', 'Regulator Tetapkan Sertifikasi Produk Baru Berlaku Oktober 2026'],
    content: {
      executiveSummary: [
        'Pemerintah mempercepat pemberlakuan tarif impor bahan baku sebesar 15% dari September menjadi Agustus 2026.',
        'Kompetitor regional membuka dua cabang baru di Jawa Barat, salah satu wilayah operasional utama perusahaan.',
        'Regulasi sertifikasi produk baru mulai berlaku pada kuartal berikutnya dan dapat memengaruhi jadwal peluncuran produk.',
        'Risiko utama hari ini adalah kenaikan biaya produksi dan meningkatnya tekanan persaingan.',
        'Fokus pemantauan besok adalah daftar komoditas yang terkena tarif, respons pemasok, dan strategi harga kompetitor.'
      ],
      sections: [
        {
          title: 'Isu Paling Penting Hari Ini',
          type: 'issues',
          items: [
            { title: 'Tarif Impor Bahan Baku Naik 15%', priority: 'Tinggi', status: 'Berkembang', whatHappened: 'Pemerintah mempercepat pemberlakuan tarif impor bahan baku sebesar 15% dari September menjadi Agustus 2026.', whyImportant: 'Perusahaan masih bergantung pada bahan baku impor untuk operasional di Indonesia.', impact: 'Biaya produksi dapat meningkat satu bulan lebih cepat dari perkiraan sebelumnya.', risk: 'Margin keuntungan dapat menurun jika kenaikan biaya tidak diimbangi penyesuaian harga, efisiensi, atau pemasok alternatif.', watch: ['Daftar komoditas yang dikenai tarif', 'Respons pemasok utama', 'Pergerakan nilai tukar', 'Kemungkinan pengecualian kebijakan'] },
            { title: 'Kompetitor Regional Ekspansi ke Jawa Barat', priority: 'Tinggi', status: 'Berkembang', whatHappened: 'Kompetitor regional membuka dua cabang baru di Bandung dan Bekasi.', whyImportant: 'Kedua lokasi berada di wilayah operasional utama perusahaan dan menyasar segmen pelanggan yang sama.', impact: 'Persaingan harga dan perebutan pelanggan berpotensi meningkat.', risk: 'Perusahaan dapat kehilangan sebagian pelanggan jika kompetitor menawarkan harga promosi dan layanan yang lebih agresif.', watch: ['Harga promosi kompetitor', 'Target segmen pelanggan', 'Respons pelanggan perusahaan', 'Rencana ekspansi berikutnya'] },
            { title: 'Aturan Baru Sertifikasi Produk Mulai Berlaku', priority: 'Sedang', status: 'Dipantau', whatHappened: 'Regulator menetapkan kewajiban sertifikasi baru mulai 1 Oktober 2026.', whyImportant: 'Beberapa produk perusahaan masih dalam tahap persiapan dokumen kepatuhan.', impact: 'Peluncuran produk dapat tertunda jika proses sertifikasi belum selesai.', risk: 'Keterlambatan peluncuran dapat memengaruhi target penjualan kuartal keempat.', watch: ['Pedoman teknis regulator', 'Estimasi waktu proses sertifikasi', 'Kesiapan dokumen internal', 'Kapasitas lembaga sertifikasi'] }
          ]
        },
        {
          title: 'Dampak terhadap Perusahaan',
          type: 'categories',
          items: [
            { title: 'Operasional', items: ['Tim pengadaan perlu memperbarui simulasi biaya bahan baku.', 'Tim kepatuhan perlu mempercepat persiapan sertifikasi.', 'Tim penjualan perlu memantau respons pelanggan di Jawa Barat.'] },
            { title: 'Keuangan', items: ['Potensi kenaikan biaya bahan baku sebesar 15%.', 'Margin dapat tertekan jika harga jual tidak disesuaikan.', 'Biaya promosi dapat meningkat untuk mempertahankan pasar Jawa Barat.'] },
            { title: 'Pasar dan Pelanggan', items: ['Tekanan persaingan meningkat di wilayah utama.', 'Pelanggan berpotensi membandingkan harga dan layanan dengan kompetitor baru.'] }
          ]
        },
        {
          title: 'Risiko dan Peluang',
          type: 'risk-opportunity',
          risks: ['Kenaikan biaya produksi.', 'Penurunan margin.', 'Penundaan peluncuran produk.', 'Kehilangan pelanggan di Jawa Barat.'],
          opportunities: ['Negosiasi ulang dengan pemasok lokal.', 'Percepatan diversifikasi sumber bahan baku.', 'Penguatan program loyalitas pelanggan.', 'Penyesuaian positioning produk sebelum regulasi berlaku.'],
          assumptions: ['Volume impor perusahaan tidak berubah dalam satu bulan ke depan.', 'Kompetitor menggunakan strategi harga promosi untuk fase awal ekspansi.']
        },
        { title: 'Hal yang Perlu Dipantau Besok', type: 'bullets', items: ['Pengumuman daftar komoditas yang terkena tarif impor.', 'Respons dua pemasok utama terhadap perubahan kebijakan.', 'Harga pembukaan cabang kompetitor di Jawa Barat.', 'Pedoman teknis sertifikasi dari regulator.', 'Perubahan nilai tukar rupiah terhadap dolar AS.'] },
        { title: 'Daftar Sumber', type: 'sources', items: ['Tarif Impor Bahan Baku Resmi Naik 15 Persen Mulai Agustus 2026 — EGI Media, 18 Juli 2026.', 'Kompetitor Regional Buka Dua Cabang Baru di Jawa Barat — EGI Media, 18 Juli 2026.', 'Regulator Tetapkan Sertifikasi Produk Baru Berlaku Oktober 2026 — EGI Media, 18 Juli 2026.'] }
      ]
    }
  },
  {
    id: 'rep-d-2',
    type: 'harian',
    title: 'Laporan Harian — 17 Juli 2026',
    periodLabel: '17 Jul 2026',
    status: 'shared',
    issueCount: 3,
    updatedAt: 'Kemarin · 07:45',
    summary: 'Fokus pada permintaan industri yang menurun dan fluktuasi harga energi.',
    highlights: [
      'Permintaan segmen industri turun sekitar 4% MoM.',
      'Harga energi industri naik tipis sekitar 3%.'
    ],
    comparison: null,
    risks: ['Forecast penjualan kuartal berisiko meleset.'],
    opportunities: [],
    watch: ['Order masuk pelanggan utama'],
    sources: ['Permintaan Manufaktur...', 'Harga Energi Industri...']
  },
  {
    id: 'rep-d-3',
    type: 'harian',
    title: 'Laporan Harian — 16 Juli 2026',
    periodLabel: '16 Jul 2026',
    status: 'in-review',
    issueCount: 2,
    updatedAt: '16 Jul · 09:10',
    summary: 'Draf laporan harian menunggu review analyst sebelum dibagikan.',
    highlights: ['Ekspansi kompetitor ke Jawa Barat menjadi isu baru prioritas tinggi.'],
    comparison: null,
    risks: ['Tekanan kompetitif regional.'],
    opportunities: [],
    watch: ['Detail investasi kompetitor'],
    sources: ['Ekspansi Kompetitor Jabar...']
  },
  {
    id: 'rep-w-1',
    type: 'mingguan',
    title: 'Laporan Mingguan — 13–19 Juli 2026',
    periodLabel: '13–19 Jul 2026',
    status: 'in-review',
    issueCount: 6,
    updatedAt: '19 Jul · 18:00',
    summary: 'Minggu ini perhatian utama bergeser dari isu permintaan pasar menuju regulasi, biaya bahan baku, dan ekspansi kompetitor.',
    highlights: [
      '2 isu baru prioritas tinggi muncul minggu ini.',
      'Fokus risiko bergeser dari permintaan ke biaya dan kompetisi.',
      '1 isu selesai; 3 isu masuk status dipantau.'
    ],
    comparison: {
      prevLabel: '6–12 Jul 2026',
      newIssues: 2,
      worsened: 1,
      improved: 1,
      closed: 1,
      highPriority: { current: 2, previous: 1 }
    },
    risks: ['Biaya impor dan tekanan harga regional meningkat.'],
    opportunities: ['Diversifikasi pemasok domestik.'],
    watch: ['Implementasi tarif', 'Respons kompetitor', 'Kepatuhan sertifikasi'],
    sources: ['Tarif Impor Bahan Baku Resmi Naik 15 Persen Mulai Agustus 2026', 'Kompetitor Regional Buka Dua Cabang Baru di Jawa Barat', 'Regulator Tetapkan Sertifikasi Produk Baru Berlaku Oktober 2026', 'Harga Bahan Baku Lokal Naik 8 Persen dalam Satu Minggu', 'Permintaan Segmen Industri Turun untuk Bulan Kedua', 'Distribusi Jawa Tengah Kembali Normal'],
    content: {
      executiveSummary: ['Minggu ini perhatian utama bergeser dari isu permintaan pasar menuju regulasi, biaya bahan baku, dan ekspansi kompetitor.', 'Jumlah isu prioritas tinggi naik dari dua menjadi tiga.', 'Risiko biaya produksi meningkat setelah pemerintah mempercepat pemberlakuan tarif impor, sementara kompetitor memperluas operasi ke Jawa Barat.', 'Peluang diversifikasi pemasok dan penguatan loyalitas pelanggan mulai terlihat.'],
      sections: [
        { title: 'Perkembangan Utama Minggu Ini', type: 'categories', items: [
          { title: 'Isu Baru', items: ['Tarif impor bahan baku naik 15%.', 'Aturan sertifikasi produk baru diumumkan.', 'Kompetitor membuka dua cabang di Jawa Barat.'] },
          { title: 'Isu Berkembang', items: ['Penurunan permintaan segmen industri berlanjut selama dua bulan.', 'Harga bahan baku lokal naik 8% dalam satu minggu.'] },
          { title: 'Isu Selesai', items: ['Gangguan distribusi di Jawa Tengah selesai setelah operasional pemasok kembali normal.'] }
        ] },
        { title: 'Perubahan Dibanding Minggu Sebelumnya', type: 'comparison', columns: ['Area', 'Minggu Sebelumnya', 'Minggu Ini', 'Perubahan'], rows: [
          ['Isu prioritas tinggi', '2 isu', '3 isu', 'Meningkat'], ['Fokus utama', 'Permintaan pasar', 'Regulasi dan biaya', 'Bergeser'], ['Risiko biaya produksi', 'Sedang', 'Tinggi', 'Memburuk'], ['Persaingan Jawa Barat', 'Stabil', 'Meningkat', 'Memburuk'], ['Gangguan distribusi', 'Aktif', 'Selesai', 'Membaik']
        ], changes: { new: ['Pemberlakuan tarif impor dipercepat.', 'Kompetitor masuk ke dua kota utama.', 'Tenggat sertifikasi produk ditetapkan.'], worsened: ['Tekanan biaya bahan baku.', 'Risiko penurunan margin.', 'Persaingan di Jawa Barat.'], improved: ['Distribusi di Jawa Tengah kembali normal.', 'Waktu pengiriman pemasok utama kembali sesuai target.'] } },
        { title: 'Tren dan Pola Penting', type: 'paragraphs', items: [
          { title: 'Regulasi Semakin Dominan', text: 'Tiga berita regulasi muncul dalam satu minggu, dibanding satu berita pada minggu sebelumnya. Hal ini menunjukkan bahwa kepatuhan mulai menjadi faktor penting terhadap biaya dan jadwal peluncuran produk.' },
          { title: 'Tekanan Biaya Meningkat', text: 'Tarif impor dan kenaikan harga bahan baku lokal terjadi pada periode yang sama. Kombinasi ini dapat mempersempit pilihan perusahaan dalam menjaga biaya produksi.' },
          { title: 'Kompetitor Semakin Agresif', text: 'Ekspansi ke Jawa Barat menunjukkan kompetitor mulai masuk lebih dekat ke pasar utama perusahaan, bukan hanya memperkuat wilayah asalnya.' }
        ] },
        { title: 'Dampak terhadap Perusahaan', type: 'categories', items: [
          { title: 'Keuangan', items: ['Biaya bahan baku berpotensi meningkat.', 'Margin keuntungan berada dalam tekanan.', 'Anggaran promosi mungkin perlu ditambah.'] },
          { title: 'Operasional', items: ['Tim pengadaan perlu meninjau pemasok alternatif.', 'Tim kepatuhan perlu mempercepat proses sertifikasi.', 'Tim penjualan perlu menyesuaikan strategi wilayah Jawa Barat.'] },
          { title: 'Strategi', items: ['Ketergantungan terhadap bahan baku impor menjadi lebih berisiko.', 'Perusahaan perlu memperkuat diferensiasi terhadap kompetitor.', 'Jadwal peluncuran produk perlu disesuaikan dengan kesiapan sertifikasi.'] }
        ] },
        { title: 'Risiko dan Peluang', type: 'risk-opportunity', risks: ['Kenaikan biaya produksi.', 'Penurunan margin.', 'Keterlambatan peluncuran produk.', 'Kehilangan pelanggan di Jawa Barat.', 'Meningkatnya ketergantungan pada pemasok tertentu.'], opportunities: ['Mempercepat kerja sama dengan pemasok lokal.', 'Meninjau ulang kontrak jangka panjang dengan pemasok.', 'Memperkuat program retensi pelanggan.', 'Menyesuaikan portofolio produk sebelum aturan berlaku.', 'Menggunakan pemulihan distribusi Jawa Tengah untuk memperbaiki tingkat layanan.'] },
        { title: 'Prioritas Pemantauan Minggu Depan', type: 'bullets', items: ['Keputusan final daftar komoditas tarif impor.', 'Perubahan harga pemasok utama.', 'Strategi harga kompetitor di Jawa Barat.', 'Pedoman teknis sertifikasi produk.', 'Perubahan permintaan pelanggan industri.', 'Pergerakan nilai tukar rupiah.'] },
        { title: 'Opsi Tindak Lanjut untuk Dipertimbangkan', type: 'bullets', items: ['Menjalankan simulasi tiga skenario biaya bahan baku.', 'Menghubungi pemasok lokal alternatif.', 'Menyusun respons komersial untuk wilayah Jawa Barat.', 'Menetapkan tim percepatan sertifikasi.'] },
        { title: 'Daftar Sumber', type: 'sources', items: ['Tarif Impor Bahan Baku Resmi Naik 15 Persen Mulai Agustus 2026 — EGI Media, 18 Juli 2026.', 'Kompetitor Regional Buka Dua Cabang Baru di Jawa Barat — EGI Media, 18 Juli 2026.', 'Regulator Tetapkan Sertifikasi Produk Baru Berlaku Oktober 2026 — EGI Media, 18 Juli 2026.', 'Harga Bahan Baku Lokal Naik 8 Persen dalam Satu Minggu — EGI Media, 17 Juli 2026.', 'Permintaan Segmen Industri Turun untuk Bulan Kedua — EGI Media, 16 Juli 2026.', 'Distribusi Jawa Tengah Kembali Normal — EGI Media, 15 Juli 2026.'] }
      ]
    }
  },
  {
    id: 'rep-w-2',
    type: 'mingguan',
    title: 'Laporan Mingguan — 5–11 Juli 2026',
    periodLabel: '5–11 Jul 2026',
    status: 'shared',
    issueCount: 4,
    updatedAt: '11 Jul · 18:00',
    summary: 'Minggu sebelumnya relatif stabil dengan fokus pada peluang rantai pasok domestik.',
    highlights: ['Isu peluang pemasok domestik mulai naik peringkat.'],
    comparison: {
      prevLabel: '28 Jun–4 Jul 2026',
      newIssues: 1,
      worsened: 0,
      improved: 2,
      closed: 1,
      highPriority: { current: 1, previous: 2 }
    },
    risks: ['Ketergantungan impor masih tinggi.'],
    opportunities: ['Kapasitas pemasok lokal meningkat.'],
    watch: ['Negosiasi awal dengan pemasok baru'],
    sources: ['Pemasok Domestik Perluas Kapasitas...']
  },
  {
    id: 'rep-m-1',
    type: 'bulanan',
    title: 'Laporan Bulanan — Juni 2026',
    periodLabel: 'Juni 2026',
    status: 'approved',
    issueCount: 12,
    updatedAt: '5 Jul · 09:00',
    summary: 'Juni menunjukkan pola isu berulang pada regulasi dan biaya input, dengan peluang pada rantai pasok domestik.',
    highlights: [
      'Risiko regulasi meningkat dibanding Mei.',
      'Aktivitas kompetitor regional meningkat.',
      'Peluang strategis: diversifikasi pemasok dalam negeri.'
    ],
    comparison: {
      prevLabel: 'Mei 2026',
      recurring: 3,
      riskUp: 2,
      riskDown: 1,
      market: 'Permintaan industri mulai melambat di akhir bulan.',
      competitor: 'Satu kompetitor utama mengumumkan rencana ekspansi.',
      regulation: 'Dua aturan baru terkait sertifikasi dan tarif dalam persiapan.'
    },
    risks: ['Akumulasi tekanan biaya input.', 'Persaingan regional meningkat.'],
    opportunities: ['Kemitraan rantai pasok domestik.', 'Penyesuaian portofolio produk.'],
    watch: ['Implementasi kebijakan Juli', 'Tren permintaan Q3'],
    sources: ['Arsip isu Juni 2026']
  },
  {
    id: 'rep-m-2',
    type: 'bulanan',
    title: 'Laporan Bulanan — Mei 2026',
    periodLabel: 'Mei 2026',
    status: 'shared',
    issueCount: 9,
    updatedAt: '3 Jun · 10:00',
    summary: 'Mei relatif lebih tenang dengan fokus pada efisiensi operasional dan pemantauan pasar.',
    highlights: ['Risiko kompetitor masih rendah.', 'Tidak ada lonjakan regulasi material.'],
    comparison: {
      prevLabel: 'April 2026',
      recurring: 2,
      riskUp: 0,
      riskDown: 2,
      market: 'Permintaan stabil.',
      competitor: 'Tidak ada ekspansi besar.',
      regulation: 'Status quo.'
    },
    risks: [],
    opportunities: ['Optimasi biaya operasional.'],
    watch: ['Indikator awal permintaan Juni'],
    sources: ['Arsip isu Mei 2026']
  },
  {
    id: 'rep-m-3',
    type: 'bulanan',
    title: 'Laporan Bulanan — Juli 2026',
    periodLabel: 'Juli 2026',
    status: 'approved',
    issueCount: 18,
    updatedAt: '31 Jul · 18:00',
    summary: 'Pada Juli 2026, risiko perusahaan meningkat terutama akibat regulasi baru, kenaikan biaya bahan baku, dan ekspansi kompetitor ke wilayah utama.',
    highlights: ['Fokus risiko bergeser dari operasional ke regulasi dan biaya.', 'Persaingan meningkat di Jawa Barat.', 'Peluang substitusi pemasok mulai terbuka.'],
    comparison: {
      prevLabel: 'Juni 2026',
      recurring: 3,
      riskUp: 2,
      riskDown: 1,
      market: 'Permintaan segmen industri turun, segmen menengah tetap stabil.',
      competitor: 'Kompetitor membuka dua cabang baru dan menawarkan diskon tiga bulan.',
      regulation: 'Tarif impor dan sertifikasi produk menjadi risiko utama.'
    },
    risks: ['Akumulasi tekanan biaya input.', 'Persaingan regional meningkat.'],
    opportunities: ['Kemitraan rantai pasok domestik.', 'Penyesuaian portofolio produk.'],
    watch: ['Implementasi kebijakan Juli', 'Tren permintaan Q3'],
    sources: ['Tarif Impor Bahan Baku Resmi Naik 15 Persen Mulai Agustus 2026', 'Harga Bahan Baku Lokal Naik 8 Persen dalam Satu Minggu', 'Kompetitor Regional Buka Dua Cabang Baru di Jawa Barat', 'Kompetitor Tawarkan Diskon Tiga Bulan untuk Pasar Jawa Barat', 'Regulator Tetapkan Sertifikasi Produk Baru Berlaku Oktober 2026', 'Permintaan Segmen Industri Turun untuk Bulan Kedua', 'Distribusi Jawa Tengah Kembali Normal'],
    content: {
      executiveSummary: ['Pada Juli 2026, risiko perusahaan meningkat terutama akibat regulasi baru, kenaikan biaya bahan baku, dan ekspansi kompetitor ke wilayah utama.', 'Dibanding Juni, jumlah isu prioritas tinggi naik dari empat menjadi tujuh.', 'Tekanan terbesar berasal dari kebijakan tarif impor, kewajiban sertifikasi produk, dan kenaikan harga bahan baku lokal.', 'Peluang utama terdapat pada diversifikasi pemasok, percepatan kepatuhan, dan penguatan posisi pasar di Jawa Barat.'],
      sections: [
        { title: 'Gambaran Umum Bulan Ini', type: 'metrics', columns: ['Indikator', 'Juni 2026', 'Juli 2026', 'Perubahan'], rows: [
          ['Total isu aktif', '12', '18', 'Naik 6'], ['Isu prioritas tinggi', '4', '7', 'Naik 3'], ['Isu regulasi', '2', '5', 'Naik 3'], ['Isu kompetitor', '3', '4', 'Naik 1'], ['Isu operasional', '5', '3', 'Turun 2'], ['Isu selesai', '6', '8', 'Naik 2']
        ], summary: ['Fokus risiko bergeser dari operasional ke regulasi dan biaya.', 'Persaingan meningkat di Jawa Barat.', 'Risiko distribusi menurun dibanding bulan sebelumnya.', 'Peluang substitusi pemasok mulai terbuka.'] },
        { title: 'Perkembangan Utama per Kategori', type: 'categories', items: [
          { title: 'Regulasi', items: ['Tarif impor bahan baku naik 15%.', 'Pemberlakuan tarif dipercepat menjadi Agustus 2026.', 'Aturan sertifikasi produk baru berlaku Oktober 2026.', 'Regulator memperketat pelaporan produk tertentu.'], impact: 'Biaya dan beban kepatuhan meningkat. Jadwal peluncuran produk berpotensi terdampak.' },
          { title: 'Pasar', items: ['Permintaan segmen industri turun selama dua bulan.', 'Pelanggan mulai menunda pembelian dalam jumlah besar.', 'Permintaan segmen menengah tetap stabil.'], impact: 'Target penjualan segmen industri menghadapi tekanan, tetapi segmen menengah masih dapat menjadi penyangga.' },
          { title: 'Kompetitor', items: ['Kompetitor membuka dua cabang baru di Jawa Barat.', 'Kompetitor meluncurkan program diskon tiga bulan.', 'Kompetitor memperluas kerja sama dengan distributor lokal.'], impact: 'Tekanan harga dan perebutan pelanggan meningkat pada wilayah utama.' },
          { title: 'Operasional', items: ['Gangguan distribusi Jawa Tengah selesai.', 'Waktu pengiriman pemasok utama kembali normal.', 'Kapasitas gudang tetap stabil.'], impact: 'Risiko operasional jangka pendek menurun dibanding Juni.' }
        ] },
        { title: 'Perbandingan dengan Bulan Sebelumnya', type: 'changes', changes: { new: ['Tarif impor baru.', 'Sertifikasi produk baru.', 'Ekspansi kompetitor ke Jawa Barat.'], worsened: ['Risiko biaya produksi.', 'Tekanan margin.', 'Persaingan harga.', 'Ketidakpastian jadwal peluncuran produk.'], improved: ['Distribusi wilayah Jawa Tengah.', 'Ketepatan waktu pemasok utama.', 'Ketersediaan kapasitas gudang.'] }, summary: ['Pada Juni, perhatian utama berada pada distribusi dan permintaan.', 'Pada Juli, fokus bergeser ke regulasi, biaya, dan persaingan.'] },
        { title: 'Tren Bulanan', type: 'paragraphs', items: [
          { title: 'Regulasi Menjadi Risiko Strategis', text: 'Jumlah berita regulasi meningkat dari dua menjadi lima. Regulasi mulai berdampak langsung pada biaya, produk, dan jadwal peluncuran.' },
          { title: 'Ketergantungan Impor Semakin Berisiko', text: 'Kenaikan tarif impor dan harga bahan baku lokal mempersempit pilihan perusahaan. Ketergantungan pada satu jenis sumber bahan baku meningkatkan risiko biaya.' },
          { title: 'Persaingan Bergeser ke Wilayah Utama', text: 'Kompetitor mulai masuk ke pasar utama perusahaan, bukan hanya memperkuat wilayah asalnya.' },
          { title: 'Risiko Operasional Menurun', text: 'Gangguan distribusi yang mendominasi Juni mulai selesai pada Juli sehingga perusahaan dapat memfokuskan perhatian pada isu strategis.' }
        ] },
        { title: 'Dampak terhadap Perusahaan', type: 'categories', items: [
          { title: 'Pendapatan', items: ['Penurunan permintaan segmen industri dapat menekan target penjualan.', 'Ekspansi kompetitor dapat memengaruhi pangsa pasar Jawa Barat.'] },
          { title: 'Biaya', items: ['Tarif impor dan kenaikan harga lokal berpotensi meningkatkan biaya bahan baku.', 'Biaya kepatuhan dan sertifikasi bertambah.'] },
          { title: 'Operasional', items: ['Distribusi membaik.', 'Pengadaan bahan baku membutuhkan alternatif baru.'] },
          { title: 'Strategi', items: ['Perusahaan perlu mengurangi ketergantungan impor.', 'Diferensiasi produk dan layanan perlu diperkuat.', 'Strategi wilayah Jawa Barat perlu ditinjau ulang.'] },
          { title: 'Reputasi dan Kepatuhan', items: ['Keterlambatan sertifikasi dapat memengaruhi kepercayaan pasar.', 'Ketidaksiapan dokumen dapat meningkatkan risiko kepatuhan.'] }
        ] },
        { title: 'Risiko Strategis', type: 'strategic-risks', items: [
          { title: 'Risiko Kenaikan Biaya', level: 'Tinggi', basis: 'Tarif impor naik 15% dan harga bahan baku lokal naik 8%.', impacts: ['Margin menurun.', 'Harga jual perlu disesuaikan.', 'Anggaran produksi meningkat.'] },
          { title: 'Risiko Kehilangan Pangsa Pasar Jawa Barat', level: 'Tinggi', basis: 'Kompetitor membuka dua cabang dan menawarkan diskon tiga bulan.', impacts: ['Pelanggan berpindah.', 'Biaya promosi meningkat.', 'Tekanan harga bertambah.'] },
          { title: 'Risiko Keterlambatan Produk', level: 'Sedang', basis: 'Aturan sertifikasi berlaku Oktober 2026.', impacts: ['Jadwal peluncuran mundur.', 'Target penjualan kuartal keempat terganggu.'] }
        ], assumptions: ['Tidak ada penundaan penerapan regulasi.', 'Volume impor perusahaan tetap stabil.', 'Kompetitor mempertahankan strategi harga agresif selama tiga bulan.'] },
        { title: 'Peluang Strategis', type: 'paragraphs', items: [
          { title: 'Diversifikasi Pemasok', text: 'Perusahaan dapat mempercepat evaluasi pemasok lokal dan regional untuk mengurangi ketergantungan impor.' },
          { title: 'Penguatan Segmen Menengah', text: 'Permintaan segmen menengah masih stabil dan dapat menjadi fokus pertumbuhan jangka dekat.' },
          { title: 'Program Loyalitas Pelanggan', text: 'Ekspansi kompetitor dapat direspons melalui program retensi, peningkatan layanan, dan penawaran khusus.' },
          { title: 'Percepatan Kepatuhan', text: 'Perusahaan yang lebih cepat memenuhi sertifikasi dapat memperoleh keuntungan waktu dibanding pesaing.' }
        ] },
        { title: 'Fokus Bulan Berikutnya', type: 'bullets', items: ['Dampak aktual tarif impor terhadap harga pemasok.', 'Perubahan margin produk utama.', 'Respons pelanggan terhadap harga baru.', 'Perkembangan ekspansi kompetitor di Jawa Barat.', 'Progres sertifikasi produk.', 'Ketersediaan pemasok alternatif.', 'Perubahan permintaan segmen industri.', 'Pergerakan nilai tukar.'] },
        { title: 'Opsi Tindak Lanjut untuk Dipertimbangkan', type: 'bullets', items: ['Menetapkan target diversifikasi pemasok.', 'Menjalankan simulasi harga jual baru.', 'Menyusun program perlindungan pelanggan Jawa Barat.', 'Membentuk tim percepatan sertifikasi.', 'Meninjau ulang target penjualan segmen industri.'] },
        { title: 'Daftar Sumber', type: 'sources', items: ['Tarif Impor Bahan Baku Resmi Naik 15 Persen Mulai Agustus 2026 — EGI Media, 18 Juli 2026.', 'Harga Bahan Baku Lokal Naik 8 Persen dalam Satu Minggu — EGI Media, 17 Juli 2026.', 'Kompetitor Regional Buka Dua Cabang Baru di Jawa Barat — EGI Media, 18 Juli 2026.', 'Kompetitor Tawarkan Diskon Tiga Bulan untuk Pasar Jawa Barat — EGI Media, 22 Juli 2026.', 'Regulator Tetapkan Sertifikasi Produk Baru Berlaku Oktober 2026 — EGI Media, 18 Juli 2026.', 'Permintaan Segmen Industri Turun untuk Bulan Kedua — EGI Media, 16 Juli 2026.', 'Distribusi Jawa Tengah Kembali Normal — EGI Media, 15 Juli 2026.'] }
      ]
    }
  }
];

EGI.saved = {
  issues: ['issue-2', 'issue-4'],
  alerts: [],
  reports: ['rep-d-1', 'rep-w-1']
};

EGI.team = [
  { id: 'u1', name: 'Arga Wijaya', email: 'arga.wijaya@astra.co.id', role: 'CEO/C-Level', status: 'active', lastActive: 'Online' },
  { id: 'u2', name: 'Nadia Prameswari', email: 'nadia.prameswari@astra.co.id', role: 'Direktur', status: 'active', lastActive: '2 jam lalu' },
  { id: 'u3', name: 'Fajar Aditya', email: 'fajar.aditya@astra.co.id', role: 'Analyst', status: 'active', lastActive: '30 mnt lalu' },
  { id: 'u4', name: 'Sinta Lestari', email: 'sinta.lestari@astra.co.id', role: 'Admin', status: 'active', lastActive: 'Kemarin' },
  { id: 'u5', name: 'Raka Nugraha', email: 'raka.nugraha@united-tractors.co.id', role: 'Direktur', status: 'inactive', lastActive: '12 Jul 2026' }
];

EGI.companyContext = {
  name: 'Astra International',
  description: 'Grup usaha diversifikasi dengan portofolio otomotif, jasa keuangan, alat berat, agribisnis, infrastruktur, dan teknologi digital di Indonesia.',
  industry: 'Holding & Diversifikasi',
  subIndustry: 'Otomotif, jasa keuangan, dan infrastruktur',
  products: 'Distribusi kendaraan, pembiayaan, alat berat, agribisnis, layanan digital',
  customers: 'Konsumen ritel, korporasi B2B, mitra dealer dan distributor',
  regions: 'Nasional — fokus Jawa, Sumatera, Kalimantan, dan Sulawesi',
  competitors: 'Grup otomotif regional, pemain pembiayaan, kompetitor alat berat',
  priorities: 'Efisiensi operasional, ekspansi layanan digital, retensi pelanggan kunci',
  goals: 'Pertumbuhan pendapatan berkelanjutan dan diversifikasi portofolio',
  risks: 'Siklus industri otomotif, tekanan suku bunga, perubahan regulasi',
  topics: 'Tarif impor, regulasi industri, kompetitor regional, harga energi, permintaan pasar',
  dependencies: 'Jaringan dealer, rantai pasok komponen, mitra pembiayaan',
  updatedAt: '10 Jul 2026, 14:20',
  updatedBy: 'Sinta Lestari (Admin)',
  source: 'Onboarding perusahaan + pembaruan manual Q2 2026'
};

EGI.notifications = {
  highAlert: true,
  dailyDigest: true,
  weeklyReport: true,
  monthlyReport: false,
  sendTime: '07:00',
  timezone: 'Asia/Jakarta',
  emailChannel: true
};

EGI.billing = {
  plan: 'Enterprise',
  status: 'Aktif',
  renewalDate: '18 Agustus 2026',
  paymentMethod: 'Visa •••• 4242',
  seats: '12 / 20 pengguna',
  price: 'Rp 28.500.000 / bulan',
  invoices: [
    { id: 'INV-2026-06', date: '18 Jun 2026', amount: 'Rp 28.500.000', status: 'Lunas' },
    { id: 'INV-2026-05', date: '18 Mei 2026', amount: 'Rp 28.500.000', status: 'Lunas' },
    { id: 'INV-2026-04', date: '18 Apr 2026', amount: 'Rp 28.500.000', status: 'Lunas' }
  ]
};

EGI.state = {
  activeCompanyId: 'astra',
  onboardingComplete: false,
  unreadAlerts: function () {
    return EGI.alerts.filter(function (a) { return !a.read && !a.completed; }).length;
  }
};
