# Smart Hall Environment System 🏛️🔥

Sistem pemantauan lingkungan gedung berbasis IoT secara real-time yang dirancang untuk mendeteksi asap, suhu, dan potensi kebakaran secara otomatis demi keamanan sivitas akademika. Proyek ini dikembangkan oleh HIMATRO Universitas Lampung untuk kegiatan **Electrical Goes To School 2026**.

## 🌟 Fitur Utama
- **Pemantauan Suhu Real-time:** Membaca suhu menggunakan sensor DHT22.
- **Deteksi Asap:** Membaca kadar gas/asap menggunakan sensor MQ-2.
- **Sistem Peringatan Dini:** Menyalakan Buzzer dan indikator lampu LED RGB sesuai dengan level bahaya.
- **Sirkulasi Otomatis:** Mengaktifkan kipas (Ventilation Fan) ketika suhu ruangan tinggi.
- **Penanganan Kebakaran:** Mengaktifkan pompa air secara otomatis ketika terdeteksi indikasi kebakaran (asap pekat + suhu ekstrem, atau deteksi api dari Flame Sensor).
- **Dashboard Web Interaktif:** Antarmuka web tanggap (responsif) yang menerima dan memvisualisasikan data secara nirkabel (*wireless*) menggunakan protokol MQTT.

## 🛠️ Teknologi & Perangkat Keras
**Hardware (IoT):**
- Mikrokontroler: ESP32
- Sensor: DHT22 (Suhu & Kelembaban), MQ-2 (Asap/Gas), Flame Sensor (Api/Nyala)
- Output: LCD I2C 16x2, Active Buzzer, Modul Relay (untuk Pompa & Kipas), LED RGB

**Software / Web Dashboard:**
- Dasar: HTML5, CSS3, Vanilla JavaScript
- Visualisasi: Canvas API (Grafik Riwayat Suhu)
- Komunikasi Data: Paho MQTT Client (melalui protokol MQTT over WebSockets)
- Firmware IoT: Arduino IDE (C++) dengan library `PubSubClient`.

## 📡 Konfigurasi MQTT
Sistem ini menggunakan perantara MQTT Broker memfasilitasi komunikasi komunikasi antara Hardware (ESP32) dan Software (Browser).
- **MQTT Broker:** `broker.emqx.io` (Public/Free Broker)
- **Port Komunikasi:** 
  - ESP32 (TCP): `1883`
  - Browser/Web (WebSockets): `8083`
- **Topik Publikasi (Publish/Subscribe):**
  - Data Suhu: `smarthall/sensor/suhu`
  - Data Asap/PPM: `smarthall/sensor/asap`

## 🚀 Panduan Instalasi & Menjalankan Sistem

### Bagian 1: Menjalankan Web Dashboard
Website ini adalah *frontend* statis murni, sehingga proses menjalankannya sangat mudah:
1. Jika dijalankan secara **Lokal (Offline)**: Anda cukup "*double click*" file `index.html` dan membukanya di browser (Chrome/Edge/Safari). Dashboard akan otomatis terhubung ke cloud MQTT asalkan laptop Anda memiliki koneksi internet.
2. Jika dijalankan secara **Global (Online)**: Anda dapat mengunggah (drag & drop) seluruh folder ini ke repositori publik di **GitHub**, lalu mengaktifkan fitur **GitHub Pages** di menu Settings. Web dapat diakses dari URL publik.

### Bagian 2: Menyiapkan Alat (ESP32)
1. Buka file *source code* berformat `.ino` menggunakan aplikasi **Arduino IDE**.
2. Pastikan Anda telah menginstal beberapa library berikut lewat *Library Manager*:
   - `DHT sensor library` oleh Adafruit
   - `LiquidCrystal I2C` oleh Frank de Brabander
   - `PubSubClient` oleh Nick O'Leary
3. Di dalam kode program, ubah baris `SSID` dan `PASSWORD` agar sesuai dengan *hotspot* atau WiFi yang ada di ruangan Anda.
4. Hubungkan *board* ESP32 ke laptop menggunakan kabel USB, pilih port yang sesuai, dan jalankan proses **Upload**.
5. Setelah sukses, berikan daya pada alat (bisa lewat powerbank atau adaptor). Alat akan otomatis menyesuaikan diri, terhubung ke internet, dan melemparkan data pembacaan langsung ke Dashboard Web!

## 👨‍💻 Tim Pengembang
Dikembangkan sepenuh hati oleh:
- **Muhammad Fadhel Saputra** (NPM 2415061097)
- **Himpunan Mahasiswa Teknik Elektro (HIMATRO) - Universitas Lampung**
