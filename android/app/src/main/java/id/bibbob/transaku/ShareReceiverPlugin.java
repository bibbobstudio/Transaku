package id.bibbob.transaku;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ShareReceiver")
public class ShareReceiverPlugin extends Plugin {
  @PluginMethod
  public void getSharedImage(PluginCall call) {
    Intent intent = getActivity().getIntent();
    if (!Intent.ACTION_SEND.equals(intent.getAction()) || !intent.getType().startsWith("image/")) { call.resolve(new JSObject()); return; }
    Uri image = intent.getParcelableExtra(Intent.EXTRA_STREAM);
    JSObject result = new JSObject();
    if (image != null) result.put("uri", image.toString());
    call.resolve(result);
  }
}
