# Blueprint Kebutuhan CEO  
## AI-Powered News Dashboard EGI Media

**Versi:** 1.0  
**Status:** Hasil research and gathering kebutuhan pengguna  
**Persona utama:** CEO / C-Level  
**Tujuan dokumen:** Menjadi acuan desain produk, UI/UX, business rule, dan pengembangan aplikasi agar implementasi tetap sesuai dengan kebutuhan CEO.

---

# 1. Latar Belakang

CEO tidak membutuhkan lebih banyak berita. CEO membutuhkan bantuan untuk:

- Mengetahui isu yang paling penting bagi perusahaan.
- Memahami alasan suatu isu perlu diperhatikan.
- Memahami potensi dampak dan risiko terhadap perusahaan.
- Mengetahui perkembangan terbaru tanpa membaca seluruh artikel.
- Memeriksa sumber informasi ketika diperlukan.
- Mendapatkan bahan pertimbangan untuk menentukan tindak lanjut.

Dashboard ini merupakan produk khusus perusahaan dan terpisah dari web berita publik EGI Media.

Sumber utama informasi tetap berasal dari berita yang dipublikasikan oleh tim editorial EGI Media.

---

# 2. Prinsip Utama Produk

## 2.1 Fokus pada perhatian manajemen

Produk harus membantu CEO menjawab lima pertanyaan utama:

1. Apa yang terjadi?
2. Mengapa hal ini penting bagi perusahaan?
3. Apa potensi dampaknya?
4. Apa risikonya?
5. Apa yang perlu dipantau selanjutnya?

## 2.2 Bukan pengganti pengambilan keputusan

Sistem berfungsi sebagai **decision-support**, bukan pengambil keputusan.

Sistem membantu CEO:

- Menentukan isu yang membutuhkan perhatian.
- Memahami konteks dan dampak.
- Melihat risiko dan peluang.
- Mengetahui perkembangan yang perlu dipantau.
- Mendapatkan beberapa opsi tindak lanjut.

Keputusan akhir dan persetujuan tindakan tetap berada pada manusia.

## 2.3 Informasi harus ringkas terlebih dahulu

CEO harus dapat memahami kondisi utama melalui satu layar tanpa membaca penjelasan panjang.

Detail hanya ditampilkan ketika pengguna membuka sebuah isu.

## 2.4 Hasil harus dapat dipercaya

Setiap fakta dan analisis harus dapat ditelusuri kembali ke artikel sumber EGI Media.

Fakta, analisis, dan asumsi tidak boleh dicampurkan.

## 2.5 Analisis harus spesifik terhadap perusahaan

Sistem tidak hanya merangkum berita. Sistem harus menjelaskan hubungan berita dengan kondisi perusahaan pengguna.

---

# 3. User Story CEO yang Menjadi Acuan

- Sebagai CEO saya ingin mengetahui berita yang paling relevan bagi perusahaan, karena saya tidak punya waktu membaca seluruh informasi.
- Sebagai CEO saya ingin mengetahui isu yang paling prioritas, karena tidak semua berita membutuhkan perhatian langsung.
- Sebagai CEO saya ingin memahami dampak sebuah berita terhadap perusahaan, karena informasi tanpa konteks belum cukup untuk mengambil keputusan.
- Sebagai CEO saya ingin mengetahui risiko yang mungkin muncul, karena saya perlu mengantisipasi masalah sebelum berdampak besar.
- Sebagai CEO saya ingin menerima alert untuk isu penting, karena informasi yang terlambat dapat menyebabkan kerugian atau kehilangan peluang.
- Sebagai CEO saya ingin melihat informasi yang sesuai dengan industri dan wilayah operasi perusahaan, karena informasi umum sering tidak relevan.
- Sebagai CEO saya ingin memahami alasan suatu berita dianggap penting, karena saya perlu menilai dasar analisisnya.
- Sebagai CEO saya ingin melihat sumber dari setiap insight, karena saya perlu memastikan informasi dapat dipercaya.
- Sebagai CEO saya ingin menerima ringkasan perkembangan harian, karena saya perlu mengetahui isu penting tanpa membaca banyak artikel.
- Sebagai CEO saya ingin menerima laporan mingguan, karena saya perlu melihat pola dan perubahan selama satu minggu.
- Sebagai CEO saya ingin menerima laporan bulanan, karena saya perlu mengevaluasi tren strategis dalam periode yang lebih panjang.
- Sebagai CEO saya ingin membandingkan perkembangan dengan periode sebelumnya, karena saya perlu memahami arah perubahan.
- Sebagai CEO saya ingin mengetahui hal yang perlu dipantau berikutnya, karena keputusan tidak berhenti pada kondisi saat ini.
- Sebagai CEO saya ingin informasi dipisahkan antara fakta dan interpretasi, karena saya perlu mengetahui mana data dan mana analisis.
- Sebagai CEO saya ingin laporan dapat direview sebelum dibagikan, karena informasi untuk manajemen harus akurat dan terkontrol.
- Sebagai CEO saya ingin informasi dapat dibagikan kepada jajaran manajemen, karena keputusan membutuhkan pemahaman yang selaras.
- Sebagai CEO saya ingin hasil analisis disesuaikan dengan profil perusahaan, karena berita yang sama dapat memiliki dampak berbeda bagi setiap perusahaan.
- Sebagai CEO saya ingin dapat memberi feedback terhadap relevansi insight, karena sistem perlu semakin memahami kebutuhan perusahaan.
- Sebagai CEO saya ingin informasi penting tersimpan dan mudah ditemukan kembali, karena isu lama dapat menjadi referensi untuk keputusan berikutnya.
- Sebagai CEO saya ingin akses informasi dibatasi sesuai jabatan, karena data strategis perusahaan tidak boleh diakses sembarang orang.

---

# 4. Ekspektasi Pengalaman Utama

## 4.1 Tampilan awal

Ketika membuka dashboard, CEO ingin langsung melihat maksimal **3–5 isu terpenting**.

Dashboard tidak boleh langsung menampilkan seluruh berita atau seluruh analisis.

Urutan isu harus berdasarkan prioritas, dari yang paling penting.

## 4.2 Informasi minimum pada daftar isu

Setiap isu pada tampilan awal cukup menampilkan:

- Judul isu.
- Tingkat prioritas.
- Ringkasan satu kalimat.
- Waktu pembaruan terakhir.

Informasi berikut tidak perlu langsung ditampilkan:

- Penjelasan dampak lengkap.
- Risiko lengkap.
- Fakta pendukung.
- Analisis mendalam.
- Daftar seluruh sumber.
- Riwayat perkembangan isu.

Informasi tersebut baru muncul ketika isu dibuka.

## 4.3 Penekanan visual

- Isu prioritas tertinggi harus paling mudah dikenali.
- Informasi penting tidak boleh bergantung pada warna saja.
- Prioritas perlu disertai label teks.
- Tampilan harus tetap mudah dipindai dalam beberapa detik.
- Jangan memenuhi layar dengan terlalu banyak grafik atau angka.

---

# 5. Standard Ringkasan Satu Kalimat

## 5.1 Tujuan

Ringkasan satu kalimat membantu CEO memahami:

- Apa yang terjadi.
- Mengapa hal tersebut relevan bagi perusahaan.

## 5.2 Format yang disarankan

> **[Peristiwa utama] berpotensi [dampak utama] bagi perusahaan karena [hubungan dengan bisnis perusahaan].**

## 5.3 Contoh

> Pemerintah menaikkan tarif impor bahan baku sebesar 15%, yang berpotensi meningkatkan biaya produksi perusahaan dalam beberapa bulan ke depan.

## 5.4 Rule penggunaan metrik

Metrik atau angka ditampilkan apabila membantu CEO memahami skala perubahan.

Ketentuannya:

- Maksimal 1–2 angka utama dalam ringkasan.
- Angka harus tersedia pada sumber berita.
- Angka tidak boleh dibuat atau diasumsikan oleh AI.
- Estimasi harus diberi label sebagai estimasi.
- Jangan memaksakan angka apabila tidak tersedia atau tidak relevan.
- Satuan dan periode harus jelas.

## 5.5 Hal yang harus dihindari

Hindari ringkasan seperti:

> Kebijakan terbaru berpotensi memberikan dampak signifikan terhadap perusahaan.

Kalimat tersebut terlalu umum karena tidak menjelaskan perubahan dan dampaknya.

---

# 6. Perilaku Saat Isu Dibuka

## 6.1 Pola interaksi utama

Ketika CEO memilih sebuah isu, detail sebaiknya muncul melalui **side panel atau drawer** dari samping.

Alasan:

- Daftar isu utama tetap terlihat.
- Pengguna tidak kehilangan konteks.
- Pengguna dapat berpindah antarisu dengan cepat.
- Lebih nyaman dibandingkan popup kecil.
- Tidak langsung memaksa pengguna berpindah halaman.

## 6.2 Kapan menggunakan halaman penuh

Halaman khusus dapat digunakan apabila CEO ingin:

- Membaca analisis yang lebih panjang.
- Melihat banyak sumber.
- Melihat riwayat perkembangan isu.
- Melihat hubungan antarberita.
- Membaca detail data pendukung.
- Membagikan atau menyimpan detail isu.

## 6.3 Urutan isi detail isu

Saat isu dibuka, urutan informasi yang diharapkan adalah:

1. Judul isu.
2. Tingkat prioritas.
3. Apa yang terjadi.
4. Mengapa penting bagi perusahaan.
5. Dampak utama.
6. Risiko utama.
7. Hal yang perlu dipantau berikutnya.
8. Fakta pendukung.
9. Analisis untuk perusahaan.
10. Asumsi analisis, jika ada.
11. Waktu pembaruan terakhir.
12. Sumber berita.

## 6.4 Definisi setiap bagian

### Apa yang terjadi

Ringkasan singkat mengenai kejadian utama.

Harus:

- Faktual.
- Ringkas.
- Memuat angka penting jika tersedia.
- Tidak berisi rekomendasi.

### Mengapa penting bagi perusahaan

Menjelaskan hubungan langsung antara isu dan kondisi perusahaan.

Contoh hubungan:

- Industri.
- Produk.
- Pelanggan.
- Wilayah operasional.
- Biaya.
- Pendapatan.
- Regulasi.
- Reputasi.
- Prioritas bisnis.

### Dampak utama

Menjelaskan kemungkinan efek terhadap perusahaan.

Contoh:

- Biaya produksi meningkat.
- Pendapatan berpotensi menurun.
- Permintaan pelanggan berubah.
- Operasional perlu disesuaikan.
- Posisi kompetitif berubah.

### Risiko utama

Menjelaskan potensi masalah yang perlu dipertimbangkan.

Risiko harus ditulis sebagai potensi, bukan kepastian, kecuali memang telah terjadi.

### Hal yang perlu dipantau

Berisi perkembangan yang sebaiknya diperhatikan berikutnya.

Contoh:

- Waktu pemberlakuan regulasi.
- Respons kompetitor.
- Perubahan harga pasar.
- Pernyataan lanjutan pemerintah.
- Reaksi pelanggan.
- Perkembangan wilayah tertentu.

---

# 7. Pemisahan Fakta, Analisis, dan Asumsi

## 7.1 Fakta

Fakta adalah informasi yang tersedia dalam sumber berita.

Contoh:

- Pemerintah menaikkan tarif impor sebesar 15%.
- Kebijakan mulai berlaku pada tanggal tertentu.
- Perusahaan tertentu mengumumkan investasi.
- Regulator menerbitkan aturan baru.

Fakta harus memiliki sumber.

## 7.2 Analisis untuk perusahaan

Analisis menjelaskan arti fakta terhadap kondisi perusahaan.

Contoh:

> Kenaikan tarif dapat meningkatkan biaya bahan baku karena perusahaan masih mengandalkan impor untuk operasional di Indonesia.

Analisis harus menggunakan bahasa seperti:

- Berpotensi.
- Dapat.
- Kemungkinan.
- Perlu dipertimbangkan.
- Perlu dipantau.

## 7.3 Asumsi analisis

Asumsi ditampilkan hanya jika kesimpulan memerlukan dugaan yang belum dibuktikan oleh sumber.

Contoh:

> **Asumsi analisis:** Volume impor perusahaan tidak berubah setelah tarif baru berlaku.

Ketentuan:

- Harus diberi label jelas.
- Tidak boleh dicampurkan dengan fakta.
- Tidak boleh disajikan sebagai kepastian.
- Asumsi yang kritis harus mudah ditemukan pengguna.

---

# 8. Sumber Berita

## 8.1 Ekspektasi CEO

Setiap insight harus memiliki sumber yang mudah diperiksa.

CEO harus dapat mengetahui:

- Artikel apa yang digunakan.
- Kapan artikel dipublikasikan.
- Bagian analisis mana yang didukung artikel tersebut.
- Siapa penulis atau redaksinya.
- Di mana artikel asli dapat dibaca.

## 8.2 Informasi sumber

Setiap sumber minimal menampilkan:

- Judul artikel.
- Tanggal publikasi.
- Nama penulis atau redaksi.
- Keterangan singkat mengenai fakta yang didukung.
- Tautan ke artikel asli EGI Media.

## 8.3 Perilaku tautan

Ketika sumber diklik:

- Pengguna masuk ke artikel asli EGI Media.
- Artikel idealnya terbuka di tab baru.
- Detail isu tetap terbuka pada tab sebelumnya.
- Pengguna tidak kehilangan konteks analisis.

## 8.4 Rule sumber

- AI tidak boleh membuat sumber palsu.
- Hanya artikel yang benar-benar digunakan yang ditampilkan.
- Setiap klaim utama harus memiliki sumber pendukung.
- Artikel sumber harus dapat ditelusuri berdasarkan ID internal.
- Jika sumber tidak cukup, sistem harus menyatakan bahwa data belum cukup.

---

# 9. Personalisasi Berdasarkan Company Context

## 9.1 Tujuan

Sistem harus menjawab:

> Mengapa berita ini penting khusus bagi perusahaan saya?

Bukan hanya:

> Apa isi berita ini?

## 9.2 Data perusahaan yang digunakan

Company Context dapat mencakup:

- Nama perusahaan.
- Deskripsi perusahaan.
- Industri dan subindustri.
- Produk dan layanan utama.
- Target pelanggan.
- Wilayah operasional.
- Kompetitor utama.
- Prioritas bisnis.
- Tujuan bisnis.
- Risiko yang perlu diperhatikan.
- Topik pantauan.
- Ketergantungan bisnis tertentu.
- Informasi tambahan yang dimasukkan perusahaan.

## 9.3 Pengaruh terhadap hasil

Company Context digunakan untuk:

- Menaikkan prioritas berita yang berkaitan langsung.
- Menurunkan prioritas berita yang kurang relevan.
- Menentukan dampak yang lebih spesifik.
- Menyesuaikan risiko dengan kondisi perusahaan.
- Menentukan wilayah yang paling relevan.
- Menentukan isu yang masuk alert.
- Menentukan isu yang masuk laporan.

## 9.4 Contoh

Berita umum:

> Pemerintah menaikkan tarif impor bahan baku sebesar 15%.

Analisis yang dipersonalisasi:

> Isu ini dinilai prioritas tinggi karena perusahaan mengimpor bahan baku tersebut untuk operasional di Indonesia. Kenaikan tarif berpotensi meningkatkan biaya produksi.

## 9.5 Kontrol pengguna

Pengguna yang berwenang harus dapat:

- Meninjau Company Context.
- Memperbaiki data yang tidak tepat.
- Menambahkan informasi.
- Menghapus informasi yang tidak relevan.
- Melihat sumber setiap informasi.
- Memperbarui context ketika kondisi perusahaan berubah.

---

# 10. Rule Isu dan Perkembangan

## 10.1 Perbedaan berita dan isu

- **Berita** adalah satu artikel yang dipublikasikan EGI Media.
- **Isu** adalah satu topik atau kejadian yang dapat didukung oleh satu atau beberapa berita.
- Berita lanjutan tidak selalu membuat isu baru.
- Berita yang membahas perkembangan topik lama dapat memperbarui isu yang sudah ada.

## 10.2 Pembentukan isu

Rule awal yang disarankan:

- Berita baru dalam 24 jam terakhir dianalisis.
- Jika berita membahas topik yang belum ada, buat isu baru.
- Jika berita mirip dengan isu yang sudah ada dalam 7 hari terakhir, gabungkan sebagai perkembangan isu.
- Analyst dapat memisahkan berita apabila AI salah mengelompokkan.
- Analyst dapat menggabungkan isu apabila AI membuat duplikasi.

## 10.3 Status isu

| Status | Rule |
|---|---|
| **Baru** | Isu pertama kali dibuat dan usianya belum lebih dari 24 jam. |
| **Berkembang** | Ada berita atau fakta baru yang memperbarui isu. |
| **Dipantau** | Tidak ada berita baru, tetapi dampak atau risikonya masih dianggap relevan. |
| **Selesai** | Tidak ada perkembangan selama 7 hari atau ditutup manual oleh pengguna yang berwenang. |

## 10.4 Isu yang tampil di dashboard

Dashboard hanya menampilkan status:

- Baru.
- Berkembang.
- Dipantau.

Isu berstatus selesai masuk arsip.

Dashboard mengambil maksimal 3–5 isu aktif dengan prioritas tertinggi.

## 10.5 Kontrol manusia

Pengguna yang berwenang dapat:

- Mengubah status isu.
- Menutup isu.
- Membuka kembali isu.
- Menggabungkan isu.
- Memisahkan isu.
- Mempertahankan isu lebih dari 7 hari.
- Mengubah tingkat prioritas.

Semua perubahan harus disimpan dalam audit log.

---

# 11. Periode Waktu

## 11.1 Tampilan default

Dashboard berfokus pada perkembangan terbaru dalam **24 jam terakhir**.

Namun, isu lama yang masih aktif tetap dapat ditampilkan jika:

- Masih berdampak.
- Masih berisiko.
- Belum selesai.
- Ada perkembangan baru.
- Masih perlu dipantau oleh perusahaan.

## 11.2 Prinsip utama

Yang dibatasi oleh periode bukan umur isu, melainkan **perkembangan yang terjadi dalam periode tersebut**.

Contoh:

- Isu dibuat tiga hari lalu.
- Hari ini muncul berita lanjutan yang penting.
- Isu tersebut tetap masuk perkembangan 24 jam terakhir.

## 11.3 Filter waktu

Filter yang tersedia:

- 24 jam.
- 7 hari.
- 30 hari.

Fungsi:

- **24 jam:** perkembangan terbaru.
- **7 hari:** perkembangan dalam satu minggu.
- **30 hari:** konteks yang lebih luas.

---

# 12. Tingkat Prioritas

## 12.1 Tingkat prioritas

Gunakan tiga tingkat:

- Tinggi.
- Sedang.
- Rendah.

## 12.2 Penjelasan prioritas

Prioritas tidak boleh hanya ditampilkan sebagai label.

Pengguna harus dapat melihat alasan penilaiannya berdasarkan:

- Relevansi terhadap perusahaan.
- Potensi dampak.
- Urgensi.
- Kebaruan perkembangan.

## 12.3 Tujuan prioritas

Prioritas membantu CEO menentukan:

- Apa yang perlu segera diperhatikan.
- Apa yang cukup masuk ringkasan.
- Apa yang dapat dibaca ketika dibutuhkan.

---

# 13. Alert di Aplikasi

## 13.1 Fungsi

Aplikasi menjadi pusat informasi utama untuk seluruh alert.

## 13.2 Alert yang tersedia

Di aplikasi:

- Semua alert tersimpan.
- Alert memiliki status sudah dibaca atau belum dibaca.
- Alert dapat dibuka kembali.
- Alert dapat disimpan.
- Alert dapat ditandai selesai.
- Alert dapat diberi feedback relevan atau tidak relevan.

## 13.3 Prinsip

Email hanya menjadi jalur pemberitahuan.

Informasi lengkap dan riwayat alert tetap tersedia di aplikasi.

---

# 14. Email Alert

Terdapat dua jenis email.

## 14.1 Alert langsung

Alert langsung dikirim untuk satu isu prioritas tinggi.

### Trigger

- Ada isu baru dengan prioritas tinggi.
- Ada perkembangan baru yang mengubah isu menjadi prioritas tinggi.
- Ada fakta baru yang secara material meningkatkan dampak atau urgensi.

### Rule waktu

- Tidak menunggu 24 jam.
- Dikirim segera setelah proses dan validasi selesai.
- Isu boleh berumur lebih dari satu hari.
- Yang penting adalah adanya perkembangan baru yang signifikan.
- Isu yang sama tidak dikirim ulang tanpa perkembangan berarti.

### Isi email

- Judul isu.
- Label prioritas tinggi.
- Apa yang terjadi.
- Mengapa penting bagi perusahaan.
- Dampak utama.
- Tautan untuk membuka detail.

### Format

Satu email berfokus pada satu isu agar informasi penting tidak tenggelam.

## 14.2 Ringkasan harian

Ringkasan harian berisi kumpulan 3–5 isu penting.

### Sumber isu

- Isu yang memiliki perkembangan baru sejak ringkasan sebelumnya.
- Umumnya perkembangan dalam 24 jam terakhir.
- Prioritas sedang dan tinggi.
- Isu lama dapat masuk apabila memiliki perkembangan baru.

### Rule pengulangan

- Isu tanpa perkembangan baru tidak dikirim ulang.
- Alert tinggi yang sudah dikirim langsung tidak perlu diulang.
- Isu tersebut dapat masuk kembali apabila terdapat update tambahan yang berarti.

### Isi setiap isu

- Judul.
- Tingkat prioritas.
- Ringkasan satu kalimat.
- Tautan detail.

## 14.3 Hubungan dashboard dan email

Dashboard dan email memakai dasar penilaian prioritas yang sama, tetapi bukan salinan identik.

- Dashboard menampilkan isu aktif paling penting saat ini.
- Email harian menampilkan isu yang memiliki perkembangan baru sejak email terakhir.
- Dashboard dapat tetap menampilkan isu lama yang masih aktif.
- Email tidak mengulang isu lama tanpa perkembangan.

---

# 15. Laporan Harian, Mingguan, dan Bulanan

## 15.1 Laporan harian

Tujuan:

- Memberikan rangkuman perkembangan penting.
- Menyampaikan isu utama tanpa membaca seluruh berita.

Fokus:

- Perkembangan terbaru.
- Isu prioritas tinggi dan sedang.
- Dampak dan risiko jangka dekat.
- Hal yang perlu dipantau besok.

## 15.2 Laporan mingguan

Tujuan:

- Melihat perubahan dan pola selama satu minggu.
- Membandingkan dengan minggu sebelumnya.

Isi perbandingan dapat mencakup:

- Isu baru.
- Isu yang memburuk.
- Isu yang membaik.
- Isu yang selesai.
- Perubahan tingkat prioritas.
- Pergeseran fokus risiko.
- Jumlah isu prioritas tinggi.
- Perkembangan kompetitor atau regulasi.

## 15.3 Laporan bulanan

Tujuan:

- Memahami tren strategis.
- Melihat perubahan dibanding bulan sebelumnya.
- Menentukan fokus pemantauan berikutnya.

Isi perbandingan dapat mencakup:

- Pola isu yang terus berulang.
- Risiko yang meningkat.
- Risiko yang menurun.
- Perubahan kondisi pasar.
- Perubahan aktivitas kompetitor.
- Perubahan regulasi.
- Peluang strategis.
- Topik yang mulai menjadi penting.

## 15.4 Perbandingan periode

Perbandingan lengkap tidak perlu dipaksakan ke dashboard utama.

Dashboard cukup menampilkan indikator singkat jika relevan, seperti:

- Prioritas naik.
- Risiko meningkat.
- Ada perkembangan baru.
- Kondisi membaik.
- Isu kembali aktif.

Analisis perbandingan lengkap masuk ke laporan mingguan dan bulanan.

## 15.5 Review laporan

Sebelum laporan dibagikan:

- Pengguna yang berwenang dapat meninjau.
- Isi dapat dikoreksi.
- Prioritas dapat diperbaiki.
- Insight dapat ditambah atau dihapus.
- Sumber dapat diperiksa.
- Versi final dapat disetujui.
- Perubahan dicatat.

---

# 16. Bahasa dan Gaya Penulisan

## 16.1 Prinsip bahasa

Bahasa harus:

- Sederhana.
- Langsung.
- Ringkas.
- Mudah dipahami sekali baca.
- Berorientasi pada arti bisnis.
- Tidak terlalu teknis.
- Tidak terdengar seperti laporan akademis.
- Tidak memakai istilah asing jika ada padanan yang mudah dipahami.

## 16.2 Rule penulisan

- Satu kalimat menyampaikan satu gagasan utama.
- Hindari kalimat terlalu panjang.
- Jelaskan dampak secara konkret.
- Gunakan angka penting jika tersedia.
- Jelaskan istilah teknis jika tetap harus digunakan.
- Jangan menggunakan kata-kata umum tanpa penjelasan.
- Jangan menyatakan kemungkinan sebagai kepastian.

## 16.3 Contoh perbaikan bahasa

### Terlalu teknis

> Kebijakan ini berpotensi menimbulkan tekanan terhadap struktur cost perusahaan akibat peningkatan landed cost pada imported raw materials.

### Lebih sederhana

> Kenaikan tarif impor 15% berpotensi meningkatkan biaya bahan baku perusahaan.

---

### Terlalu umum

> Perubahan ini dapat memberikan dampak signifikan terhadap perusahaan.

### Lebih langsung

> Perubahan ini dapat menaikkan biaya produksi dan menurunkan margin keuntungan.

---

### Terlalu panjang

> Berdasarkan perkembangan regulasi terbaru yang diumumkan pemerintah, terdapat kemungkinan bahwa perusahaan perlu melakukan penyesuaian terhadap proses pengadaan bahan baku dalam beberapa bulan mendatang.

### Lebih ringkas

> Perusahaan mungkin perlu mengganti pemasok atau menyesuaikan pembelian bahan baku dalam beberapa bulan ke depan.

---

# 17. Batasan Decision-Support

## 17.1 Sistem boleh

Sistem boleh:

- Menunjukkan isu yang perlu perhatian.
- Menjelaskan alasan isu dianggap penting.
- Menampilkan potensi dampak.
- Menampilkan risiko.
- Menampilkan peluang.
- Menunjukkan hal yang perlu dipantau.
- Menampilkan beberapa opsi tindak lanjut.
- Menyediakan sumber.
- Menyatakan ketidakpastian.

## 17.2 Sistem tidak boleh

Sistem tidak boleh:

- Mengambil keputusan final.
- Menjalankan tindakan otomatis tanpa persetujuan.
- Mengirim instruksi ke divisi lain atas nama CEO.
- Mengubah anggaran.
- Mengubah strategi.
- Mengubah operasional.
- Menyembunyikan asumsi.
- Menyatakan satu pilihan sebagai satu-satunya keputusan yang benar.
- Membuat fakta atau angka yang tidak tersedia.

## 17.3 Istilah yang disarankan

Gunakan:

- Perlu perhatian.
- Potensi dampak.
- Risiko yang perlu dipertimbangkan.
- Hal yang perlu dipantau.
- Opsi tindak lanjut.
- Dapat dipertimbangkan.
- Berpotensi.
- Kemungkinan.

Hindari:

- Keputusan yang harus diambil.
- Perusahaan wajib melakukan.
- Tindakan terbaik adalah.
- Jalankan sekarang.
- Pasti terjadi.

## 17.4 Contoh

### Sesuai

> **Potensi tindak lanjut:** Pertimbangkan evaluasi pemasok alternatif dan simulasi dampak kenaikan biaya.

### Tidak sesuai

> **Keputusan:** Segera ganti pemasok dan naikkan harga jual.

---

# 18. Feedback Pengguna

CEO atau pengguna yang berwenang dapat memberi feedback:

- Relevan.
- Tidak relevan.
- Prioritas terlalu tinggi.
- Prioritas terlalu rendah.
- Analisis kurang tepat.
- Isu duplikat.
- Informasi sudah tidak perlu dipantau.

Feedback digunakan untuk:

- Evaluasi kualitas.
- Perbaikan rule.
- Perbaikan Company Context.
- Perbaikan prompt.
- Perbaikan pemeringkatan.

Feedback tidak langsung mengubah sistem secara permanen tanpa kontrol dan evaluasi.

---

# 19. Penyimpanan dan Riwayat

Pengguna harus dapat:

- Menyimpan isu.
- Membuka kembali isu lama.
- Melihat perkembangan sebuah isu.
- Melihat sumber berita.
- Melihat perubahan prioritas.
- Melihat kapan isu diperbarui.
- Melihat siapa yang melakukan perubahan manual.
- Mencari isu berdasarkan kata kunci, kategori, atau periode.

Isu selesai tidak dihapus, tetapi dipindahkan ke arsip.

---

# 20. Hak Akses

Akses harus dibatasi berdasarkan role.

Contoh kebutuhan:

- CEO dapat melihat seluruh informasi strategis yang diizinkan.
- Direktur dapat melihat informasi sesuai fungsi atau unit bisnis.
- Analyst dapat mereview dan memperbaiki insight.
- Admin dapat mengatur pengguna dan akses.
- Pengguna perusahaan lain tidak boleh melihat data perusahaan ini.

Data Company Context, insight, alert, dan laporan tidak boleh tercampur antarperusahaan.

---

# 21. Acceptance Criteria High-Level

## 21.1 Dashboard utama

- Menampilkan maksimal 3–5 isu utama.
- Isu diurutkan berdasarkan prioritas.
- Setiap isu memiliki judul, prioritas, ringkasan, dan waktu pembaruan.
- Informasi dapat dipahami tanpa membuka artikel.
- Tampilan tidak padat.

## 21.2 Detail isu

- Dibuka melalui side panel atau drawer.
- Memuat apa yang terjadi.
- Memuat alasan penting bagi perusahaan.
- Memuat dampak dan risiko.
- Memuat hal yang perlu dipantau.
- Memisahkan fakta, analisis, dan asumsi.
- Memuat sumber yang dapat dibuka.

## 21.3 Sumber

- Setiap sumber mengarah ke artikel asli EGI Media.
- Sumber dibuka di tab baru.
- Source ID valid.
- Tidak ada sumber buatan AI.

## 21.4 Personalisasi

- Prioritas menggunakan Company Context.
- Analisis menjelaskan hubungan dengan perusahaan.
- Wilayah, industri, produk, dan risiko perusahaan dipertimbangkan.
- Pengguna dapat memperbaiki Company Context.

## 21.5 Alert

- Prioritas tinggi dapat memicu email langsung.
- Prioritas sedang masuk ringkasan harian.
- Prioritas rendah cukup tersedia di dashboard.
- Isu yang sama tidak dikirim ulang tanpa perkembangan.
- Semua alert tersimpan di aplikasi.

## 21.6 Laporan

- Tersedia laporan harian, mingguan, dan bulanan.
- Laporan mingguan membandingkan minggu sebelumnya.
- Laporan bulanan membandingkan bulan sebelumnya.
- Laporan dapat direview sebelum dibagikan.
- Semua sumber dapat ditelusuri.

## 21.7 Bahasa

- Tidak terlalu teknis.
- Tidak ambigu.
- Tidak membuat klaim pasti tanpa dasar.
- Tidak menggunakan istilah pengambilan keputusan final.
- Dampak terhadap perusahaan dijelaskan secara langsung.

---

# 22. Hal yang Tidak Boleh Salah Dipahami

1. Dashboard bukan daftar seluruh berita.
2. Isu berbeda dari artikel.
3. Satu isu dapat memiliki beberapa artikel.
4. Isu lama tetap dapat tampil jika masih aktif.
5. Periode 24 jam mengacu pada perkembangan, bukan umur isu.
6. Dashboard dan email harian tidak selalu berisi daftar yang sama.
7. Email langsung hanya untuk perkembangan prioritas tinggi.
8. Analisis bukan fakta.
9. Asumsi harus diberi label.
10. AI tidak membuat keputusan final.
11. Sumber harus mengarah ke artikel asli EGI Media.
12. Personalisasi bukan sekadar filter kategori.
13. Perbandingan periode utama berada di laporan, bukan dashboard.
14. Informasi ringkas ditampilkan lebih dahulu, detail dibuka saat diperlukan.
15. Kontrol manusia tetap tersedia pada prioritas, status isu, insight, dan laporan.

---

# 23. Ringkasan Blueprint

CEO menginginkan dashboard yang dapat menunjukkan 3–5 isu terpenting dalam satu layar.

Setiap isu pada tampilan awal cukup berisi:

- Judul.
- Tingkat prioritas.
- Ringkasan satu kalimat.
- Waktu pembaruan.

Ketika isu dibuka, sistem menjelaskan:

- Apa yang terjadi.
- Mengapa penting bagi perusahaan.
- Dampak utama.
- Risiko utama.
- Hal yang perlu dipantau.
- Fakta.
- Analisis.
- Asumsi.
- Sumber.

Sistem menggunakan Company Context agar analisis benar-benar sesuai dengan industri, produk, pelanggan, wilayah, prioritas, dan risiko perusahaan.

Alert tersedia di aplikasi dan email:

- Alert langsung untuk perkembangan prioritas tinggi.
- Ringkasan harian untuk 3–5 perkembangan penting.
- Isu lama tidak dikirim ulang tanpa perkembangan baru.

Laporan digunakan untuk melihat perubahan antarperiode:

- Harian untuk perkembangan terbaru.
- Mingguan untuk perubahan dibanding minggu sebelumnya.
- Bulanan untuk tren dan perubahan strategis.

Seluruh bahasa harus sederhana, langsung, dan menjelaskan arti bisnisnya.

Produk membantu CEO menentukan apa yang membutuhkan perhatian, tetapi tidak mengambil keputusan atau menjalankan tindakan secara otomatis.
