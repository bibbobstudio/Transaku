package id.bibbob.transaku;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.FilterOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(name = "BackupFile")
public class BackupFilePlugin extends Plugin {
  private final ConcurrentHashMap<String, String> pendingContents = new ConcurrentHashMap<>();

  @PluginMethod
  public void save(PluginCall call) {
    String content = call.getString("content"), fileName = call.getString("fileName", "transaku-backup.json");
    if (content == null || content.isEmpty()) { call.reject("Isi backup kosong; file tidak disimpan."); return; }
    pendingContents.put(call.getCallbackId(), content);
    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("application/json");
    intent.putExtra(Intent.EXTRA_TITLE, fileName);
    startActivityForResult(call, intent, "saveResult");
  }

  @ActivityCallback
  private void saveResult(PluginCall call, ActivityResult result) {
    if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { pendingContents.remove(call.getCallbackId()); call.reject("Penyimpanan backup dibatalkan."); return; }
    try {
      Uri uri = result.getData().getData();
      String content = pendingContents.remove(call.getCallbackId());
      if (content == null) content = call.getString("content");
      if (content == null || content.isEmpty()) { call.reject("Isi backup kosong; file tidak disimpan."); return; }
      OutputStream raw = getContext().getContentResolver().openOutputStream(uri, "wt");
      if (raw == null) { call.reject("Lokasi penyimpanan tidak dapat dibuka."); return; }
      CountingOutputStream stream = new CountingOutputStream(raw);
      try (OutputStreamWriter writer = new OutputStreamWriter(stream, StandardCharsets.UTF_8)) {
        writer.write(content);
      }
      if (stream.count == 0) { call.reject("Android tidak menulis isi backup ke file."); return; }
      JSObject response = new JSObject(); response.put("uri", uri.toString()); response.put("bytes", stream.count); call.resolve(response);
    } catch (Exception error) { pendingContents.remove(call.getCallbackId()); call.reject("Gagal menyimpan backup: " + error.getMessage(), error); }
  }

  private static class CountingOutputStream extends FilterOutputStream {
    long count = 0;
    CountingOutputStream(OutputStream output) { super(output); }
    @Override public void write(int value) throws IOException { out.write(value); count++; }
    @Override public void write(byte[] buffer, int offset, int length) throws IOException { out.write(buffer, offset, length); count += length; }
  }
}
