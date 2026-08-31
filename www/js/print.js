import {db} from './database.js';

export async function printReceipt(){
  const receipt=document.querySelector('#receipt');
  if(!receipt)return;
  const settings=(await db.export()).settings||{};
  receipt.classList.toggle('w80',settings.printer_size==='80mm');
  receipt.classList.toggle('w58',settings.printer_size!=='80mm');
  const printer=settings.bluetooth_printer;
  const bluetooth=window.Capacitor?.Plugins?.BluetoothPrinter;
  if(printer&&bluetooth){await bluetooth.print({address:printer.address,data:`\x1B\x40${receipt.innerText}\n\n\n`});return;}
  window.print();
} // Titik integrasi Bluetooth ESC/POS pada fase berikutnya.
