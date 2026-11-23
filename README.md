# Emergency Medicine Mastery – ATLS & ACLS Learning System

Aplikasi web personal (Bahasa Indonesia) untuk belajar ATLS & ACLS secara sistematis.
Tanpa build step: HTML + CSS + JavaScript ES modules, database lokal IndexedDB.

## Menjalankan

ES modules membutuhkan server HTTP (tidak bisa dibuka via `file://`):

```bash
cd emergency-mastery
python3 -m http.server 5173
```

Buka http://localhost:5173

## Fitur

| Fitur | Lokasi |
|---|---|
| Dashboard (progress, daily learning, mastery, skor quiz, kelemahan, heatmap) | `js/pages/dashboard.js` |
| 36 topik (21 ATLS, 15 ACLS) dengan 14 bagian per topik | `js/data/topics-*.js`, `js/pages/topic.js` |
| 10 algoritma interaktif (decision tree) | `js/data/algorithms.js`, `js/pages/algorithms.js` |
| 6 simulasi kasus bercabang dengan monitor vital & EKG | `js/data/cases.js`, `js/pages/cases.js` |
| Quiz engine: MCQ, kasus, decision, EKG, dosis (numerik), rapid-fire berwaktu, daily challenge, mode kelemahan | `js/data/quiz.js`, `js/pages/quiz.js` |
| Flashcards spaced repetition (SM-2) — topik, EKG, obat | `js/core/srs.js`, `js/pages/flashcards.js` |
| ECG library (20 ritme, strip SVG sintetis) + latihan identifikasi | `js/lib/ecg.js`, `js/data/ecg.js` |
| Drug reference (40+ obat) dengan mnemonic | `js/data/drugs.js` |
| Pocket reference (drawer, tombol `P`) | `js/pages/pocket.js` |
| Kalkulator: dosis BB, GCS, shock index, luka bakar, pediatrik, MAP/CPP, trombolitik | `js/pages/calculators.js` |
| Learning path + rekomendasi berbasis kesalahan | `js/pages/path.js`, `js/core/analytics.js` |
| AI tutor (Claude API, streaming, 5 mode, RAG dari materi lokal, mode offline) | `js/lib/ai.js`, `js/pages/tutor.js` |
| Search global, bookmark, catatan pribadi, mastered, streak, backup/restore JSON, dark mode | berbagai |

## Arsitektur

```
js/
  app.js          router hash, layout, tema, pocket drawer
  core/           db.js (IndexedDB) · store.js (state + persistensi) · srs.js · analytics.js · util.js
  data/           konten: topik, quiz, kasus, algoritma, obat, EKG, referensi
  lib/            ecg.js (generator strip) · search.js · ai.js (Claude)
  pages/          satu modul per halaman: export render(el, params, query)
```

- **Menambah topik:** tambahkan objek ke `js/data/topics-*.js` sesuai skema di `js/data/index.js`. Flashcard (`cards`), pencarian, dan learning path otomatis ikut.
- **Menambah soal / kasus / algoritma:** tambahkan entri di file data terkait.
- **Pindah ke backend:** ganti `loadAll/save` di `js/core/db.js` (mis. ke Supabase/Postgres); API `store.js` tetap.
- **AI tutor:** SDK resmi `@anthropic-ai/sdk` dimuat dari esm.sh. Kunci API disimpan di IndexedDB perangkat dan dikirim langsung ke Anthropic (`dangerouslyAllowBrowser`). Untuk pemakaian multi-user, pindahkan panggilan ke backend. Model default `claude-opus-5-5` dengan adaptive thinking, streaming, dan server-side refusal fallback.

## Konten klinis & disclaimer

Disusun dari AHA Guidelines (2020, Focused Update 2023, 2025), ACS ATLS (10th ed. 2018; 11th ed. 2025), BTF, ACC/AHA ACS 2025, AHA/ASA Stroke, dan sumber lain (lihat halaman *Sumber & Guideline*). Rincian yang berbeda antar-edisi atau tidak dapat dipastikan ditandai **⚠ verifikasi**.

Aplikasi ini adalah alat bantu belajar, **bukan** pengganti guideline resmi, kursus bersertifikat berinstruktur, supervisi klinis, atau penilaian dokter penanggung jawab.

## Dipakai di HP & offline (PWA)

**Versi online:** https://kevinorangjahat-byte.github.io/em-mastery/ (GitHub Pages dari branch `main`; setiap `git push` otomatis memperbarui situs).

Aplikasi ini adalah Progressive Web App: `manifest.webmanifest` (nama, logo, layar penuh) dan `sw.js` (cache semua file untuk offline).

1. **Hosting HTTPS** (wajib — service worker tidak jalan lewat `http://` IP lokal). Pilihan gratis: Netlify Drop (seret folder `emergency-mastery` ke https://app.netlify.com/drop), GitHub Pages, atau Cloudflare Pages.
2. Buka URL-nya sekali di HP saat online → tunggu toast "✔ Siap dipakai offline".
3. **iPhone (Safari):** Share → *Add to Home Screen*. **Android (Chrome):** menu ⋮ → *Install app / Add to Home screen*.
4. Setelah itu aplikasi terbuka dari ikon di layar utama, layar penuh, tanpa zoom, dan tetap jalan tanpa internet / walau laptop mati. AI tutor online tetap butuh internet.

**Update konten:** setelah mengubah file, naikkan `VERSION` di `sw.js`, unggah ulang; HP akan menampilkan "Versi baru tersedia".
**Progress:** tersimpan per perangkat. Pindahkan progress laptop ↔ HP lewat Pengaturan → Ekspor/Impor JSON.
