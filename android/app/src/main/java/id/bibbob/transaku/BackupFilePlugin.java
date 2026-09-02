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
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "BackupFile")
public class BackupFilePlugin extends Plugin {
  @PluginMethod
  public void save(PluginCall call) {
    String content = call.getString("content"), fileName = call.getString("fileName", "transaku-backup.json");
    if (content == null) { call.reject("Isi backup tidak tersedia."); return; }
    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("application/json");
    intent.putExtra(Intent.EXTRA_TITLE, fileName);
    startActivityForResult(call, intent, "saveResult");
  }

  @ActivityCallback
  private void saveResult(PluginCall call, ActivityResult result) {
    if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.reject("Penyimpanan backup dibatalkan."); return; }
    try {
      Uri uri = result.getData().getData();
      String content = call.getString("content", "");
      try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri)) {
        stream.write(content.getBytes(StandardCharsets.UTF_8));
      }
      JSObject response = new JSObject(); response.put("uri", uri.toString()); call.resolve(response);
    } catch (Exception error) { call.reject("Gagal menyimpan backup: " + error.getMessage(), error); }
  }
}
