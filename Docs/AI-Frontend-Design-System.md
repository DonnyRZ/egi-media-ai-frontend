# EGI Media AI Frontend — Design System Dasar

Status: Sprint 02 — Design direction  
Source: `Mockup/css/app.css`, Mockup Executive Summary, dan kontrak integrasi Sprint 01.

## 1. Design direction

EGI Media AI adalah ruang kerja intelligence untuk eksekutif, bukan admin panel generik. Visual final harus terasa premium, tenang, editorial, dan mudah dipindai dalam beberapa detik.

Prinsip visual:

- **Quiet authority** — kontras cukup untuk keputusan penting, tanpa warna berisik.
- **Editorial intelligence** — heading display memakai Fraunces; isi dan kontrol memakai Plus Jakarta Sans.
- **Signal hierarchy** — warna hanya dipakai untuk priority, status, alert, dan action.
- **Dense but breathable** — informasi padat, tetapi setiap card punya ruang napas.
- **One obvious next action** — setiap surface utama memiliki satu CTA dominan.
- **No template-admin look** — hindari gradient dekoratif, card berlebihan, border tebal, dan KPI tanpa makna.

## 2. Tokens

Token canonical ada di `src/shared/design-tokens.ts`. CSS custom properties pada `src/app/globals.css` adalah kontrak styling komponen.

### Color

| Token | Value | Usage |
|---|---|---|
| ink | `#111827` | Heading dan primary text |
| text | `#374151` | Body text |
| muted | `#6B7280` | Metadata dan helper |
| canvas | `#F7F8FA` | App background |
| surface | `#FFFFFF` | Card, panel, drawer |
| border | `#E5E7EB` | Separator |
| primary | `#2563EB` | Link, CTA, active navigation |
| high | `#DC2626` | Priority tinggi/urgent |
| medium | `#D97706` | Priority sedang |
| low | `#6B7280` | Priority rendah |
| success | `#15803D` | Approved/completed |
| developing | `#F59E0B` | Status berkembang |
| monitored | `#16A36A` | Status dipantau |

Red dan amber adalah signal, bukan dekorasi. Semantic color selalu disertai label/icon.

### Typography

| Role | Family | Size/weight |
|---|---|---|
| Display/page title | Fraunces | `32px`, 600; mobile `26px` |
| Section title | Fraunces | `22px`, 600 |
| Card title | Plus Jakarta Sans | `15–17px`, 600–700 |
| Body | Plus Jakarta Sans | `15px`, 400; line-height `1.55` |
| Metadata | Plus Jakarta Sans | `13px`, 400–500 |
| Badge/eyebrow | Plus Jakarta Sans | `11px`, 600 |

Gunakan sentence case. Jangan pakai Fraunces untuk paragraf panjang, tabel, atau form control.

### Spacing, radius, elevation, motion

- Base spacing `4px`; rhythm umum `8 / 12 / 16 / 20 / 24 / 32 / 40px`.
- Page gutter `clamp(16px, 3vw, 40px)`; card padding `20px`; control padding `12px`.
- Radius `8px` control, `12px` card, `14px` panel; pill hanya badge/tab.
- `shadow-sm` untuk separation, `shadow-md` untuk menu, drawer shadow hanya pada overlay.
- Motion `120ms` micro, `180ms` standard, `240ms` drawer; easing `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Hormati `prefers-reduced-motion: reduce`.

## 3. Component standards

- Priority badge: `tinggi` merah, `sedang` amber, `rendah` muted; selalu tampilkan teks.
- Status badge: `baru` biru, `berkembang` amber, `dipantau` hijau, `selesai` neutral.
- Issue title adalah anchor visual; priority/lifecycle berada dekat title; source/freshness menjadi metadata.
- Card memakai satu surface dan satu border; hindari nested bordered card lebih dari dua level.
- Active navigation memakai soft primary background, bukan blok berat.
- Drawer desktop `min(520px, 38vw)`, tablet sekitar `55vw`, mobile `100vw`.
- Drawer wajib punya close action, focus management, dan Escape support.

## 4. Responsive layout

### Desktop — `≥ 1200px`

Sidebar persistent sekitar `272px`, header minimum `96px`, content max-width `1440px`, gutter sampai `40px`. Issue detail tampil sebagai right drawer tanpa kehilangan konteks dashboard.

### Tablet — `768px–1199px`

Sidebar menjadi icon rail/overlay. Header mempertahankan company switcher dan search; utilitas sekunder boleh masuk overflow. Grid turun menjadi satu kolom utama; drawer sekitar `55vw`.

### Mobile — `< 768px`

Single column dengan gutter `16px`. Search dan company switcher ditumpuk. Card padding `16px`. Detail issue menjadi full-screen sheet dengan header sticky. Table berubah menjadi stacked rows atau horizontal scroll bila benar-benar diperlukan.

## 5. Accessibility and interaction quality

- Touch target minimal `44 × 44px`.
- Focus ring selalu terlihat dan memakai primary blue.
- Contrast WCAG AA; status/priority tidak boleh hanya dibedakan warna.
- Loading memakai skeleton atau reserved space; error, empty, retryable, dan stale adalah state yang dirancang.
- Motion tidak boleh diperlukan untuk memahami perubahan state.

## 6. Visual QA gate

Setiap screen berikutnya harus lolos:

1. Executive dapat menemukan isu terpenting dalam tiga detik.
2. Company dan period aktif terlihat jelas.
3. Priority, lifecycle, freshness, dan source tidak tercampur.
4. Loading, error, dan empty state tetap tenang dan tidak terasa rusak.
5. Visual terasa seperti intelligence workspace, bukan template admin.
