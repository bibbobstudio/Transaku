package id.bibbob.transaku;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.FilterOutputStream;
import java.io.IOException;
import java.io.Writer;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "BackupFile")
public class BackupFilePlugin extends Plugin {
  private File pendingFile() { return new File(getContext().getCacheDir(), "transaku-backup-pending.json"); }

  @PluginMethod
  public void save(PluginCall call) {
    String content = call.getString("content"), fileName = call.getString("fileName", "transaku-backup.json");
    if (content == null || content.isEmpty()) { call.reject("Isi backup kosong; file tidak disimpan."); return; }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { saveToDownloads(call, content, fileName); return; }
    try (Writer writer = new OutputStreamWriter(new FileOutputStream(pendingFile()), StandardCharsets.UTF_8)) {
      writer.write(content);
    } catch (Exception error) { call.reject("Gagal menyiapkan backup: " + error.getMessage(), error); return; }
    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("application/json");
    intent.putExtra(Intent.EXTRA_TITLE, fileName);
    startActivityForResult(call, intent, "saveResult");
  }

  private void saveToDownloads(PluginCall call, String content, String fileName) {
    ContentValues values = new ContentValues();
    values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
    values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Transaku");
    values.put(MediaStore.Downloads.IS_PENDING, 1);
    Uri uri = null;
    try {
      uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
      if (uri == null) throw new IllegalStateException("Android tidak dapat membuat file di Download/Transaku.");
      OutputStream raw = getContext().getContentResolver().openOutputStream(uri, "wt");
      if (raw == null) throw new IllegalStateException("File di Download/Transaku tidak dapat dibuka.");
      CountingOutputStream stream = new CountingOutputStream(raw);
      try (Writer writer = new OutputStreamWriter(stream, StandardCharsets.UTF_8)) { writer.write(content); }
      if (stream.count == 0) throw new IllegalStateException("Android tidak menulis isi backup ke file.");
      ContentValues published = new ContentValues(); published.put(MediaStore.Downloads.IS_PENDING, 0);
      getContext().getContentResolver().update(uri, published, null, null);
      JSObject response = new JSObject(); response.put("uri", uri.toString()); response.put("bytes", stream.count); response.put("location", "Download/Transaku"); call.resolve(response);
    } catch (Exception error) {
      if (uri != null) getContext().getContentResolver().delete(uri, null, null);
      call.reject("Gagal menyimpan backup ke Download/Transaku: " + error.getMessage(), error);
    }
  }

  @ActivityCallback
  private void saveResult(PluginCall call, ActivityResult result) {
    File cached = pendingFile();
    if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { cached.delete(); call.reject("Penyimpanan backup dibatalkan."); return; }
    try {
      Uri uri = result.getData().getData();
      if (!cached.isFile() || cached.length() == 0) { call.reject("Data backup sementara hilang sebelum disimpan. Coba lagi dan jangan tutup aplikasi saat pemilih file terbuka."); return; }
      OutputStream raw = getContext().getContentResolver().openOutputStream(uri, "wt");
      if (raw == null) { call.reject("Lokasi penyimpanan tidak dapat dibuka."); return; }
      CountingOutputStream stream = new CountingOutputStream(raw);
      try (InputStream input = new FileInputStream(cached); OutputStream output = stream) {
        byte[] buffer = new byte[16 * 1024];
        int length;
        while ((length = input.read(buffer)) != -1) output.write(buffer, 0, length);
      }
      if (stream.count == 0) { call.reject("Android tidak menulis isi backup ke file."); return; }
      cached.delete();
      JSObject response = new JSObject(); response.put("uri", uri.toString()); response.put("bytes", stream.count); response.put("location", "lokasi pilihan"); call.resolve(response);
    } catch (Exception error) { call.reject("Gagal menyimpan backup: " + error.getMessage(), error); }
  }

  private static class CountingOutputStream extends FilterOutputStream {
    long count = 0;
    CountingOutputStream(OutputStream output) { super(output); }
    @Override public void write(int value) throws IOException { out.write(value); count++; }
    @Override public void write(byte[] buffer, int offset, int length) throws IOException { out.write(buffer, offset, length); count += length; }
  }
}
