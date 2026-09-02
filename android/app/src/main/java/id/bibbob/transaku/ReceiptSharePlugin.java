package id.bibbob.transaku;

import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "ReceiptShare")
public class ReceiptSharePlugin extends Plugin {
  @PluginMethod
  public void share(PluginCall call) {
    try {
      String data = call.getString("dataBase64"), fileName = call.getString("fileName", "struk-transaku.png");
      if (data == null || data.isEmpty()) { call.reject("Gambar struk tidak tersedia."); return; }
      File folder = new File(getContext().getCacheDir(), "shared"); if (!folder.exists()) folder.mkdirs();
      File image = new File(folder, fileName);
      try (FileOutputStream stream = new FileOutputStream(image)) { stream.write(Base64.decode(data, Base64.DEFAULT)); }
      Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", image);
      Intent intent = new Intent(Intent.ACTION_SEND); intent.setType("image/png"); intent.putExtra(Intent.EXTRA_STREAM, uri); intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
      getActivity().startActivity(Intent.createChooser(intent, "Bagikan struk")); call.resolve(new JSObject());
    } catch (Exception error) { call.reject("Tidak dapat membagikan struk: " + error.getMessage(), error); }
  }
}
