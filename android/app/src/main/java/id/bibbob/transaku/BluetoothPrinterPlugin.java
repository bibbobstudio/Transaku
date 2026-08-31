package id.bibbob.transaku;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.util.UUID;

@CapacitorPlugin(name = "BluetoothPrinter", permissions = {
  @Permission(alias = "bluetooth", strings = {Manifest.permission.BLUETOOTH_CONNECT})
})
public class BluetoothPrinterPlugin extends Plugin {
  private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

  @PluginMethod
  public void list(PluginCall call) {
    try {
      BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
      if (adapter == null) { call.reject("Bluetooth tidak tersedia pada perangkat ini."); return; }
      JSArray devices = new JSArray();
      for (BluetoothDevice device : adapter.getBondedDevices()) {
        JSObject item = new JSObject(); item.put("name", device.getName()); item.put("address", device.getAddress());
        devices.put(item);
      }
      JSObject result = new JSObject(); result.put("devices", devices); call.resolve(result);
    } catch (SecurityException error) { call.reject("Izinkan akses Bluetooth untuk Transaku.", error); }
  }

  @PluginMethod
  public void print(PluginCall call) {
    String address = call.getString("address"); String data = call.getString("data", ""); String mode = call.getString("mode", "auto"); String encoding = call.getString("encoding", "CP437");
    if (address == null || address.isEmpty()) { call.reject("Pilih printer terlebih dahulu."); return; }
    getBridge().execute(() -> {
      try {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter(); BluetoothDevice device = adapter.getRemoteDevice(address); adapter.cancelDiscovery();
        BluetoothSocket socket;
        if ("secure".equals(mode)) { socket = device.createRfcommSocketToServiceRecord(SPP_UUID); socket.connect(); }
        else if ("insecure".equals(mode)) { socket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID); socket.connect(); }
        else { try { socket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID); socket.connect(); } catch (Exception firstError) { socket = device.createRfcommSocketToServiceRecord(SPP_UUID); socket.connect(); } }
        OutputStream output = socket.getOutputStream(); output.write(data.getBytes(Charset.forName(encoding))); output.flush(); output.close(); socket.close(); call.resolve();
      } catch (Exception error) { call.reject("Tidak dapat mencetak ke printer Bluetooth: " + error.getMessage(), error); }
    });
  }
}
