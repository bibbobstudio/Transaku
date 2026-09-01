# APK Transaku yang bisa diperbarui

Android hanya dapat memasang pembaruan bila APK baru memakai **kunci tanda tangan yang sama** dan `versionCode` yang lebih besar. Workflow ini sudah menaikkan versi otomatis berdasarkan nomor build GitHub Actions.

## Cara tanpa memasang Java (disarankan)

1. Push perubahan ini ke GitHub.
2. Buka tab **Actions** → workflow **Buat Kunci Tanda Tangan Android** → **Run workflow**.
3. Setelah selesai, unduh artifact `Transaku-signing-key-RAHASIA`.
4. Buka masing-masing file `.txt` di dalamnya dan buat GitHub Secret sesuai nama file (isi file menjadi nilai secret):
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, dan `ANDROID_KEY_PASSWORD`.
   Dua file password sengaja berisi nilai yang sama.
5. Simpan file `transaku-release.jks` di tempat aman sebagai cadangan, lalu hapus artifact dari GitHub setelah secret berhasil dibuat.

File tersebut adalah identitas APK Transaku. Jangan unggah ke repository atau membagikannya.

## Cara lewat PC dengan Java

Lakukan sekali saja bila Java/JDK sudah tersedia dan `keytool` dapat dijalankan:

```powershell
keytool -genkeypair -v -keystore transaku-release.jks -alias transaku -keyalg RSA -keysize 2048 -validity 10000
```

Simpan kata sandi yang diminta. Jangan unggah file `.jks` ke repository dan jangan menghapusnya.

Lalu, buat Base64 dari file tersebut:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\transaku-release.jks")) | Set-Clipboard
```

Di repository GitHub, buka **Settings → Secrets and variables → Actions → New repository secret**, lalu buat empat secret berikut:

| Nama secret | Isi |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Tempel Base64 yang sudah disalin |
| `ANDROID_KEYSTORE_PASSWORD` | Password keystore |
| `ANDROID_KEY_ALIAS` | `transaku` (atau alias yang dibuat) |
| `ANDROID_KEY_PASSWORD` | Password kunci; biasanya sama dengan password keystore |

Sesudah mengisi secret, jalankan kembali workflow **Build Android APK** dan unduh artifact **Transaku-APK**. APK baru akan dapat diperbarui di atas APK yang juga dibangun dengan workflow ini.

> APK lama yang sudah terpasang kemungkinan tetap perlu dihapus **sekali terakhir**, karena dulu ditandatangani dengan kunci debug sementara dari runner GitHub.
