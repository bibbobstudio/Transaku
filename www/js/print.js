import {db} from './database.js';

export async function printReceipt(){
  const receipt=document.querySelector('#receipt');
  if(!receipt)return;
  const settings=(await db.export()).settings||{};
  receipt.classList.toggle('w80',settings.printer_size==='80mm');
  receipt.classList.toggle('w58',settings.printer_size!=='80mm');
  window.print();
} // Titik integrasi Bluetooth ESC/POS pada fase berikutnya.
