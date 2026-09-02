package id.bibbob.transaku;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(android.os.Bundle savedInstanceState) {
    registerPlugin(BluetoothPrinterPlugin.class); registerPlugin(ShareReceiverPlugin.class); registerPlugin(BackupFilePlugin.class); registerPlugin(ReceiptSharePlugin.class); super.onCreate(savedInstanceState);
  }
  @Override public void onNewIntent(android.content.Intent intent) { super.onNewIntent(intent); setIntent(intent); }
}
