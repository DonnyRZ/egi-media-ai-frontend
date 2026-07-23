# Blueprint Kebutuhan CEO  
## AI-Powered News Dashboard EGI Media

**Versi:** 1.1 (rekonsiliasi dengan mockup)  
**Status:** Hasil research and gathering kebutuhan pengguna, diselaraskan dengan prototipe interaktif  
**Persona utama:** CEO / C-Level  
**Tujuan dokumen:** Menjadi acuan desain produk, UI/UX, business rule, dan pengembangan aplikasi agar implementasi tetap sesuai dengan kebutuhan CEO.

---

# 0. Catatan Rekonsiliasi (v1.1 — 21 Jul 2026)

Dokumen ini awalnya (v1.0) adalah blueprint kebutuhan CEO yang bersifat aspiratif. Pada **21 Juli 2026** dokumen diselaraskan dengan **prototipe/mockup interaktif** yang sudah dibangun (`egi-media-ai-frontend/Mockup/`) setelah prototipe diuji secara empiris halaman per halaman.

**Aturan rekonsiliasi:**

- **Mockup adalah sumber kebenaran (source of truth) untuk fitur dan perilaku produk.** Jika blueprint bertentangan dengan mockup, pernyataan blueprint dikoreksi atau diberi anotasi.
- Blueprint tetap otoritatif untuk **business rule / intent** yang tidak disentuh oleh mockup (mis. ambang waktu 24 jam / 7 hari, rule pengulangan email, batasan decision-support).
- Anotasi hasil rekonsiliasi ditandai dengan blok **`> Catatan rekonsiliasi (mockup):`** di sepanjang dokumen.
- Bagian baru hasil rekonsiliasi ada di **Bagian 24–29** (onboarding, model multi-perusahaan, model data aktual, kosakata kanonik, tabel diskrepansi, dan status simulasi vs kebutuhan produksi).

**Ringkasan temuan terpenting:** onboarding 4 langkah SUDAH ADA di mockup (tidak ada di v1.0); "multi-perusahaan" di mockup adalah **company switcher tingkat akun** (satu login berpindah konteks antar 3 perusahaan), berbeda dari isolasi multi-tenant antar-klien; halaman **Alerts adalah inbox email** yang membaca sumber data `emails`, terpisah dari data `alerts`; alur review laporan memiliki **5 status** konkret; beberapa kapabilitas (pengiriman email, tautan sumber, audit log, persistensi feedback, generasi AI konteks, pembayaran) saat ini **hanya simulasi visual** di prototipe.

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

> **Catatan rekonsiliasi (mockup):** Halaman dashboard (`Executive-Summary.html`) sudah menerapkan ini. Daftar isu **dibatasi maksimal 5** isu (fungsi kurasi), diurutkan `tinggi → sedang → rendah` (urutan sumber dipertahankan dalam satu tingkat), dan isu berstatus `selesai` dikecualikan. Filter periode (24 jam / 7 hari / 30 hari) bersifat **kumulatif** (7 hari mencakup 24 jam; 30 hari mencakup semua). Daftar juga difilter oleh **perusahaan aktif** (lihat Bagian 25). Pada mockup, `index.html` melakukan redirect instan ke `Executive-Summary.html` sebagai halaman utama.

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

> **Catatan rekonsiliasi (mockup):** Di prototipe, mengklik sumber membuka **modal pratinjau sumber** (judul, tanggal, penulis, klaim yang didukung) dengan tombol "Buka artikel asli". Namun tautan artikel **belum berfungsi** — semua `url` sumber berisi anchor placeholder `#sumber-egimedia` dan tombol hanya memunculkan toast. Perilaku "buka artikel asli di tab baru" (Bagian 8.3 & Acceptance Criteria 21.3) masih **kebutuhan produksi**, belum terpenuhi di mockup. Setiap sumber pada data sudah memuat field `{ title, date, author, claim, url }`.

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

> **Catatan rekonsiliasi (mockup):** Company Context di prototipe berupa **form 12 field** konkret: Nama perusahaan, Industri & sub-industri, Deskripsi, Produk & layanan, Pelanggan target, Wilayah operasi, Kompetitor, Prioritas bisnis, Tujuan bisnis, Risiko yang dipantau, Topik pemantauan, dan Ketergantungan bisnis (plus metadata `updatedAt`, `updatedBy`, `source`). Form ini muncul di **dua tempat**: halaman Settings dan langkah ke-4 Onboarding (lihat Bagian 24). Field diisi lewat **alur AI 3 tahap**: idle (unggah dokumen PDF/Word/PPT **atau** masukkan URL) → loading (~2,8 detik animasi) → done (form 12 field yang dapat diedit). **Penting:** generasi AI ini masih **simulasi** — timer tetap yang selalu menghasilkan profil Astra yang sama tanpa memproses isi input (lihat Bagian 29).

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

> **Catatan rekonsiliasi (mockup):** Dari kontrol manusia di atas, mockup baru mewujudkan **"Tandai selesai"** pada drawer isu (mengubah `status` menjadi `selesai` dan memindahkan isu ke arsip) dan **toggle simpan/hapus** isu. Aksi lain (ubah prioritas manual, gabung/pisah isu, buka kembali, pertahankan >7 hari) **belum ada** di prototipe. **Audit log** yang benar-benar mencatat perubahan **belum diimplementasikan** — yang ada hanya blok "Catatan aktivitas" statis pada modal laporan. Audit log tetap kebutuhan produksi.

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

## 13.4 Realitas mockup: halaman Alerts = inbox email

> **Catatan rekonsiliasi (mockup):** Halaman **Alerts (`Alerts.html`) di prototipe adalah sebuah INBOX EMAIL**, bukan daftar event monitoring. Ada dua sumber data yang perlu dibedakan (Agen 4/5/6 wajib memperhatikan):
>
> - **`emails`** — arsip email yang benar-benar "dikirim" sistem ke alamat terdaftar pengguna. **Inilah yang dirender oleh halaman Alerts dan lonceng notifikasi (bell).** Difilter per perusahaan aktif, diurutkan terbaru, jumlah belum-dibaca = `emails.filter(!read)`.
> - **`alerts`** — event mesin monitoring internal (langsung/ringkasan). **Tidak** dirender langsung di halaman Alerts; dipakai untuk daftar "Perkembangan sebelumnya" pada drawer isu dan konsep hitung belum-dibaca.
>
> Ini adalah **dua sumber kebenaran paralel untuk "alert"** — sebuah inkonsistensi desain yang perlu disatukan di produksi (idealnya satu model event yang men-generate email).
>
> Halaman Alerts memiliki **dua tab: "Alert Urgent"** (tipe `langsung`) dan **"Ringkasan Harian"** (tipe `ringkasan`), masing-masing dengan hitungan belum-dibaca. Membuka email menandainya terbaca (memperbarui tab, bell, dan badge nav) dan menyinkronkan URL `?email=<id>`. Reader email urgent menampilkan banner prioritas, judul isu, "Perkembangan baru", "Dampak perubahan", dan tombol **"Buka Detail Isu"** yang membuka drawer isu bersama; reader ringkasan menampilkan daftar item bernomor dengan badge prioritas + tautan "Buka detail isu".
>
> Fitur alert in-app pada Bagian 13.2 (status dibaca, buka kembali, simpan, tandai selesai, feedback relevan/tidak) **sebagian** terwujud: status dibaca/belum ✅, buka kembali ✅; sedangkan simpan-alert, tandai-selesai-alert, dan feedback pada level alert **belum** ada di halaman Alerts (feedback & tandai selesai ada di drawer isu).

---

# 14. Email Alert

Terdapat dua jenis email.

> **Catatan rekonsiliasi (mockup):** Kedua jenis email (langsung & ringkasan harian) sudah **ditampilkan** di prototipe sebagai arsip (`emails`) beserta reader-nya, dan preferensi pengiriman dapat diatur di Settings (alert prioritas tinggi instan, ringkasan harian, laporan mingguan, laporan bulanan [default nonaktif], channel email, waktu kirim default `07:00`, timezone). **Namun pengiriman email nyata tidak ada** — tidak ada backend; email hanya data seed yang dirender. Trigger, rule waktu, dan rule pengulangan pada Bagian 14.1–14.3 tetap valid sebagai **kebutuhan produksi**, bukan perilaku yang sudah berjalan.

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

### 15.5.1 State machine review (dari mockup)

> **Catatan rekonsiliasi (mockup):** Alur review laporan sudah terwujud dengan **5 status konkret** (label tampilan dalam kurung):
>
> `draft` (Draf) → `in-review` (Ditinjau) → `approved` (Disetujui) → `shared` (Dibagikan), dengan status tambahan `needs-review` (Perlu ditinjau).
>
> **Transisi yang benar-benar terpasang dan terverifikasi:**
> - **Perbaiki ringkasan** → menyimpan ringkasan baru dan menggeser status: `draft → in-review`, serta `approved/shared → needs-review`.
> - **Setujui laporan** → status menjadi `approved`.
> - **Bagikan ke manajemen** (hanya pada laporan `approved`) → status menjadi `shared`.
> - **Simpan** → toggle bookmark laporan (tidak mengubah status).
>
> Aksi footer modal berbeda menurut status: laporan `approved` menampilkan **Simpan / Bagikan ke manajemen / Tutup**; status lain menampilkan **Simpan / Tutup** + blok "Tinjauan (opsional)" berisi **Perbaiki ringkasan** dan **Setujui laporan**. Daftar laporan dapat difilter berdasarkan status review (Semua status / Draf / Ditinjau / Disetujui / Dibagikan / Perlu ditinjau).
>
> Catatan istilah: instruksi awal menyebut "enam" status, tetapi implementasi aktual hanya **lima** (`draft`, `in-review`, `approved`, `shared`, `needs-review`). Lima status inilah yang menjadi acuan.

### 15.5.2 Struktur & mode render laporan (dari mockup)

> **Catatan rekonsiliasi (mockup):** Laporan berjenis `harian` / `mingguan` / `bulanan`. Ada **dua mode render**: (a) **dokumen terstruktur** bila laporan punya objek `content` (Executive Summary + `sections[]` bertipe: `issues`, `categories`, `risk-opportunity`, `bullets`, `sources`, `paragraphs`, `comparison`, `metrics`, `changes`, `strategic-risks`); (b) **template sederhana** (Ringkasan eksekutif, Sorotan, Comparison box, Risiko, Peluang, Hal yang perlu dipantau, Sumber). Laporan **mingguan** menampilkan grid perbandingan **week-over-week** (isu baru / memburuk / membaik / selesai / jumlah prioritas tinggi dengan delta ↑↓); laporan **bulanan** menampilkan perbandingan **month-over-month** + tabel metrik. Ini menyelaraskan Bagian 15.2–15.4. **Catatan Agen 1:** layout laporan yang sebelumnya dilabeli "dummy/ilustratif" kini terwujud konkret di mockup dan dapat menjadi acuan.

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

> **Catatan rekonsiliasi (mockup):** Picker feedback ada di drawer isu dengan **7 opsi** persis: Relevan, Tidak relevan, Prioritas terlalu tinggi, Prioritas terlalu rendah, Analisis kurang tepat, Isu duplikat, Tidak perlu dipantau lagi (+ catatan opsional). Namun feedback bersifat **advisory saja — tidak menyimpan apa pun** (hanya toast konfirmasi). Loop "feedback → perbaikan rule/context/prompt/pemeringkatan" tetap kebutuhan produksi.

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

> **Catatan rekonsiliasi (mockup):** Prototipe punya tabel **Team & Access** (5 anggota seed: CEO/C-Level, Direktur, Analyst, Admin; status active/inactive) dengan aksi **Undang pengguna**, **ubah Role**, dan **Cabut akses**. Namun ini **belum menjadi RBAC yang menegakkan izin** — semua halaman dapat diakses tanpa pemeriksaan role, dan aksi Team & Access hanya mengubah data seed.
>
> **PENTING — dua konsep "multi-perusahaan" yang berbeda (harus dipisahkan oleh Agen 4/5/6):**
> 1. **Company switcher tingkat akun (ADA di mockup):** satu login (Arga Wijaya, CEO) dapat **berpindah konteks** antara 3 perusahaan (`astra`, `united-tractors`, `astra-honda`) via selector di header; semua konten (isu, alert/email, tersimpan) difilter oleh perusahaan aktif. Ini adalah **portofolio perusahaan milik satu pengguna/grup**, bukan pemisahan antar-klien. Lihat Bagian 25.
> 2. **Isolasi multi-tenant antar-klien (kebutuhan produksi, BELUM di mockup):** pemisahan data ketat antara perusahaan pelanggan yang berbeda ("pengguna perusahaan lain tidak boleh melihat data perusahaan ini"). Ini tetap kebutuhan komersial dan **belum tersentuh** oleh prototipe.
>
> Kedua konsep ini harus hidup berdampingan: model tenant untuk pelanggan komersial, dan di dalamnya company-switcher untuk grup/holding yang memantau beberapa entitas.

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

---

# 24. Onboarding (BARU — dari mockup)

Blueprint v1.0 tidak mendeskripsikan onboarding, tetapi prototipe **sudah memilikinya** (`Onboarding.html`). Bagian ini ditambahkan agar dokumen sesuai realitas.

## 24.1 Bentuk

- Halaman berdiri sendiri (chrome-nya sendiri, bukan shell aplikasi).
- **Tur terpandu 4 langkah** dengan progress rail: **Insight → Peringatan → Laporan → Konteks Bisnis**.

## 24.2 Isi tiap langkah

1. **Insight** — demo langsung daftar isu berperingkat (memakai komponen kartu isu asli).
2. **Peringatan (Alerts)** — demo satu baris email alert + cuplikan prioritas + catatan channel "email alert".
3. **Laporan (Reports)** — pratinjau dokumen laporan otomatis yang dapat di-scroll, dibangun dari `content` laporan nyata (Executive Summary, isu teratas, kategori dampak, hal yang perlu dipantau, sumber).
4. **Konteks Bisnis** — alur AI 3 tahap yang **sama** dengan Settings (idle → loading ~2,8 dtk → form 12 field yang dapat diedit; lihat Bagian 9 & 26).

## 24.3 Penyelesaian

- Tombol **"Simpan dan buka dashboard"** menandai `onboardingComplete = true`, menyimpannya, lalu **redirect ke `Executive-Summary.html`**.
- **Catatan penting:** `onboardingComplete` **disimpan tetapi tidak pernah ditegakkan** — dashboard tetap dapat diakses langsung tanpa melewati onboarding. Untuk produksi, perlu diputuskan apakah onboarding wajib (gate) atau dapat dilewati.

---

# 25. Model Multi-Perusahaan: Company Switcher vs Multi-Tenant

Rekonsiliasi eksplisit atas dua konsep yang mudah tertukar (lihat juga anotasi Bagian 20).

| Aspek | Company switcher (ADA di mockup) | Isolasi multi-tenant (kebutuhan produksi) |
|---|---|---|
| Cakupan | Portofolio perusahaan dalam **satu akun/grup** | Pemisahan data antar **klien/pelanggan berbeda** |
| Contoh | Arga (CEO) berpindah antara Astra / United Tractors / Astra Honda | Perusahaan A tidak boleh melihat data Perusahaan B |
| Mekanisme di mockup | Selector perusahaan di header → overlay "Memuat konteks…" ~450 ms → filter semua konten + toast | — belum ada |
| Data terkait | `EGI.companies` (3), `companyIds[]` pada isu, filter email per perusahaan | Boundary tenant, RBAC yang ditegakkan, enkripsi/segmentasi data |
| Status | ✅ Berfungsi | ❌ Belum tersentuh prototipe |

**Kesimpulan:** keduanya sah dan harus berdampingan. Produk komersial butuh **tenant per pelanggan** (isolasi ketat); di dalam sebuah tenant grup/holding, **company switcher** memungkinkan satu eksekutif memantau beberapa entitas anak. Filter `companyIds[]` di mockup adalah mekanisme switcher tingkat akun, **bukan** batas keamanan tenant.

---

# 26. Model Data Aktual (dari `js/data.js`)

Didokumentasikan agar Agen 5/6 punya acuan skema konkret. Semua data menggantung pada objek global `window.EGI` (prototipe front-end statis, dipersist ke `localStorage` key `egi-media-news-dashboard-mockup-v7`).

## 26.1 Entitas Isu (`EGI.issues`, 6 seed)

Field per isu:

- `id`, `title`, `summary`
- `priority`: `tinggi` | `sedang` | `rendah`
- `status`: `baru` | `berkembang` | `dipantau` | `selesai`
- `updatedAt` (mis. "Hari ini · 08:45"), `updatedFull`
- `period`: `24jam` | `7hari` | `30hari`
- `companyIds[]` (perusahaan yang relevan — penggerak filter switcher)
- `saved` (bool)
- `priorityReason` ("Alasan prioritas", tampil di atas drawer)
- Naratif: `whatHappened`, `whyMatters`, `impacts[]`, `risks[]`, `watch[]`, `facts[]`, `analysis`, `assumption`
- `sources[]`: `{ title, date, author, claim, url }`

Drawer memisahkan **Fakta / Analisis / Asumsi** secara eksplisit (sesuai Bagian 7).

## 26.2 Entitas lain

- **`EGI.companies`** (3): `{ id, name, industry }` — `astra`, `united-tractors`, `astra-honda`.
- **`EGI.user`**: `{ name, role, email, title, timezone, language, avatar }` — seed Arga Wijaya, CEO.
- **`EGI.alerts`** (7): event monitoring internal `{ id, eventAt, issueId, type(langsung|ringkasan), title, change, summary, priority, createdAt, read, saved, completed, sourceIndexes[]|dailyIssues[] }`.
- **`EGI.emails`** (5): arsip email terkirim `{ id, type(langsung|ringkasan), companyIds[], sender, recipient, subject, preview, sentAt, sentLabel, read, priority, issueId, issueTitle, change, impact }`; email ringkasan memakai `intro` + `items[]` `{ issueId, priority, title, change }`.
- **`EGI.reports`** (8): `{ id, type(harian|mingguan|bulanan), title, periodLabel, status, issueCount, updatedAt, summary, highlights[], comparison, risks[], opportunities[], watch[], sources[], content? }`.
- **`EGI.saved`**: `{ issues[], alerts[], reports[] }`.
- **`EGI.team`** (5): `{ id, name, email, role, status(active|inactive), lastActive }`.
- **`EGI.companyContext`**: `{ name, description, industry, subIndustry, products, customers, regions, competitors, priorities, goals, risks, topics, dependencies, updatedAt, updatedBy, source }` (12 field bisnis + metadata).
- **`EGI.notifications`**: `{ highAlert, dailyDigest, weeklyReport, monthlyReport, sendTime:'07:00', timezone, emailChannel }`.
- **`EGI.billing`**: `{ plan:'Enterprise', status, renewalDate, paymentMethod, seats:'12 / 20 pengguna', price:'Rp 28.500.000 / bulan', invoices[] }`.
- **`EGI.state`**: `{ activeCompanyId:'astra', onboardingComplete:false, unreadAlerts() }`.

---

# 27. Kosakata & State Machine Kanonik (dari mockup)

Nilai internal (kode) vs label tampilan. **Gunakan nilai internal ini sebagai acuan implementasi.**

| Konsep | Nilai internal | Label tampilan |
|---|---|---|
| Prioritas isu | `tinggi`, `sedang`, `rendah` | Prioritas Tinggi / Sedang / Rendah |
| Status isu | `baru`, `berkembang`, `dipantau`, `selesai` | Baru / Berkembang / Dipantau / Selesai |
| Status review laporan | `draft`, `in-review`, `approved`, `shared`, `needs-review` | Draf / Ditinjau / Disetujui / Dibagikan / Perlu ditinjau |
| Tipe alert/email | `langsung`, `ringkasan` | Alert Urgent / Ringkasan Harian |
| Tipe laporan | `harian`, `mingguan`, `bulanan` | Harian / Mingguan / Bulanan |
| Periode dashboard | `24jam`, `7hari`, `30hari` | 24 jam / 7 hari / 30 hari |
| Status anggota tim | `active`, `inactive` | Active / Inactive |

---

# 28. Tabel Diskrepansi Blueprint vs Mockup

Mockup menang kecuali item murni business-rule yang tidak disentuh mockup.

| # | Topik | Kata blueprint (v1.0) | Realitas mockup (source of truth) | Resolusi |
|---|---|---|---|---|
| 1 | **Onboarding** | Tidak disebut sama sekali | Tur 4 langkah (Insight → Peringatan → Laporan → Konteks Bisnis) + setup Company Context, diakhiri "Simpan dan buka dashboard" → dashboard | **Ditambahkan** sebagai Bagian 24 |
| 2 | **Multi-perusahaan** | Implikasi isolasi multi-tenant antar-klien | Company switcher tingkat akun (1 login, 3 perusahaan, filter konten) | **Dipisahkan** jadi dua konsep (Bagian 25); keduanya berlaku |
| 3 | **Alerts** | Alert = pusat informasi event di aplikasi | Halaman Alerts = **inbox email** (`emails`); `alerts` dataset terpisah untuk drawer | Doc dikoreksi (Bagian 13.4); dua sumber data harus disatukan di produksi |
| 4 | **Status review laporan** | Tidak dienumerasi ("dapat direview, disetujui, dicatat") | 5 status: `draft/in-review/approved/shared/needs-review` + transisi wired | **Dienumerasi** (Bagian 15.5.1) |
| 5 | **Kosakata prioritas/status** | Teks Indonesia naratif (Tinggi/Sedang/Rendah; Baru/Berkembang/Dipantau/Selesai) | Nilai internal `tinggi/sedang/rendah`, `baru/berkembang/dipantau/selesai` | **Diselaraskan** (Bagian 27) |
| 6 | **Model data isu** | Deskriptif, tidak berskema | Field konkret termasuk `period`, `companyIds[]`, `priorityReason`, `sources[]{title,date,author,claim,url}` | **Didokumentasikan** (Bagian 26) |
| 7 | **Company Context** | Daftar longgar ~13 poin | Form **12 field** + alur AI 3 tahap, di Settings & Onboarding | **Dikonkretkan** (Bagian 9 & 26) |
| 8 | **Cap dashboard** | "3–5 isu" | Maksimal **5**, filter periode kumulatif, `selesai` dikecualikan | Diklarifikasi (Bagian 4.1) |
| 9 | **Tautan sumber** | Buka artikel asli EGI Media di tab baru | Placeholder `#sumber-egimedia`, hanya toast | Ditandai **simulasi** (Bagian 8.3 & 29) — kebutuhan produksi |
| 10 | **Pengiriman email** | Alert langsung & ringkasan harian dikirim | Hanya arsip seed dirender; tak ada backend/pengiriman | Ditandai **simulasi** (Bagian 14 & 29) |
| 11 | **Audit log** | "Semua perubahan disimpan dalam audit log" | Belum ada; hanya "Catatan aktivitas" statis di laporan | Ditandai belum diimplementasi (Bagian 10.5 & 29) |
| 12 | **Feedback** | Dipakai untuk perbaikan rule/context/prompt | 7 opsi, **advisory** (tidak menyimpan apa pun) | Ditandai **simulasi** (Bagian 18 & 29) |
| 13 | **RBAC** | Akses dibatasi berdasarkan role, ketat | Tabel Team & Access ada, tetapi izin **tidak ditegakkan** | Ditandai belum ditegakkan (Bagian 20) |
| 14 | **Bahasa** | Diasumsikan konsisten Bahasa Indonesia | Semua halaman Indonesia, **kecuali Settings.html English** | Inkonsistensi dicatat (Bagian 29) — samakan ke Indonesia di produksi |
| 15 | **Generasi AI Konteks & pembayaran** | Diharapkan nyata | Timer simulasi (konteks ~2,8 dtk selalu profil Astra; pembayaran ~1,2 dtk) | Ditandai **simulasi** (Bagian 29) |
| 16 | **Ambang waktu (24 jam / 7 hari / cap 3–5)** | "Rule awal yang disarankan" | Filter periode kumulatif hadir; merge/close 7 hari tidak diuji | Tetap **business rule blueprint** (mockup tidak menyanggah) |

---

# 29. Status Kapabilitas: Simulasi/Visual vs Kebutuhan Produksi

Prototipe adalah **front-end statis tanpa backend**. Daftar ini memisahkan yang sudah benar-benar berfungsi dari yang hanya simulasi.

## 29.1 Sudah berfungsi (state berubah & persist ke `localStorage`)

Pergantian perusahaan; filter periode/perusahaan/prioritas/status review; pencarian global; simpan/hapus isu & laporan; tandai isu selesai; approve/share/perbaiki ringkasan laporan + transisi status; toggle notifikasi; simpan profil/company-context/notifikasi; ubah role/cabut/undang anggota tim; renew & ganti paket billing; status dibaca email + hitungan bell; penyelesaian onboarding.

## 29.2 Hanya simulasi / visual (tidak ada backend nyata)

- **Generasi "AI" Company Context** — timer tetap; selalu menghasilkan profil Astra yang sama tanpa memproses input.
- **Pemrosesan pembayaran** — timer ~1,2 dtk; renewal/invoice dipalsukan di klien.
- **Tautan sumber "Buka artikel asli"** dan kartu sumber laporan — hanya toast; `url` = `#sumber-egimedia`.
- **Pengiriman email** (alert langsung & ringkasan harian) — hanya arsip seed yang dirender.
- **Feedback** — advisory, tidak menyimpan apa pun.
- **Audit log** — belum ada (hanya "Catatan aktivitas" statis).
- **RBAC** — izin tidak ditegakkan.
- **Unggah dokumen** — hanya memvalidasi ekstensi; isi diabaikan.
- **"Change photo"** — toast demo.

## 29.3 Inkonsistensi untuk diselesaikan di produksi

- **Bahasa:** `Settings.html` seluruhnya **Bahasa Inggris**, halaman lain Bahasa Indonesia → samakan ke Bahasa Indonesia.
- **`alerts` vs `emails`:** dua sumber data paralel untuk "alert" → satukan menjadi satu model event yang men-generate email.
- **`onboardingComplete`** disimpan tetapi tidak ditegakkan → putuskan apakah onboarding menjadi gate.
- **Cap dashboard 5** dari 6 isu seed → cap final perlu ditegaskan (target 3–5).
