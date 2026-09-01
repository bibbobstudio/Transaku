package id.bibbob.transaku;

import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

@CapacitorPlugin(name = "ShareReceiver")
public class ShareReceiverPlugin extends Plugin {
  @PluginMethod
  public void getSharedImage(PluginCall call) {
    Intent intent = getActivity().getIntent();
    if (!Intent.ACTION_SEND.equals(intent.getAction()) || !intent.getType().startsWith("image/")) { call.resolve(new JSObject()); return; }
    Uri image = intent.getParcelableExtra(Intent.EXTRA_STREAM);
    JSObject result = new JSObject();
    if (image != null) {
      try (InputStream stream = getContext().getContentResolver().openInputStream(image); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
        byte[] buffer = new byte[8192]; int read;
        while ((read = stream.read(buffer)) != -1) bytes.write(buffer, 0, read);
        result.put("uri", "data:" + intent.getType() + ";base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP));
      } catch (Exception error) { result.put("uri", image.toString()); }
    }
    call.resolve(result);
  }
}
