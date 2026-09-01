import {db} from './database.js';

export async function printReceipt(){
  const receipt=document.querySelector('#receipt');
  if(!receipt)return;
  const settings=(await db.export()).settings||{};
  receipt.classList.toggle('w80',settings.printer_size==='80mm');
  receipt.classList.toggle('w58',settings.printer_size!=='80mm');
  const printer=settings.bluetooth_printer;
  const bluetooth=window.Capacitor?.Plugins?.BluetoothPrinter;
  if(printer&&bluetooth){const font=Number(settings.print_font||0),spacing=Number(settings.print_spacing||24),feed=Number(settings.print_feed||3),lines=receipt.innerText.replace(/\n{3,}/g,'\n\n').split('\n');let clean;if(receipt.querySelector('.token-number')){const date=lines.find(x=>x.startsWith('Tanggal'))||'',time=lines.find(x=>x.startsWith('Jam'))||'',body=lines.filter(x=>!x.startsWith('Tanggal')&&!x.startsWith('Jam'));clean=`\x1B\x61\x00${time}\n\x1B\x61\x02${date}\n\x1B\x61\x00`;for(let i=0;i<body.length;i++){clean+=body[i];if(body[i].trim()==='TOKEN'&&body[i+1]){clean+=`\n\x1B\x61\x01\x1D\x21\x22${body[++i]}\x1D\x21\x00\x1B\x61\x00`}clean+='\n'}}else clean=lines.join('\n');clean=clean.replace(/\n/g,'\r\n');const data=`\x1B\x40\x1B\x21${String.fromCharCode(font)}\x1B\x33${String.fromCharCode(spacing)}${clean}${'\r\n'.repeat(feed)}\x1B\x32`;await bluetooth.print({address:printer.address,mode:printer.mode,encoding:printer.encoding,data});return;}
  window.print();
} // Titik integrasi Bluetooth ESC/POS pada fase berikutnya.
