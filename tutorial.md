# 📖 Tutorial: Master InsightEngine AI (Industrial BI Guide)

Selamat datang di InsightEngine AI! Panduan ini akan membawa Anda dari nol—mulai dari menghubungkan data hingga menghasilkan laporan siap cetak (Board-Ready) untuk direksi.

---

## 🚀 Step 1: Menghubungkan Sumber Data

InsightEngine mendukung dua metode utama untuk memasukkan data:

### A. Integrasi Database Langsung

1. Buka menu **Connections** di sidebar kiri.
2. Klik **"Add Database"**.
3. Masukkan kredensial PostgreSQL Anda (Host, Port, DB Name, User, Password).
4. Klik **"Test Connection"**. Jika indikator berubah menjadi hijau, database Anda sudah terhubung secara aman (AES-256 encrypted).

### B. Impor Data Excel / CSV (AI Ingestion)

1. Di halaman utama, cari tombol **"Upload Data"** (ikon Paperclip atau Cloud).
2. Pilih file `.xlsx` atau `.csv` dari komputer Anda.
3. Sistem akan otomatis memproyeksikan data Anda menjadi tabel SQL asli di dalam schema `imports`.
4. AI akan langsung mengenali tabel barunya!

---

## 🔍 Step 2: Menganalisis Data dengan AI

Sekarang data Anda sudah masuk, mari kita bertanya pada AI.

1. Pastikan tab **"AI Prompt"** aktif di editor.
2. Ketik pertanyaan bisnis Anda dalam bahasa manusia, contoh:
    > "Tampilkan total penjualan per kategori produk dari data Excel yang barusan saya upload, gabungkan dengan nama customer dari database utama."
3. Klik **"Generate"**. AI akan menulis SQL yang kompleks secara otomatis.
4. Klik **"Run Query"** untuk melihat hasilnya di panel bawah.

---

## 🧠 Step 3: Membangun Visualisasi & Dashboard

Data mentah tidaklah cukup. Mari kita buat grafik yang indah.

1. Setelah hasil query muncul, klik tab **"Visualize"**.
2. Pilih tipe chart (Bar, Line, Pie, Area, atau Scatter).
3. Tentukan sumbu X dan Y (X-Axis dan Y-Axis).
4. Jika tampilannya sudah sesuai, klik **"Save to Dashboard"**.
5. Pilih dashboard tujuan atau buat dashboard baru (misal: "Sales Overview 2026").

---

## 📊 Step 4: Interaktivitas (Cross-Filtering)

InsightEngine memiliki fitur interaktif sekelas Power BI:

1. Buka menu **Dashboards**.
2. Pilih dashboard yang ingin Anda lihat.
3. **Cross-Filtering**: Klik salah satu segmen di Bar Chart. Perhatikan bagaimana chart lain (misal: Line Chart) akan otomatis terfilter sesuai dengan segmen yang Anda pilih.
4. Fitur ini memungkinkan Anda melakukan *Drill-Down* data secara visual tanpa menulis satu baris kode pun.

---

## 📄 Step 5: Export & Sharing (Board-Ready)

Setelah laporan Anda sempurna, saatnya membagikannya ke pemangku kepentingan.

### A. Export ke PDF (Print-Ready)

1. Di toolbar atas dashboard, klik tombol **"Export"**.
2. Pilih **"Export as PDF"**.
3. Sistem akan melakukan render High-DPI dan mengunduh file PDF yang siap dipresentasikan di rapat direksi.

### B. Export ke Gambar (PNG)

1. Pilih **"Export as Image"** di menu yang sama.
2. Hasilnya adalah gambar PNG resolusi tinggi untuk disematkan di slide PowerPoint atau pesan WhatsApp.

### C. Publish ke Web

1. Klik tombol **"Share"**.
2. Aktifkan toggle **"Make Public"**.
3. Salin link unik untuk dashboard Anda dan bagikan ke tim Anda.

---

## 💡 Tips Pro: Semantic Modeling

Jika AI tidak menemukan hubungan antar tabel tertentu, Anda bisa mendefinisikannya secara virtual di menu **Semantic Layer**. Ini akan memberitahu AI bahwa `customer_id` di tabel A sama dengan `id` di tabel B, sehingga AI bisa melakukan `JOIN` dengan jauh lebih akurat!

---

**Selamat Beranalisis!** 🚀
Jika Anda butuh bantuan lebih lanjut, cukup sapa AI di terminal atau chat interface.
