import {db} from './database.js';

const toBase64=bytes=>{let value='',chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)value+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(value)};

async function receiptCanvas(receipt,width){
  const html2canvas=window.html2canvas;
  if(!html2canvas)throw new Error('Mesin cetak gambar belum tersedia. Perbarui APK Transaku.');
  const saved={width:receipt.style.width,maxWidth:receipt.style.maxWidth,margin:receipt.style.margin,padding:receipt.style.padding,boxSizing:receipt.style.boxSizing};
  Object.assign(receipt.style,{width:`${width}px`,maxWidth:'none',margin:'0',padding:'10px',boxSizing:'border-box'});
  try{
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const height=Math.ceil(receipt.scrollHeight);
    return await html2canvas(receipt,{backgroundColor:'#ffffff',scale:1,useCORS:true,logging:false,width,height,windowWidth:width,windowHeight:height,scrollX:0,scrollY:0});
  }finally{Object.assign(receipt.style,saved)}
}

function join(parts){const length=parts.reduce((sum,part)=>sum+part.length,0),result=new Uint8Array(length);let offset=0;parts.forEach(part=>{result.set(part,offset);offset+=part.length});return result}
function blackPixels(canvas){const ctx=canvas.getContext('2d',{willReadFrequently:true}),data=ctx.getImageData(0,0,canvas.width,canvas.height).data;return(x,y)=>{if(x>=canvas.width||y>=canvas.height)return false;const p=(y*canvas.width+x)*4;return(data[p]*299+data[p+1]*587+data[p+2]*114)/1000<180}}
function rasterBytes(canvas,protocol='raster'){
  const width=canvas.width,height=canvas.height,black=blackPixels(canvas),rowBytes=Math.ceil(width/8),parts=[new Uint8Array([0x1b,0x40,0x1b,0x61,0x01])];
  if(protocol==='esc-star'){
    for(let start=0;start<height;start+=24){const part=new Uint8Array(5+width*3+1);part.set([0x1b,0x2a,0x21,width&255,width>>8]);let offset=5;for(let x=0;x<width;x++){for(let bit=0;bit<24;bit++)if(black(x,start+bit))part[offset+(bit>>3)]|=0x80>>(bit&7);offset+=3}part[part.length-1]=0x0a;parts.push(part)}
  }else{
    const bandHeight=protocol==='single'?height:240;
    for(let start=0;start<height;start+=bandHeight){const rows=Math.min(bandHeight,height-start),part=new Uint8Array(8+rowBytes*rows);part.set([0x1d,0x76,0x30,0x00,rowBytes&255,rowBytes>>8,rows&255,rows>>8]);for(let y=0;y<rows;y++)for(let x=0;x<width;x++)if(black(x,start+y))part[8+y*rowBytes+(x>>3)]|=0x80>>(x&7);parts.push(part)}
  }
  parts.push(new Uint8Array([0x0a,0x0a,0x0a]));return join(parts);
}

export async function printReceipt(){
  const receipt=document.querySelector('#receipt');if(!receipt)return;
  const settings=(await db.export()).settings||{};receipt.classList.toggle('w80',settings.printer_size==='80mm');receipt.classList.toggle('w58',settings.printer_size!=='80mm');
  const printer=settings.bluetooth_printer,bluetooth=window.Capacitor?.Plugins?.BluetoothPrinter;
  if(printer&&bluetooth){const width=settings.printer_size==='80mm'?576:384,canvas=await receiptCanvas(receipt,width),bytes=rasterBytes(canvas,printer.image_protocol);await bluetooth.print({address:printer.address,mode:printer.mode,encoding:printer.encoding,dataBase64:toBase64(bytes)});return;}
  window.print();
}

export async function printCanvasImage(source){
  const settings=(await db.export()).settings||{},printer=settings.bluetooth_printer,bluetooth=window.Capacitor?.Plugins?.BluetoothPrinter;
  if(!printer||!bluetooth)throw new Error('Atur printer Bluetooth terlebih dahulu di Settings.');
  const width=settings.printer_size==='80mm'?576:384,height=Math.ceil(source.height*width/source.width),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(source,0,0,width,height);
  await bluetooth.print({address:printer.address,mode:printer.mode,encoding:printer.encoding,dataBase64:toBase64(rasterBytes(canvas,printer.image_protocol))});
}
