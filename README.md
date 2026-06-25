# CodingCamp-22June26-mjumligazali

# Expense & Budget Visualizer

Expense & Budget Visualizer adalah aplikasi web berbasis *mobile-friendly* yang dirancang untuk membantu pengguna mencatat pengeluaran harian, memantau sisa saldo secara *real-time*, dan melihat visualisasi distribusi keuangan mereka. 

Proyek ini dibangun menggunakan **Vanilla JavaScript** tanpa framework, dengan fokus pada kesederhanaan antarmuka (*clean UI*), performa yang ringan, dan persistensi data lokal.

---

## 📱 Penjelasan Fitur & Cara Kerja

### 1. Manajemen Transaksi Dinamis (MVP)
* **Formulir Input Valid:** Pengguna dapat memasukkan nama item, jumlah nominal (angka), serta memilih kategori default (`Food`, `Transport`, `Fun`). Sistem dilengkapi dengan validasi *frontend*—form tidak akan terkirim jika ada kolom yang kosong, mencegah data korup atau bernilai `NaN`.
* **Riwayat Transaksi (Scrollable List):** Setiap pengeluaran yang berhasil ditambahkan akan muncul dalam daftar list yang memiliki area *scroll* tersendiri agar tidak merusak tata letak halaman utama. Setiap item menampilkan informasi lengkap serta tombol **Delete** untuk menghapus riwayat secara instan.
* **Kalkulasi Saldo Otomatis (Live Total Balance):** Terpampang jelas di bagian atas aplikasi. Angka saldo ini akan melakukan kalkulasi ulang secara otomatis setiap kali pengguna menambahkan atau menghapus transaksi dari daftar.

### 2. Visual Analytics & Data Persistence
* **Grafik Pie Interaktif (Chart.js):** Memanfaatkan library Chart.js untuk mengubah data teks menjadi grafik lingkaran. Grafik ini membagi pengeluaran berdasarkan persentase kategori secara visual dan akan beranimasi serta memperbarui datanya secara otomatis (*auto-update*) setiap ada perubahan pada list transaksi.
* **Persistensi Data (Local Storage API):** Seluruh data pengeluaran disimpan langsung di dalam *storage* browser pengguna. Artinya, data tidak akan hilang meskipun halaman di-*refresh* atau browser ditutup, memberikan pengalaman layaknya aplikasi mobile asli tanpa memerlukan database backend.

### 3. Fitur Tambahan yang Diimplementasikan
* **Custom Categories:** Pengguna tidak terbatas pada 3 kategori bawaan; mereka bisa menambahkan kategori baru sesuai kebutuhan langsung dari aplikasi.
* **Monthly Summary View:** Filter visual atau ringkasan total pengeluaran yang dikelompokkan per bulan untuk evaluasi finansial jangka panjang.
* **Sorting System:** Fitur untuk mengurutkan daftar pengeluaran dari yang terbesar ke terkecil atau berdasarkan abjad kategori demi kemudahan pelacakan.
* **Budget Limit Warning:** Aplikasi akan memberikan highlight visual (misal warna merah) jika pengeluaran pada kategori tertentu atau total saldo melewati batas limit yang ditentukan.
* **Dark/Light Mode Toggle:** Fitur kenyamanan visual untuk beralih tema tampilan (gelap/terang) guna menghemat baterai ponsel atau kenyamanan mata di malam hari.

## 🛠️ Batasan Teknis & Arsitektur (Constraints)

Aplikasi ini dirancang dengan arsitektur *clean code* dan mengikuti batasan ketat berikut:
* **Arsitektur Tanpa Backend:** Berjalan sepenuhnya di sisi klien (*client-side only*), memastikan kecepatan muat (*load time*) yang instan dan privasi data pengguna yang aman di perangkat mereka sendiri.
* **Strict Vanilla Implementation:** Struktur menggunakan HTML5, modular *styling* dengan CSS3 (responsif untuk layar ponsel), dan manipulasi DOM murni menggunakan JavaScript modern (ES6+).
* **Aturan Folder Ketat:** Menjaga *maintainability* kode dengan struktur terpusat:
  * Maksimal 1 file stylesheet global di dalam `/css/style.css`
  * Maksimal 1 file logika utama di dalam `/js/app.js`

---

## 📂 Struktur Repositori

```text
├── css/
│   └── style.css          # Semua arsitektur layout, variabel warna, dan responsivitas
├── js/
│   └── app.js            # Logika manipulasi DOM, kalkulasi saldo, Chart.js, & LocalStorage
├── .kiro/                # Folder pelacakan tugas (Wajib untuk validasi submission)
├── index.html            # Struktur utama aplikasi web
└── README.md             # Dokumentasi proyek

```

---

## ⚙️ Menjalankan Proyek Secara Lokal

Karena proyek ini tidak membutuhkan server lokal (seperti Node.js atau Docker), Anda bisa menjalankannya dengan sangat mudah:

1. Clone repositori ini:

```bash
   git clone [https://github.com/jumli-gazali/CodingCamp-22June26-mjumligazali.git](https://github.com/jumli-gazali/CodingCamp-22June26-mjumligazali.git)

```

2. Buka folder proyek, lalu klik ganda pada file `index.html` untuk membukanya langsung di browser pilihan Anda (Chrome, Safari, Edge, Firefox).

---

## 👤 Kontributor

* **M. Jumli Gazali** - *Front-End Developer Participant* - [GitHub Profile](https://github.com/jumli-gazali/)

