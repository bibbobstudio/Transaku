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
function rasterBytes(canvas,protocol='raster',startAt=0,rowCount=canvas.height,finish=true){
  const width=canvas.width,height=canvas.height,end=Math.min(height,startAt+rowCount),black=blackPixels(canvas),rowBytes=Math.ceil(width/8),parts=[new Uint8Array([0x1b,0x40,0x1b,0x61,0x01])];
  if(protocol==='esc-star'){
    for(let start=startAt;start<end;start+=24){const part=new Uint8Array(5+width*3+1);part.set([0x1b,0x2a,0x21,width&255,width>>8]);let offset=5;for(let x=0;x<width;x++){for(let bit=0;bit<24;bit++)if(black(x,start+bit))part[offset+(bit>>3)]|=0x80>>(bit&7);offset+=3}part[part.length-1]=0x0a;parts.push(part)}
  }else{
    const bandHeight=protocol==='single'?rowCount:240;
    for(let start=startAt;start<end;start+=bandHeight){const rows=Math.min(bandHeight,end-start),part=new Uint8Array(8+rowBytes*rows);part.set([0x1d,0x76,0x30,0x00,rowBytes&255,rowBytes>>8,rows&255,rows>>8]);for(let y=0;y<rows;y++)for(let x=0;x<width;x++)if(black(x,start+y))part[8+y*rowBytes+(x>>3)]|=0x80>>(x&7);parts.push(part)}
  }
  if(finish)parts.push(new Uint8Array([0x0a,0x0a,0x0a]));return join(parts);
}

export async function printReceipt(){
  const receipt=document.querySelector('#receipt');if(!receipt)return;
  const settings=(await db.export()).settings||{};receipt.classList.toggle('w80',settings.printer_size==='80mm');receipt.classList.toggle('w58',settings.printer_size!=='80mm');
  const printer=settings.bluetooth_printer,bluetooth=window.Capacitor?.Plugins?.BluetoothPrinter;
  if(printer&&bluetooth){const width=settings.printer_size==='80mm'?576:384,canvas=await receiptCanvas(receipt,width),protocol=printer.image_protocol||'raster';if(protocol==='raster'){for(let start=0;start<canvas.height;start+=240){const rows=Math.min(240,canvas.height-start),bytes=rasterBytes(canvas,'single',start,rows,start+rows>=canvas.height);await bluetooth.print({address:printer.address,mode:printer.mode,encoding:printer.encoding,dataBase64:toBase64(bytes)})}}else{const bytes=rasterBytes(canvas,protocol);await bluetooth.print({address:printer.address,mode:printer.mode,encoding:printer.encoding,dataBase64:toBase64(bytes)})}return;}
  window.print();
}

export async function printCanvasImage(source){
  const settings=(await db.export()).settings||{},printer=settings.bluetooth_printer,bluetooth=window.Capacitor?.Plugins?.BluetoothPrinter;
  if(!printer||!bluetooth)throw new Error('Atur printer Bluetooth terlebih dahulu di Settings.');
  const width=settings.printer_size==='80mm'?576:384,height=Math.ceil(source.height*width/source.width),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(source,0,0,width,height);
  await bluetooth.print({address:printer.address,mode:printer.mode,encoding:printer.encoding,dataBase64:toBase64(rasterBytes(canvas,printer.image_protocol))});
}

export async function shareReceipt(){
  const receipt=document.querySelector('#receipt'),html2canvas=window.html2canvas;if(!receipt)return;if(!html2canvas)throw new Error('Mesin pembuat gambar belum selesai dimuat. Refresh halaman lalu coba lagi.');
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const canvas=await html2canvas(receipt,{backgroundColor:'#ffffff',scale:2,useCORS:true,logging:false,scrollX:0,scrollY:0});
  const imageUrl=canvas.toDataURL('image/png'),dataBase64=imageUrl.split(',')[1],fileName=`struk-transaku-${new Date().toISOString().slice(0,10)}.png`,nativeShare=window.Capacitor?.Plugins?.ReceiptShare;
  if(nativeShare){await nativeShare.share({dataBase64,fileName});return;}
  const file=new File([await (await fetch(imageUrl)).blob()],fileName,{type:'image/png'});
  if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Struk Transaku'});return;}
  const link=document.createElement('a');link.href=imageUrl;link.download=fileName;link.click();
}

function addShareButton(){const receipt=document.querySelector('#receipt'),actions=document.querySelector('.actions.no-print');if(!receipt||!actions||actions.querySelector('#share-receipt'))return;const button=document.createElement('button');button.id='share-receipt';button.type='button';button.className='btn secondary';button.textContent='Share';button.onclick=async()=>{try{await shareReceipt()}catch(error){alert(error.message)}};const print=actions.querySelector('#print');if(print)print.insertAdjacentElement('afterend',button);else actions.append(button)}
new MutationObserver(addShareButton).observe(document.querySelector('#app'),{childList:true,subtree:true});
