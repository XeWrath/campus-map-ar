# 📖 Panduan Lengkap: Fitur AR — Campus Map FSM UNDIP

> **Dokumen ini berisi semua yang perlu diketahui untuk memahami, menjalankan, dan mengembangkan fitur Augmented Reality pada project Campus Map.**

---

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Arsitektur & Teknologi](#arsitektur--teknologi)
3. [Struktur File](#struktur-file)
4. [Cara Menjalankan](#cara-menjalankan)
5. [Cara Kerja AR](#cara-kerja-ar)
6. [Membuat File .mind (Image Target)](#membuat-file-mind-image-target)
7. [Menambah Gedung / Lokasi Baru](#menambah-gedung--lokasi-baru)
8. [Menambah Model 3D Baru](#menambah-model-3d-baru)
9. [Deployment ke Production](#deployment-ke-production)
10. [Kompatibilitas Browser](#kompatibilitas-browser)
11. [Troubleshooting](#troubleshooting)
12. [Referensi API](#referensi-api)

---

## Overview

Fitur AR memungkinkan user mengarahkan kamera HP ke **peta kampus FSM UNDIP** (yang sudah dicetak), lalu muncul **model 3D gedung** di atas peta secara real-time.

**Teknologi utama:**
- **MindAR.js v1.2.5** — Library AR image tracking (marker-based)
- **Three.js v0.160** — Rendering model 3D
- **Next.js 16** — Framework web utama (halaman AR standalone)

**Flow user:**
```
Buka website → Klik lokasi di peta → Redirect ke /ar.html
→ Kamera menyala → Scan peta kampus → Model 3D muncul!
```

---

## Arsitektur & Teknologi

### Kenapa Standalone HTML?

Halaman AR (`public/ar.html`) adalah **file HTML standalone**, bukan Next.js page. Alasannya:

| Masalah | Penjelasan |
|---------|------------|
| **Webpack bundling** | Next.js webpack mem-bundle MindAR + TF.js internal, merusak state management TF.js |
| **Three.js version** | MindAR v1.2.5 butuh Three.js **v0.160**, sedangkan project pakai v0.184 |
| **sRGBEncoding** | Konstanta `sRGBEncoding` sudah dihapus di Three.js v0.152+ |

**Solusi:** Halaman AR standalone dengan `<script type="importmap">` yang load library langsung dari CDN:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
    "mindar-image-three": "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js"
  }
}
</script>
```

### Diagram Arsitektur

```
┌─────────────────────────────────────────────┐
│  Next.js App (/map, /about, dll)            │
│  Three.js v0.184 (untuk non-AR pages)       │
│                                             │
│  User klik "Lihat AR"                       │
│         │                                   │
│         ▼                                   │
│  ARPageClient.tsx                            │
│  → window.location.href = "/ar.html?id=..." │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  public/ar.html (Standalone)                │
│                                             │
│  Three.js v0.160 ──── dari CDN (unpkg)      │
│  MindAR v1.2.5  ──── dari CDN (jsdelivr)    │
│  GLTFLoader     ──── dari CDN (unpkg)       │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ WebGL #1 │  │ WebGL #2 │  │  Camera  │  │
│  │ Three.js │  │ TF.js AI │  │ getUserM │  │
│  │ Renderer │  │ Inference│  │  edia    │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│       │              │             │        │
│       ▼              ▼             ▼        │
│  Render 3D    Track gambar    Video feed    │
└─────────────────────────────────────────────┘
```

---

## Struktur File

```
campus-map-ar/
├── public/
│   ├── ar.html                    ← ⭐ HALAMAN AR UTAMA
│   ├── targets/
│   │   ├── campus-map.mind        ← File image target (compiled)
│   │   └── image.png              ← Gambar asli peta kampus
│   └── models/
│       └── model_if.glb           ← Model 3D Gedung Informatika
│
├── src/components/ar/
│   ├── ARPageClient.tsx           ← Redirect Next.js → ar.html
│   ├── MindARScene.tsx            ← Component React (referensi, tidak dipakai langsung)
│   └── ARScene.tsx                ← Component AR lama (WebXR, deprecated)
│
├── scripts/
│   └── patch-mindar.js            ← Patch untuk npm package (postinstall)
│
├── next.config.ts                 ← Webpack fallback config
└── package.json                   ← Scripts & dependencies
```

### File-file Penting

| File | Fungsi |
|------|--------|
| `public/ar.html` | **File utama AR** — semua logika AR ada di sini |
| `public/targets/campus-map.mind` | File marker yang di-compile dari gambar peta |
| `public/targets/image.png` | Gambar asli peta kampus (untuk dicetak) |
| `public/models/model_if.glb` | Model 3D gedung Informatika (format GLTF Binary) |
| `src/components/ar/ARPageClient.tsx` | Komponen Next.js yang redirect ke ar.html |
| `scripts/patch-mindar.js` | Script otomatis untuk patch npm mind-ar (postinstall) |

---

## Cara Menjalankan

### Prerequisites
- Node.js 18+
- npm

### Langkah-langkah

```bash
# 1. Clone repository
git clone <repo-url>
cd campus-map-ar

# 2. Install dependencies (otomatis menjalankan patch-mindar.js)
npm install

# 3. Jalankan development server
npm run dev

# 4. Buka di CHROME (bukan Brave!)
# http://localhost:3000/ar.html?id=gedung-e
```

### Catatan Penting

> ⚠️ **HARUS pakai flag `--webpack`** di `npm run dev`.
> Sudah dikonfigurasi di `package.json`: `"dev": "next dev --webpack"`
> Jangan ubah ke Turbopack karena tidak kompatibel dengan konfigurasi mind-ar.

> ⚠️ **Buka di Chrome/Edge**, jangan Brave. Lihat bagian [Kompatibilitas Browser](#kompatibilitas-browser).

---

## Cara Kerja AR

### Flow Teknis (Step by Step)

```
1. User buka /ar → Next.js redirect ke /ar.html?id=gedung-e
2. Browser load Three.js + MindAR dari CDN via importmap
3. Cek browser (Brave → block, Chrome → lanjut)
4. Buat MindARThree instance → setup renderer, scene, camera
5. Tambah anchor untuk image target index 0
6. Load model 3D (.glb) via GLTFLoader
7. Panggil mindarThree.start():
   a. Minta izin kamera (getUserMedia)
   b. Fetch file .mind (campus-map.mind)
   c. Inisialisasi TF.js untuk AI inference
   d. Mulai video feed + tracking loop
8. Kamera menyala → status "Arahkan kamera ke peta"
9. Gambar peta terdeteksi → model 3D muncul di atas peta
10. Gambar hilang → model menghilang
```

### File .mind

File `.mind` adalah **compiled image target** yang berisi feature points dari gambar peta. MindAR menggunakan file ini untuk mencocokkan gambar yang dilihat kamera dengan target.

---

## Membuat File .mind (Image Target)

Kalau ingin mengganti gambar peta atau menambah target baru:

### 1. Siapkan gambar
- Format: PNG atau JPG
- Resolusi: minimal 300x300px (disarankan 800x800+)
- **Gambar harus punya detail/fitur yang kaya** (bukan gambar polos)
- Simpan gambar di `public/targets/`

### 2. Compile ke .mind
Buka tool compiler online MindAR:

👉 **https://hiukim.github.io/mind-ar-js-doc/tools/compile/**

- Upload gambar
- Klik **"Start"**
- Download file `.mind` yang dihasilkan
- Simpan ke `public/targets/campus-map.mind` (replace yang lama)

### 3. Update gambar referensi
Simpan juga gambar aslinya di `public/targets/image.png` supaya bisa dicetak untuk testing.

---

## Menambah Gedung / Lokasi Baru

### 1. Edit data lokasi di `ar.html`

Cari bagian `locations` di dalam `<script type="module">`:

```javascript
const locations = {
  'gedung-e': { 
    name: 'Gedung E - Informatika', 
    desc: 'Pusat kegiatan akademik...', 
    model: '/models/model_if.glb'    // path ke model 3D
  },
  'gedung-a': { 
    name: 'Gedung A - Matematika', 
    desc: 'Fasilitas perkuliahan...' 
    // tanpa model → akan pakai placeholder box
  },
  
  // ✅ TAMBAH LOKASI BARU DI SINI:
  'gedung-baru': {
    name: 'Nama Gedung',
    desc: 'Deskripsi gedung...',
    model: '/models/model_baru.glb'  // opsional
  },
};
```

### 2. Panggil dari URL

```
/ar.html?id=gedung-baru
```

### 3. Update link di halaman peta (Next.js)

Di komponen peta, ubah link AR agar mengarah ke id yang benar:

```tsx
<a href={`/ar?id=gedung-baru`}>Lihat AR</a>
```

---

## Menambah Model 3D Baru

### Format yang Didukung
- **GLB** (GLTF Binary) — ✅ Direkomendasikan
- **GLTF** — Bisa, tapi GLB lebih efisien (single file)

### Langkah-langkah

1. **Export model dari Blender/software 3D:**
   - Format: GLB
   - Pastikan skala wajar (1 unit ≈ 1 meter)
   - Include materials & textures

2. **Simpan ke folder models:**
   ```
   public/models/model_namagedung.glb
   ```

3. **Daftarkan di locations data:**
   ```javascript
   'gedung-baru': { 
     name: 'Gedung Baru', 
     desc: '...', 
     model: '/models/model_namagedung.glb' 
   },
   ```

### Kalau Tidak Punya Model 3D

Tidak masalah — kalau `model` tidak diisi atau file tidak ditemukan, otomatis akan tampil **placeholder box berwarna** sebagai pengganti.

---

## Deployment ke Production

### Vercel (Direkomendasikan)

```bash
# 1. Push ke GitHub
git add -A
git commit -m "feat: AR integration with MindAR"
git push origin main

# 2. Deploy di Vercel
# - Connect repo di vercel.com
# - Deploy otomatis
# - AR akan jalan di https://your-domain.vercel.app/ar.html?id=gedung-e
```

### Catatan HTTPS

> ⚠️ **Kamera (`getUserMedia`) butuh HTTPS di production.**
> - `localhost` → HTTP OK (pengecualian browser)
> - Production → **HARUS HTTPS** (Vercel otomatis HTTPS)
> - Kalau pakai VPS sendiri, pasang SSL (Let's Encrypt / Cloudflare)

### Testing di HP via Laptop (Development)

Pakai **ngrok** untuk expose localhost ke internet (otomatis HTTPS):

```bash
# Install ngrok
npm install -g ngrok

# Expose port 3000
ngrok http 3000

# Buka URL ngrok di HP → kamera bisa diakses
```

---

## Kompatibilitas Browser

MindAR butuh **2 WebGL context** bersamaan:
1. **Three.js** → untuk render model 3D
2. **TF.js** → untuk AI image tracking

| Browser | Engine | Status | Keterangan |
|---------|--------|--------|------------|
| **Google Chrome** | Chromium | ✅ Berfungsi | Browser utama yang direkomendasikan |
| **Microsoft Edge** | Chromium | ✅ Berfungsi | Chromium-based, harusnya lancar |
| **Opera** | Chromium | ✅ Berfungsi | Chromium-based |
| **Samsung Internet** | Chromium | ✅ Berfungsi | Penting untuk HP Samsung Android |
| **Firefox** | Gecko | ⚠️ Belum ditest | Engine berbeda, kemungkinan bisa |
| **Safari (iOS)** | WebKit | ⚠️ Terbatas | WebGL support lebih ketat |
| **Brave** | Chromium | ❌ Tidak bisa | Anti-fingerprinting blokir WebGL context kedua |

### Kenapa Brave Tidak Bisa?

Brave punya fitur **anti-fingerprinting** yang membatasi jumlah WebGL context. MindAR butuh 2 context (1 untuk rendering + 1 untuk AI), tapi Brave hanya izinkan 1. Ini **bukan bug kode** — ini kebijakan keamanan Brave.

Kode sudah otomatis mendeteksi Brave dan menampilkan pesan "Buka di Chrome/Edge".

---

## Troubleshooting

### ❌ "Gagal Memulai AR" / Timeout

**Penyebab:** WebGL context habis atau tidak tersedia.

**Solusi:**
1. Tutup tab browser lain yang berat (YouTube, Netflix, dll)
2. Buka di **Chrome** (bukan Brave)
3. Refresh halaman

### ❌ "Izin kamera ditolak"

**Solusi:**
1. Klik icon gembok 🔒 di address bar
2. Ubah "Camera" → **Allow**
3. Refresh halaman

### ❌ Kamera nyala tapi model tidak muncul

**Penyebab:** Gambar peta tidak terdeteksi.

**Solusi:**
1. Pastikan gambar peta cukup terang & jelas
2. Arahkan kamera **tegak lurus** ke peta (bukan miring)
3. Jarak ideal: 20-50 cm dari peta
4. Pastikan gambar yang di-scan sama persis dengan yang di-compile ke `.mind`

### ❌ "Module not found" atau error import

**Penyebab:** CDN tidak bisa diakses (offline / firewall).

**Solusi:**
1. Pastikan ada koneksi internet (CDN perlu diakses)
2. Cek apakah unpkg.com dan jsdelivr.net tidak diblokir
3. Kalau di jaringan kampus, coba pakai mobile data

### ❌ Model 3D tidak terlihat / terlalu kecil

**Solusi:** Edit skala di `ar.html`:

```javascript
// Cari baris ini di ar.html:
const scale = 1.0 / maxDim;  // Normalize ke 1 unit
model.scale.setScalar(scale);

// Ubah ke skala yang lebih besar:
const scale = 2.0 / maxDim;  // Jadi 2x lebih besar
```

### ❌ "npm run dev" error tentang Turbopack

**Solusi:** Pastikan `package.json` menggunakan flag `--webpack`:
```json
"scripts": {
  "dev": "next dev --webpack"
}
```

---

## Referensi API

### MindARThree Constructor

```javascript
const mindarThree = new MindARThree({
  container: document.getElementById('ar-container'),  // DIV container
  imageTargetSrc: '/targets/campus-map.mind',          // Path ke .mind file
  uiLoading: 'no',     // Matikan UI loading bawaan
  uiScanning: 'no',    // Matikan UI scanning bawaan
  uiError: 'no',       // Matikan UI error bawaan
});
```

### Properties

```javascript
const { renderer, scene, camera } = mindarThree;
// renderer → THREE.WebGLRenderer
// scene    → THREE.Scene
// camera   → THREE.PerspectiveCamera
```

### Methods

```javascript
// Tambah anchor (target index dimulai dari 0)
const anchor = mindarThree.addAnchor(0);

// Start AR (async — minta kamera + load .mind)
await mindarThree.start();

// Stop AR
mindarThree.stop();
```

### Anchor Events

```javascript
anchor.onTargetFound = () => {
  console.log('Target terdeteksi!');
};

anchor.onTargetLost = () => {
  console.log('Target hilang');
};

// Tambah objek 3D ke anchor
anchor.group.add(mesh);
```

### Docs Resmi MindAR

- Dokumentasi: https://hiukim.github.io/mind-ar-js-doc/
- GitHub: https://github.com/hiukim/mind-ar-js
- Compiler .mind: https://hiukim.github.io/mind-ar-js-doc/tools/compile/
- Contoh: https://hiukim.github.io/mind-ar-js-doc/examples/summary

---

## Catatan Pengembangan

### Kalau Ingin Upgrade MindAR

Saat ini pakai **MindAR v1.2.5 + Three.js v0.160** (dari CDN). Kalau MindAR rilis versi baru:

1. Cek changelogs di GitHub MindAR
2. Update versi di importmap (`ar.html` baris 12)
3. Cek apakah Three.js versi yang dibutuhkan berubah
4. Test di Chrome & HP

### Kalau Ingin Multiple Image Targets

Saat ini menggunakan 1 gambar target (peta kampus). Untuk multiple targets:

1. Compile beberapa gambar sekaligus di MindAR Compiler
2. File `.mind` akan berisi semua target
3. Tambah anchor per target:
   ```javascript
   const anchor0 = mindarThree.addAnchor(0); // Target pertama
   const anchor1 = mindarThree.addAnchor(1); // Target kedua
   ```
4. Masing-masing anchor bisa punya model 3D berbeda

---

*Terakhir diupdate: 1 Juni 2026*
