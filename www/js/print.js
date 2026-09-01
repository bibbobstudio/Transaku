import {db} from './database.js';

const toBase64=bytes=>{let value='',chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)value+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(value)};
async function receiptImage(receipt,width){
  const html2canvas=window.html2canvas;
  if(!html2canvas)throw new Error('Mesin cetak gambar belum tersedia. Perbarui APK Transaku.');
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const sourceWidth=Math.ceil(receipt.scrollWidth),sourceHeight=Math.ceil(receipt.scrollHeight);
  const source=await html2canvas(receipt,{backgroundColor:'#ffffff',scale:2,useCORS:true,logging:false,width:sourceWidth,height:sourceHeight,windowWidth:sourceWidth,windowHeight:sourceHeight,scrollX:0,scrollY:0});
  const height=Math.ceil(source.height*width/source.width),canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true});
  context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(source,0,0,width,height);
  const pixels=context.getImageData(0,0,width,height).data,rowBytes=Math.ceil(width/8),bytes=new Uint8Array(10+rowBytes*height);
  bytes.set([0x1b,0x40,0x1d,0x76,0x30,0x00,rowBytes&255,rowBytes>>8,height&255,height>>8]);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4,gray=(pixels[p]*299+pixels[p+1]*587+pixels[p+2]*114)/1000;if(gray<180)bytes[10+y*rowBytes+(x>>3)]|=0x80>>(x&7)}
  const result=new Uint8Array(bytes.length+3);result.set(bytes);result.set([0x0a,0x0a,0x0a],bytes.length);return result;
}
export async function printReceipt(){
  const receipt=document.querySelector('#receipt');if(!receipt)return;
  const settings=(await db.export()).settings||{};receipt.classList.toggle('w80',settings.printer_size==='80mm');receipt.classList.toggle('w58',settings.printer_size!=='80mm');
  const printer=settings.bluetooth_printer,bluetooth=window.Capacitor?.Plugins?.BluetoothPrinter;
  if(printer&&bluetooth){const bytes=await receiptImage(receipt,settings.printer_size==='80mm'?576:384);await bluetooth.print({address:printer.address,mode:printer.mode,encoding:printer.encoding,dataBase64:toBase64(bytes)});return;}
  window.print();
}

export async function printCanvasImage(source){
  const settings=(await db.export()).settings||{},printer=settings.bluetooth_printer,bluetooth=window.Capacitor?.Plugins?.BluetoothPrinter;
  if(!printer||!bluetooth)throw new Error('Atur printer Bluetooth terlebih dahulu di Settings.');
  const width=settings.printer_size==='80mm'?576:384,height=Math.ceil(source.height*width/source.width),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(source,0,0,width,height);
  const pixels=context.getImageData(0,0,width,height).data,rowBytes=Math.ceil(width/8),bytes=new Uint8Array(10+rowBytes*height);bytes.set([0x1b,0x40,0x1d,0x76,0x30,0x00,rowBytes&255,rowBytes>>8,height&255,height>>8]);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4,gray=(pixels[p]*299+pixels[p+1]*587+pixels[p+2]*114)/1000;if(gray<180)bytes[10+y*rowBytes+(x>>3)]|=0x80>>(x&7)}
  const result=new Uint8Array(bytes.length+3);result.set(bytes);result.set([0x0a,0x0a,0x0a],bytes.length);await bluetooth.print({address:printer.address,mode:printer.mode,encoding:printer.encoding,dataBase64:toBase64(result)});
}
