# Rencana UI/UX
## AI-Powered News Dashboard EGI Media

**Status:** Handoff plan untuk tim UI/UX  
**Versi:** 1.0  
**Tanggal:** 18 Juli 2026  
**Persona utama:** CEO / C-Level  
**Referensi utama:**

- `Docs/AI-Powered-News-Dashboard-EGI-Media.md`
- `Mockup/Reference/Executive-Summary.png`
- `Mockup/Reference/Executive-Summary-Side-Panel.png`

---

## 1. Tujuan Dokumen

Dokumen ini menjadi acuan kerja tim UI/UX untuk merancang aplikasi **AI-Powered News Dashboard EGI Media**. Isinya menerjemahkan blueprint kebutuhan bisnis dan mockup referensi menjadi spesifikasi yang dapat digunakan untuk:

- Menyusun information architecture.
- Membuat user flow dan wireframe.
- Mengembangkan high-fidelity design.
- Menetapkan komponen dan design token.
- Menentukan perilaku tiap halaman, komponen, dan state.
- Menyiapkan prototype untuk usability testing.
- Menjadi referensi implementasi frontend.

Dokumen ini bukan spesifikasi API atau desain visual final yang menggantikan keputusan designer. Nilai warna, ukuran, dan komponen yang diberi label **proposal** perlu divalidasi terhadap design system EGI Media sebelum masuk tahap development.

## 2. Keputusan Produk yang Sudah Dikunci

### 2.1 Jumlah halaman utama

Aplikasi memiliki **5 halaman utama**:

1. Executive Summary.
2. Alerts.
3. Reports.
4. Saved.
5. Settings.

### 2.2 Bukan halaman utama terpisah

- **Search** adalah fitur global pada header dan hasilnya ditampilkan dalam konteks halaman Executive Summary. Search tidak memiliki menu sidebar sendiri pada versi ini.
- **Detail isu** dibuka melalui right side panel/drawer. Detail tidak dihitung sebagai halaman utama baru.
- **Profile** dan **Logout** berada di menu avatar kanan atas.
- **Subscription & Billing** berada sebagai subbagian atau subpage di Settings.
- Laporan harian, mingguan, dan bulanan berada dalam modul Reports menggunakan tab atau segmented control.

### 2.3 Prinsip pengalaman

- CEO dapat memahami kondisi utama dalam beberapa detik.
- Dashboard menampilkan maksimal 3–5 isu aktif yang paling penting.
- Informasi ringkas ditampilkan lebih dahulu; detail muncul saat diminta.
- Fakta, analisis, dan asumsi selalu dipisahkan.
- Setiap insight dapat ditelusuri ke artikel asli EGI Media.
- Sistem membantu pengambilan keputusan, tetapi tidak mengambil keputusan final.
- Prioritas tidak disampaikan melalui warna saja; selalu gunakan label dan ikon.
- Human review tetap tersedia untuk insight, prioritas, status isu, dan laporan.

---

## 3. Model Mental Pengguna

CEO tidak datang untuk membaca seluruh berita. CEO datang untuk menjawab:

1. Apa yang terjadi?
2. Mengapa hal ini penting bagi perusahaan?
3. Apa potensi dampaknya?
4. Risiko apa yang perlu dipertimbangkan?
5. Apa yang perlu dipantau selanjutnya?

UI harus mengoptimalkan alur **scan → understand → verify → decide what needs attention**.

### 3.1 Kebutuhan emosional dan kognitif

Pengguna perlu merasa bahwa:

- Layar utama tidak membebani.
- Urutan isu dapat dipercaya.
- Alasan prioritas transparan.
- Insight memiliki dasar sumber yang jelas.
- Bahasa tidak menggurui atau memerintah.
- Sistem tidak menyamarkan ketidakpastian sebagai fakta.
- Isu lama mudah ditemukan kembali.

### 3.2 Persona dan kebutuhan akses

| Persona | Tujuan utama | Kebutuhan UI |
|---|---|---|
| CEO / C-Level | Menentukan isu yang perlu perhatian | Ringkasan cepat, prioritas, dampak, risiko, sumber |
| Direktur / pimpinan unit | Memahami isu sesuai fungsi | Filter company context, laporan, saved items |
| Analyst | Memeriksa dan memperbaiki insight | Source traceability, edit, merge/split, status, audit |
| Admin | Mengatur akses dan konfigurasi | User management, role, billing, company context |

---

## 4. Information Architecture

```text
EGI Media
└── Executive Dashboard
    ├── Executive Summary
    │   ├── Filter periode
    │   ├── Global Search results
    │   ├── Active issue list
    │   └── Issue detail drawer
    ├── Alerts
    │   ├── Semua
    │   ├── Belum dibaca
    │   ├── Disimpan
    │   └── Selesai
    ├── Reports
    │   ├── Harian
    │   ├── Mingguan
    │   ├── Bulanan
    │   └── Review / approval state
    ├── Saved
    │   ├── Isu
    │   ├── Alert
    │   └── Laporan
    └── Settings
        ├── Profile
        ├── Company Context
        ├── Notifications
        ├── Team & Access
        └── Subscription & Billing
```

### 4.1 Navigasi global

Sidebar desktop berisi:

- Logo/nama EGI Media.
- Dashboard / Executive Summary.
- Alerts.
- Reports.
- Saved.
- Divider.
- Settings di bagian bawah.

Search tidak menjadi item sidebar. Kolom search tetap berada di header agar tersedia dari halaman utama mana pun.

### 4.2 Navigasi mobile

Pada layar sempit, sidebar berubah menjadi:

- Top bar dengan menu button.
- Drawer navigasi ketika menu dibuka; atau bottom navigation untuk 4 modul utama.
- Settings dan menu akun dapat diakses dari avatar/menu.

Prioritas navigasi mobile: Executive Summary, Alerts, Reports, Saved. Jangan menampilkan semua sub-menu sekaligus.

---

## 5. Struktur App Shell

### 5.1 Desktop

Mengikuti mockup reference:

- Sidebar tetap di kiri dengan lebar proposal 240–256 px.
- Header berada di area konten dengan tinggi proposal 80–92 px.
- Area konten memiliki padding horizontal proposal 28–32 px.
- Konten utama menggunakan lebar yang cukup agar kartu isu tetap mudah dibaca.
- Right drawer mengambil sekitar 36–40% lebar viewport saat terbuka.

### 5.2 Header

Elemen header dari kiri ke kanan:

1. Judul halaman.
2. Company selector, misalnya `EGI Holding`.
3. Global search: `Cari isu, topik, atau laporan...`.
4. Notification bell.
5. Avatar dan status pengguna.

Perilaku:

- Company selector hanya tersedia jika pengguna memiliki akses ke lebih dari satu company context.
- Search dapat difokuskan dengan keyboard shortcut yang ditentukan kemudian.
- Bell menampilkan unread count secara non-intrusif.
- Avatar membuka menu Profile, Preferences, Subscription & Billing, dan Logout sesuai role.

### 5.3 Company selector

Dropdown menampilkan:

- Nama perusahaan aktif.
- Logo/ikon perusahaan.
- Daftar company context yang dapat diakses.
- Indikator context aktif.

Saat perusahaan diganti:

- Tampilkan loading state singkat.
- Refresh daftar isu, alert, saved items, dan laporan.
- Tampilkan nama company aktif secara konsisten.
- Jangan mencampurkan data antarperusahaan.

### 5.4 Avatar menu

Menu yang disarankan:

- Lihat profile.
- Preferences.
- Subscription & Billing, untuk role yang berwenang.
- Help atau contact support, jika tersedia.
- Logout.

Logout menggunakan confirmation hanya jika ada pekerjaan review yang belum disimpan. Jika tidak, aksi dapat langsung dilakukan.

---

## 6. Arah Visual dan Design Tokens

Reference menjadi baseline visual. Tujuan arah visual adalah **tenang, profesional, fokus pada isi, dan mudah dipindai**.

### 6.1 Tipografi

Gunakan satu keluarga font sans-serif modern secara konsisten. **Inter** adalah proposal awal karena cocok untuk UI data dan dashboard; gunakan font resmi EGI Media jika sudah tersedia.

| Token | Proposal | Penggunaan |
|---|---:|---|
| Display / page title | 28–32 px, 700 | Judul halaman utama |
| Section title | 20–24 px, 600–700 | Judul bagian |
| Card title | 18–20 px, 600–700 | Judul isu |
| Body | 15–16 px, 400 | Ringkasan dan uraian |
| Body emphasis | 15–16 px, 500–600 | Label penting |
| Caption | 12–14 px, 400–500 | Timestamp, metadata |
| Button / label | 13–14 px, 500–600 | Button, badge, status |

Aturan tipografi:

- Judul isu harus dapat dipindai tanpa membuka detail.
- Ringkasan kartu maksimal 2–3 baris pada desktop; gunakan line clamp setelah itu.
- Jangan menggunakan ALL CAPS untuk isi utama.
- Timestamp memakai format ringkas, misalnya `Diperbarui 08:45`.
- Gunakan kalimat langsung dan konkret.

### 6.2 Warna

Nilai berikut merupakan proposal awal yang menangkap karakter reference. Tim UI/UX perlu menguji kontras dan menyelaraskannya dengan brand token final.

| Token | Nilai proposal | Penggunaan |
|---|---|---|
| `primary` | `#2563EB` | Link, selected state, focus, aksi utama |
| `primary-soft` | `#EFF6FF` | Background selected dan info |
| `text-strong` | `#111827` | Heading dan judul isu |
| `text-default` | `#374151` | Body text |
| `text-muted` | `#6B7280` | Metadata dan timestamp |
| `surface` | `#FFFFFF` | Card dan panel |
| `canvas` | `#F9FAFB` | Background aplikasi |
| `border` | `#E5E7EB` | Divider dan border |
| `high` | `#DC2626` | Prioritas tinggi |
| `high-soft` | `#FEF2F2` | Background prioritas tinggi |
| `medium` | `#D97706` | Prioritas sedang |
| `medium-soft` | `#FFFBEB` | Background prioritas sedang |
| `low` | `#6B7280` | Prioritas rendah |
| `new` | `#2563EB` | Status Baru |
| `developing` | `#F59E0B` | Status Berkembang |
| `monitored` | `#16A36A` | Status Dipantau |
| `success` | `#15803D` | Aksi berhasil |
| `danger` | `#B91C1C` | Error atau destructive action |

Warna prioritas harus selalu berpasangan dengan teks `Tinggi`, `Sedang`, atau `Rendah`, serta ikon yang relevan.

### 6.3 Spacing dan bentuk

Proposal spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48 px.

- Padding kartu: 20–24 px.
- Jarak antar kartu: 16–20 px.
- Radius input dan button: 8–10 px.
- Radius card/panel: 12–16 px.
- Border: 1 px, warna netral lembut.
- Shadow: minimal; gunakan border dan surface untuk hierarchy.
- Fokus aktif: outline 2 px dengan warna primary dan offset yang terlihat.

### 6.4 Ikon

Gunakan satu library ikon yang konsisten, misalnya Lucide atau icon set resmi EGI Media.

- Ikon navigasi: 20–22 px.
- Ikon status: 14–16 px.
- Ikon section pada drawer: 20–22 px.
- Ikon harus mendukung label, bukan menggantikannya.

---

## 7. Halaman 1 — Executive Summary

### 7.1 Tujuan

Memberikan ringkasan kondisi terbaru perusahaan melalui maksimal 3–5 isu yang paling membutuhkan perhatian.

### 7.2 Struktur halaman

Urutan visual:

1. Header aplikasi.
2. Filter periode: `24 jam`, `7 hari`, `30 hari`.
3. Supporting text: `3–5 isu terpenting yang perlu perhatian saat ini`.
4. Daftar issue cards.
5. Empty, loading, atau error state sesuai kondisi.

Jangan menambahkan dashboard KPI, grafik, atau feed berita penuh pada area utama kecuali ada kebutuhan produk baru yang tervalidasi.

### 7.3 Filter periode

Default: `24 jam`.

Makna filter:

- `24 jam`: perkembangan terbaru.
- `7 hari`: perkembangan dalam satu minggu.
- `30 hari`: konteks lebih luas.

Periode mengacu pada **perkembangan terakhir**, bukan umur isu. Isu tiga hari lalu tetap dapat tampil jika hari ini memiliki update penting.

### 7.4 Issue card anatomy

Setiap kartu memuat:

- Ranking isu.
- Judul isu.
- Ringkasan satu kalimat.
- Priority badge.
- Status badge.
- Waktu pembaruan.

Format ringkasan yang disarankan:

> `[Peristiwa utama] berpotensi [dampak utama] bagi perusahaan karena [hubungan dengan bisnis perusahaan].`

Aturan konten:

- Maksimal 1–2 angka utama.
- Angka harus berasal dari sumber.
- Satuan dan periode harus jelas.
- Estimasi harus diberi label sebagai estimasi.
- Jangan memakai frasa umum seperti `berdampak signifikan` tanpa penjelasan.

### 7.5 Interaksi kartu

- Seluruh kartu dapat diklik atau memiliki button yang jelas untuk membuka detail.
- Hover menampilkan perubahan border/shadow yang halus.
- Focus keyboard terlihat jelas.
- Kartu aktif memiliki border primary atau background primary-soft.
- Klik isu lain saat drawer terbuka mengganti isi drawer tanpa menutup drawer.
- Setelah drawer ditutup, posisi scroll dan kartu aktif tetap terjaga.

### 7.6 Issue detail drawer

Drawer muncul dari kanan dan mempertahankan daftar isu di sisi kiri.

Header drawer:

- Judul isu.
- Priority badge.
- Status badge.
- Timestamp.
- Close button.

Isi drawer mengikuti urutan:

1. Apa yang terjadi.
2. Mengapa penting bagi perusahaan.
3. Dampak utama.
4. Risiko utama.
5. Hal yang perlu dipantau.
6. Fakta.
7. Analisis untuk perusahaan.
8. Asumsi analisis.
9. Sumber.

Pemisahan bagian:

- Gunakan heading bernomor atau label yang konsisten.
- Gunakan divider halus antarbagian.
- Jangan menyatukan fakta dan analisis dalam satu bullet tanpa label.
- Asumsi diberi treatment visual berbeda dan label eksplisit `Asumsi analisis`.
- Sumber diberi link yang jelas dan ikon external link.

### 7.7 Aksi pada drawer

Aksi minimum:

- Simpan isu.
- Beri feedback relevan/tidak relevan.
- Tandai selesai, untuk role berwenang.
- Ubah prioritas/status, untuk analyst atau role berwenang.
- Buka sumber di tab baru.

Jika aksi membutuhkan perubahan data, gunakan toast konfirmasi dan jangan menghilangkan konteks pengguna.

### 7.8 Drawer responsive

- Desktop: right drawer 36–40% viewport.
- Tablet: drawer 50–65% viewport.
- Mobile: drawer berubah menjadi full-screen sheet dengan header sticky.
- Close button harus selalu terlihat.
- Body drawer dapat scroll; header dan action area boleh sticky.

### 7.9 Search dalam Executive Summary

Kolom header merupakan global search. Saat pengguna mengetik:

- Tampilkan suggestion setelah minimal 2 karakter.
- Cari isu, topik, dan laporan.
- Gunakan debounce agar tidak terasa berat.
- Tampilkan kategori hasil dan timestamp.
- Enter membuka result state dalam area konten yang sama.
- Filter hasil berdasarkan periode, prioritas, status, tipe, dan kategori.
- Detail hasil tetap menggunakan drawer.
- Tombol clear mengembalikan daftar isu default.

State pencarian:

- Empty query: tampilkan placeholder.
- Typing: tampilkan suggestion/loading kecil.
- No result: `Tidak ada hasil untuk kata kunci ini.`
- Result: tampilkan jumlah hasil dan filter aktif.
- Error: `Pencarian gagal. Coba lagi.`

---

## 8. Halaman 2 — Peringatan

### 8.1 Tujuan

Menjadi arsip email yang dikirim EGI Media ke pengguna, bukan salinan Executive Summary atau detail isu. Lonceng di header memberi awareness atas email baru; halaman ini memungkinkan CEO membaca salinan email tersebut di aplikasi.

### 8.2 Struktur halaman

- Page title: `Peringatan`.
- Dua tab terpisah: `Alert Langsung` dan `Ringkasan Harian`.
- Default menampilkan daftar email seperti inbox: pengirim, subject, preview, waktu kirim, dan status unread.
- Klik email membuka email reader pada halaman yang sama dengan tombol kembali ke inbox.

### 8.3 Isi dan perilaku email

- Alert Langsung memuat prioritas, judul isu, perkembangan baru, dampak perubahan, waktu, dan CTA `Buka Detail Isu`.
- Ringkasan Harian memuat pengantar serta maksimal 3–5 item isu berisi prioritas, judul, perkembangan terbaru, dan CTA per item.
- Email dibaca ditandai setelah reader berhasil dimuat; tidak ada aksi simpan, selesai, atau feedback pada email.
- CTA baru membuka issue drawer saat pengguna secara eksplisit meminta detail isu.
- Lonceng menampilkan daftar terbaru lintas tipe dengan label jenis email; klik item membuka reader email terkait.

### 8.4 Empty state

Contoh copy:

> Belum ada email Alert Langsung. Email yang dikirim EGI Media akan tersimpan di sini.

Jangan gunakan empty state yang mengesankan pengiriman email gagal.

---

## 9. Halaman 3 — Reports

### 9.1 Tujuan

Membantu pengguna melihat perkembangan dan pola dalam rentang waktu yang lebih panjang.

### 9.2 Struktur halaman

- Page title: `Reports`.
- Tab: Harian, Mingguan, Bulanan.
- Filter periode dan status review.
- Report cards atau table list.
- Search/report filter opsional.

### 9.3 Laporan harian

Fokus:

- Perkembangan terbaru.
- Isu prioritas tinggi dan sedang.
- Dampak dan risiko jangka dekat.
- Hal yang perlu dipantau berikutnya.

Card laporan memuat tanggal, jumlah isu, status, dan waktu terakhir diperbarui.

### 9.4 Laporan mingguan

Harus memungkinkan perbandingan dengan minggu sebelumnya:

- Isu baru.
- Isu memburuk atau membaik.
- Isu selesai.
- Perubahan prioritas.
- Pergeseran fokus risiko.
- Perkembangan kompetitor dan regulasi.

### 9.5 Laporan bulanan

Harus memungkinkan perbandingan dengan bulan sebelumnya:

- Pola isu berulang.
- Risiko yang meningkat atau menurun.
- Kondisi pasar.
- Aktivitas kompetitor.
- Perubahan regulasi.
- Peluang strategis.
- Topik yang mulai penting.

### 9.6 Report detail

Saat laporan dibuka, tampilkan:

- Judul dan periode laporan.
- Status draft/reviewed/approved/shared.
- Ringkasan eksekutif.
- Isu utama.
- Perbandingan periode.
- Risiko, peluang, dan hal yang perlu dipantau.
- Sumber tiap insight.
- Activity/audit log.

### 9.7 Review laporan

Untuk user berwenang:

- Edit copy.
- Ubah prioritas.
- Tambah atau hapus insight.
- Periksa source.
- Beri komentar internal.
- Approve versi final.
- Bagikan laporan.

Gunakan status yang terlihat jelas:

`Draft → In review → Approved → Shared`.

Jika ada perubahan setelah approved, buat status kembali menjadi `Needs review` dan simpan histori versi.

---

## 10. Halaman 4 — Saved

### 10.1 Tujuan

Menyediakan tempat untuk menemukan kembali isu atau laporan yang dianggap penting.

### 10.2 Struktur halaman

- Page title: `Saved`.
- Tab: Isu dan Reports.
- Search dalam daftar saved.
- Filter periode, prioritas, status, dan kategori.
- Item list dengan timestamp disimpan.

### 10.3 Saved issue item

Memuat judul, prioritas, status isu, ringkasan, waktu update terakhir, dan waktu disimpan.

Klik item membuka drawer yang sama dengan Executive Summary. Unsave dapat dilakukan dari list atau drawer dengan konfirmasi ringan.

### 10.4 Empty state

Untuk tab isu:

> Belum ada isu yang disimpan. Simpan isu penting agar mudah ditemukan kembali.

Tambahkan CTA kembali ke Executive Summary jika dibutuhkan.

---

## 11. Halaman 5 — Settings

### 11.1 Tujuan

Mengatur identitas pengguna, konteks perusahaan, notifikasi, akses tim, dan subscription tanpa mengganggu alur membaca insight.

### 11.2 Struktur navigasi Settings

Gunakan settings sub-navigation atau section list:

1. Profile.
2. Company Context.
3. Notifications.
4. Team & Access.
5. Subscription & Billing.

### 11.3 Profile

Field minimum:

- Nama.
- Foto/avatar.
- Jabatan.
- Email.
- Zona waktu.
- Bahasa tampilan.

Gunakan explicit save jika perubahan memiliki dampak luas. Tampilkan success toast setelah tersimpan.

### 11.4 Company Context

Data yang dapat direview dan diperbarui:

- Nama perusahaan.
- Deskripsi.
- Industri/subindustri.
- Produk dan layanan.
- Target pelanggan.
- Wilayah operasi.
- Kompetitor.
- Prioritas bisnis.
- Tujuan bisnis.
- Risiko yang diperhatikan.
- Topik pantauan.
- Ketergantungan bisnis.

UX requirement:

- Tampilkan kapan context terakhir diperbarui.
- Tampilkan siapa yang memperbarui.
- Jika data berasal dari sumber tertentu, tampilkan sumbernya.
- Beri peringatan bahwa perubahan context dapat memengaruhi relevansi dan prioritas insight.
- User tanpa hak edit hanya dapat melihat.

### 11.5 Notifications

Pengaturan yang disarankan:

- Alert langsung prioritas tinggi.
- Ringkasan harian.
- Laporan mingguan.
- Laporan bulanan.
- Waktu pengiriman.
- Zona waktu.
- Kanal email.

Jelaskan bahwa semua alert tetap tersimpan di aplikasi meskipun email dimatikan.

### 11.6 Team & Access

Tabel user memuat nama, email, role, status, last active, dan aksi.

Role:

- CEO/C-Level: akses strategic insight sesuai izin.
- Direktur: akses sesuai company atau unit.
- Analyst: review dan koreksi insight.
- Admin: user, role, context, dan billing.

Gunakan confirmation dan audit log untuk perubahan role, invite, revoke, atau perubahan akses lintas company.

### 11.7 Subscription & Billing

Tampilkan:

- Paket saat ini.
- Status subscription.
- Tanggal renewal.
- Metode pembayaran tersamarkan.
- Usage atau limit jika relevan.
- Tombol `Renew subscription`.
- Upgrade/downgrade jika tersedia.
- Invoice/payment history.

Renewal flow:

1. User memilih Renew subscription.
2. Tampilkan ringkasan paket dan total biaya.
3. Tampilkan metode pembayaran.
4. User mengonfirmasi.
5. Tampilkan status proses.
6. Tampilkan hasil berhasil/gagal dan langkah berikutnya.

Jangan menampilkan tombol billing kepada role yang tidak berwenang.

### 11.8 Logout

Logout tersedia di avatar menu. Setelah logout, arahkan ke halaman login dan jangan mempertahankan data sensitif di layar.

---

## 12. Komponen Reusable

Komponen yang perlu dibuat sebagai bagian design system:

- App shell.
- Sidebar navigation.
- Header.
- Company selector.
- Global search.
- Avatar menu.
- Notification bell.
- Segmented period filter.
- Tabs.
- Issue card.
- Priority badge.
- Issue status badge.
- Timestamp metadata.
- Side drawer.
- Section block.
- Source link item.
- Feedback control.
- Save/bookmark button.
- Alert item.
- Report card.
- Review status badge.
- Data table.
- Empty state.
- Skeleton loader.
- Toast.
- Modal/confirmation dialog.
- Pagination atau load more, bila diperlukan.
- Form field, select, combobox, toggle, date range picker.

Setiap komponen harus memiliki dokumentasi:

- Default.
- Hover.
- Focus.
- Active/selected.
- Disabled.
- Loading.
- Error.
- Mobile behavior.
- Content limits.

---

## 13. State dan Feedback Sistem

### 13.1 Loading

- Gunakan skeleton pada area yang sedang dimuat.
- Pertahankan struktur layout agar tidak terjadi layout jump.
- Jangan mengganti seluruh halaman dengan spinner jika hanya drawer yang loading.

### 13.2 Empty

Empty state harus menjelaskan alasan dan langkah berikutnya. Hindari copy yang terlalu teknis.

### 13.3 Error

Copy harus menjelaskan tindakan:

> Data belum dapat dimuat. Coba lagi atau hubungi administrator jika masalah berlanjut.

Sediakan `Coba lagi` pada konteks yang sama.

### 13.4 Success

Gunakan toast singkat untuk save, update, feedback, atau approval. Toast tidak boleh menjadi satu-satunya tempat untuk menyampaikan hasil kritis.

### 13.5 Unsaved changes

Jika user meninggalkan form Company Context, Profile, atau Review Report yang berubah:

- Tampilkan warning dialog.
- Pilihan: `Simpan perubahan`, `Buang perubahan`, `Batal`.

### 13.6 Permission denied

Tampilkan halaman atau inline state yang menjelaskan bahwa user tidak memiliki akses. Jangan membocorkan judul atau isi data yang tidak berwenang.

---

## 14. Content Design dan Copywriting

### 14.1 Gaya bahasa

- Sederhana.
- Langsung.
- Ringkas.
- Berorientasi pada arti bisnis.
- Tidak akademis.
- Tidak menggunakan istilah asing jika ada padanan mudah.

### 14.2 Pilihan kata

Gunakan:

- `Berpotensi`.
- `Dapat`.
- `Kemungkinan`.
- `Perlu dipertimbangkan`.
- `Perlu dipantau`.
- `Opsi tindak lanjut`.

Hindari:

- `Keputusan yang harus diambil`.
- `Pasti terjadi`.
- `Tindakan terbaik adalah`.
- `Segera jalankan`.

### 14.3 Contoh copy

Baik:

> Kenaikan tarif impor 15% berpotensi meningkatkan biaya bahan baku perusahaan dalam beberapa bulan ke depan.

Kurang baik:

> Kebijakan terbaru berpotensi memberikan dampak signifikan terhadap perusahaan.

Untuk rekomendasi, gunakan:

> Opsi tindak lanjut: Pertimbangkan evaluasi pemasok alternatif dan simulasi dampak kenaikan biaya.

Jangan gunakan:

> Keputusan: Segera ganti pemasok dan naikkan harga jual.

---

## 15. Source Traceability

Komponen sumber harus menjawab:

- Artikel apa yang digunakan?
- Kapan artikel dipublikasikan?
- Siapa penulis atau redaksinya?
- Klaim apa yang didukung?
- Di mana artikel asli dapat dibaca?

Source item minimum:

- Judul artikel.
- Tanggal publikasi.
- Penulis/redaksi.
- Deskripsi fakta yang didukung.
- Link artikel asli EGI Media.
- Source ID internal jika tampil untuk analyst.

Link sumber membuka artikel asli di tab baru. Detail drawer tetap terbuka di tab aplikasi.

Jika sumber tidak cukup, UI harus menyatakan:

> Data belum cukup untuk mendukung kesimpulan ini.

AI tidak boleh membuat source, URL, angka, atau fakta yang tidak tersedia.

---

## 16. Status dan Prioritas Isu

### 16.1 Status isu

| Status | Makna | Treatment UI |
|---|---|---|
| Baru | Isu pertama dibuat dan belum lebih dari 24 jam | Dot biru + label Baru |
| Berkembang | Ada berita/fakta baru | Dot amber + label Berkembang |
| Dipantau | Belum ada berita baru tetapi masih relevan | Dot hijau + label Dipantau |
| Selesai | Tidak ada perkembangan 7 hari atau ditutup manual | Arsip; tidak tampil di dashboard default |

### 16.2 Prioritas

| Prioritas | Makna | Treatment UI |
|---|---|---|
| Tinggi | Relevansi, dampak, urgensi, atau kebaruan sangat besar | Label merah + ikon naik |
| Sedang | Perlu dipahami tetapi tidak segera | Label amber + ikon netral |
| Rendah | Relevan sebagai konteks | Label netral |

Detail alasan prioritas harus dapat dilihat dari drawer atau tooltip yang accessible. Jangan menyembunyikan alasan hanya di hover.

---

## 17. Alur Pengguna Utama

### 17.1 Memahami isu prioritas tinggi

1. User membuka aplikasi.
2. Executive Summary menampilkan 3–5 isu.
3. User memindai judul, ringkasan, prioritas, status, dan waktu update.
4. User memilih isu.
5. Drawer terbuka.
6. User membaca dampak, risiko, fakta, analisis, asumsi, dan hal yang perlu dipantau.
7. User membuka sumber di tab baru jika ingin verifikasi.
8. User menyimpan isu atau memberi feedback.

### 17.2 Mencari isu lama

1. User mengetik kata kunci di global search.
2. Suggestion menampilkan isu, topik, dan laporan.
3. User menekan Enter.
4. Area Executive Summary berubah menjadi hasil pencarian.
5. User memakai filter.
6. User membuka hasil melalui drawer.

### 17.3 Meninjau laporan

1. User membuka Reports.
2. User memilih Harian, Mingguan, atau Bulanan.
3. User memilih report.
4. User membaca ringkasan dan perbandingan periode.
5. User memeriksa sumber.
6. Reviewer memperbaiki konten bila perlu.
7. Reviewer menyetujui atau membagikan versi final.

### 17.4 Memperbarui Company Context

1. User berwenang membuka Settings.
2. User memilih Company Context.
3. User meninjau data dan sumbernya.
4. User mengedit field.
5. UI memberi peringatan dampak perubahan terhadap insight.
6. User menyimpan.
7. UI menampilkan konfirmasi dan waktu update terakhir.

### 17.5 Renew subscription

1. User membuka avatar atau Settings.
2. User memilih Subscription & Billing.
3. User meninjau paket dan tanggal renewal.
4. User memilih Renew subscription.
5. User mengonfirmasi biaya dan metode pembayaran.
6. UI menampilkan hasil transaksi.

---

## 18. Responsive Behavior

### Desktop ≥ 1200 px

- Sidebar penuh.
- Header dengan company selector dan search.
- Issue cards menggunakan layout horizontal.
- Drawer kanan mempertahankan list isu tetap terlihat.

### Tablet 768–1199 px

- Sidebar dapat dipadatkan menjadi icon rail.
- Search dapat mengambil baris header tersendiri.
- Drawer mengambil lebar lebih besar.
- Card tetap mempertahankan metadata penting.

### Mobile < 768 px

- Sidebar menjadi navigation drawer.
- Header berisi menu, judul ringkas, search icon, dan avatar.
- Filter periode dapat menjadi horizontal scroll atau dropdown.
- Issue card berubah menjadi stacked layout.
- Priority dan status tetap terlihat tanpa harus membuka card.
- Drawer detail menjadi full-screen sheet.
- Tables pada Reports berubah menjadi cards atau horizontal scroll yang terkontrol.
- Jangan menyembunyikan fakta, analisis, atau sumber; ubah urutan dan layout saja.

---

## 19. Accessibility

Minimum requirement:

- Semua interaksi tersedia dengan keyboard.
- Focus state terlihat jelas.
- Urutan tab mengikuti urutan visual dan logis.
- Drawer menggunakan dialog semantics, memiliki nama, dan mengembalikan fokus ke trigger saat ditutup.
- Escape menutup drawer atau modal, kecuali ada unsaved changes yang harus ditangani.
- Semua ikon informatif memiliki accessible label.
- Warna tidak menjadi satu-satunya penanda status.
- Kontras teks normal dan label diuji.
- Target klik/tap minimal proposal 44 × 44 px untuk aksi penting.
- Screen reader dapat membaca prioritas dan status secara tekstual.
- Tabel memiliki header yang jelas.
- Error form terhubung ke field yang bermasalah.

Target compliance: WCAG 2.2 AA, sejauh sesuai dengan ruang lingkup aplikasi.

---

## 20. Feedback dan Human Review

Feedback yang tersedia:

- Relevan.
- Tidak relevan.
- Prioritas terlalu tinggi.
- Prioritas terlalu rendah.
- Analisis kurang tepat.
- Isu duplikat.
- Tidak perlu dipantau lagi.

UX feedback:

- Sediakan opsi feedback dekat dengan insight.
- Gunakan popover singkat agar tidak mengganggu membaca.
- Sediakan field komentar opsional.
- Setelah dikirim, tampilkan konfirmasi.
- Jangan mengubah prioritas secara permanen hanya dari satu feedback tanpa proses evaluasi.

Human review dapat dilakukan untuk:

- Mengubah prioritas.
- Mengubah status.
- Merge/split issue.
- Mengoreksi insight.
- Memeriksa source.
- Menyetujui laporan.

Semua perubahan manual perlu tercatat dalam audit log.

---

## 21. Role-Based UI

| Kemampuan | CEO | Direktur | Analyst | Admin |
|---|---:|---:|---:|---:|
| Melihat Executive Summary | Ya | Ya | Ya | Ya |
| Melihat alert dan laporan | Ya | Ya | Ya | Ya |
| Menyimpan dan memberi feedback | Ya | Ya | Ya | Ya |
| Mengedit Company Context | Sesuai izin | Sesuai izin | Dapat direview | Ya |
| Mengubah prioritas/status isu | Opsional | Opsional | Ya | Ya |
| Review laporan | Opsional | Ya | Ya | Ya |
| Mengelola user dan role | Tidak | Tidak | Tidak | Ya |
| Mengelola billing | Sesuai izin | Tidak | Tidak | Ya |

UI harus menyembunyikan atau men-disable aksi yang tidak diizinkan, tetapi bukan hanya mengandalkan frontend. Validasi akses tetap tanggung jawab backend.

---

## 22. Analytics UX yang Perlu Diukur

Event yang disarankan:

- `executive_summary_viewed`
- `period_filter_changed`
- `issue_card_opened`
- `issue_drawer_closed`
- `source_link_opened`
- `issue_saved`
- `issue_unsaved`
- `feedback_submitted`
- `global_search_started`
- `global_search_completed`
- `alert_opened`
- `alert_marked_read`
- `report_opened`
- `report_review_started`
- `report_approved`
- `company_context_viewed`
- `company_context_updated`
- `subscription_renewal_started`
- `subscription_renewal_completed`

Jangan mengumpulkan isi sensitif dalam analytics event. Gunakan ID internal dan metadata minimum yang diperlukan.

---

## 23. Acceptance Criteria UI/UX

### Global

- [ ] App shell konsisten di seluruh halaman.
- [ ] Company context aktif selalu terlihat.
- [ ] Search tersedia dari header dan tidak menjadi page sidebar terpisah.
- [ ] Avatar menu menyediakan profile, billing sesuai izin, dan logout.
- [ ] Semua halaman memiliki loading, empty, error, dan permission state.
- [ ] Fokus keyboard dan kontras telah diuji.

### Executive Summary

- [ ] Default menampilkan maksimal 3–5 isu.
- [ ] Default period adalah 24 jam.
- [ ] Kartu berisi judul, prioritas, ringkasan, status, dan waktu update.
- [ ] Isu diurutkan berdasarkan prioritas.
- [ ] Detail terbuka melalui side drawer.
- [ ] Drawer memisahkan fakta, analisis, dan asumsi.
- [ ] Source link menuju artikel asli EGI Media.
- [ ] Search menghasilkan result state di konteks halaman yang sama.

### Peringatan

- [ ] Semua email yang dikirim tersimpan sebagai arsip di aplikasi.
- [ ] Alert Langsung dan Ringkasan Harian berada pada tab terpisah.
- [ ] Unread/read dapat dibedakan secara non-color-only.
- [ ] Klik email membuka email reader, bukan issue drawer.
- [ ] CTA di dalam email baru dapat membuka detail isu.

### Reports

- [ ] Tersedia tab harian, mingguan, dan bulanan.
- [ ] Laporan mingguan membandingkan minggu sebelumnya.
- [ ] Laporan bulanan membandingkan bulan sebelumnya.
- [ ] Status review terlihat.
- [ ] Laporan dapat direview, dikoreksi, dan disetujui oleh role berwenang.
- [ ] Sumber insight dapat ditelusuri.

### Saved

- [ ] Isu, alert, dan laporan dapat disimpan.
- [ ] Saved items dapat dicari dan difilter.
- [ ] Item membuka drawer/detail yang konsisten.
- [ ] Unsave memberikan feedback yang jelas.

### Settings

- [ ] Profile dapat dilihat dan diperbarui sesuai izin.
- [ ] Company Context dapat direview dan diperbarui sesuai izin.
- [ ] Preference alert/email tersedia.
- [ ] Team & Access menampilkan role dan status.
- [ ] Subscription & Billing menampilkan renewal dan aksi renew sesuai izin.
- [ ] Logout dapat diakses dari avatar menu.

---

## 24. Deliverables Tim UI/UX

### Fase 1 — Foundation

- User flow utama.
- Sitemap dan route map.
- Design token awal.
- Component inventory.
- Accessibility baseline.

### Fase 2 — Wireframe

- Executive Summary default.
- Executive Summary dengan drawer terbuka.
- Search result state.
- Alerts dengan unread dan empty state.
- Reports dengan tab dan review state.
- Saved dengan empty state.
- Settings, termasuk Company Context dan Billing.

### Fase 3 — High fidelity

- Desktop ≥1200 px.
- Tablet 768–1199 px.
- Mobile <768 px.
- Semua state penting.
- Semua role-restricted state.

### Fase 4 — Prototype dan validasi

- Prototype klik untuk alur CEO.
- Usability test dengan skenario membaca isu.
- Usability test membuka sumber.
- Usability test review laporan.
- Validasi subscription renewal.
- Perbaikan berdasarkan temuan.

### Fase 5 — Handoff development

- Figma component library.
- Naming dan token.
- Spacing, typography, color, icon specification.
- Redline atau inspect-ready component.
- Copy deck.
- Interaction notes.
- Accessibility notes.
- State matrix.
- Export asset bila diperlukan.

---

## 25. Scope MVP dan Pengembangan Berikutnya

### MVP

- Executive Summary dengan filter 24 jam/7 hari/30 hari.
- Issue card dan detail drawer.
- Source traceability.
- Alerts in-app.
- Reports harian/mingguan/bulanan dengan status review dasar.
- Saved items.
- Settings: Profile, Company Context, Notifications, Team & Access dasar.
- Avatar menu dengan Logout.

### Setelah MVP

- Subscription billing lengkap.
- Advanced search dan saved search.
- Komentar kolaboratif pada report.
- Perbandingan isu yang lebih visual.
- Relationship graph antarberita.
- Export/share report yang lebih kompleks.
- Personalized dashboard layout.

Fitur tambahan tidak boleh mengorbankan prinsip utama: ringkas, relevan, dapat ditelusuri, dan decision-support.

---

## 26. Open Questions untuk Validasi Produk

Pertanyaan berikut tidak menghambat pembuatan wireframe awal, tetapi perlu diputuskan sebelum final UI:

1. Font brand resmi apa yang harus digunakan jika bukan Inter?
2. Apakah user dapat memiliki lebih dari satu company context?
3. Apakah CEO dapat mengedit Company Context atau hanya melihat?
4. Apakah Billing berada di aplikasi yang sama atau sistem eksternal?
5. Apakah laporan akan dibagikan melalui aplikasi, email, atau keduanya?
6. Apakah analyst dapat mengedit copy AI langsung di drawer?
7. Apakah detail isu memerlukan focus/full-page mode pada desktop?
8. Berapa lama audit log harus dapat ditampilkan?
9. Apakah ada kategori industri dan region standar?
10. Apakah bahasa pertama hanya Bahasa Indonesia atau bilingual?

---

## 27. Ringkasan untuk Tim UI/UX

Aplikasi ini memiliki 5 halaman utama: Executive Summary, Alerts, Reports, Saved, dan Settings.

Executive Summary adalah pusat pengalaman. Halaman ini menampilkan 3–5 isu paling penting dalam kartu yang ringkas. Pencarian global tetap berada di header dan hasilnya ditampilkan dalam konteks halaman tersebut. Ketika user memilih isu, detail muncul dari kanan melalui drawer agar daftar isu tetap terlihat.

Reference mockup dipertahankan sebagai baseline visual: layout bersih, sidebar kiri, header sederhana, kartu dengan border lembut, aksen biru, label prioritas, status isu, dan timestamp. Penyempurnaan difokuskan pada state, responsive behavior, accessibility, role-based action, source traceability, account menu, dan Subscription & Billing.

Keberhasilan UI diukur dari kemampuan CEO untuk memahami isu penting, mengetahui dampaknya bagi perusahaan, menilai risiko, memeriksa sumber, dan menentukan hal yang perlu diperhatikan—tanpa UI menyatakan keputusan final atas nama manusia.
