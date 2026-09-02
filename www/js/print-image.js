import {route,navigate} from './router.js';
import {toast} from './utils.js';
import {printCanvasImage} from './print.js';

const app=()=>document.querySelector('#app');
let source=null,crop=null,preview=null,dragStart=null,bwThreshold=180;

function drawCrop(){
  if(!source)return;
  const canvas=document.querySelector('#image-preview'),ctx=canvas.getContext('2d'),max=360,scale=Math.min(max/source.width,max/source.height,1);
  canvas.width=Math.round(source.width*scale);canvas.height=Math.round(source.height*scale);ctx.drawImage(source,0,0,canvas.width,canvas.height);
  const r=crop||{x:0,y:0,w:source.width,h:source.height};ctx.save();ctx.strokeStyle='#0b63f6';ctx.lineWidth=3;ctx.setLineDash([7,4]);ctx.strokeRect(r.x*scale,r.y*scale,r.w*scale,r.h*scale);ctx.restore();
}
function cropPoint(event){const canvas=document.querySelector('#image-preview'),rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*source.width/canvas.width,y:(event.clientY-rect.top)*source.height/canvas.height}}
function makeOutput(){
  const r=crop||{x:0,y:0,w:source.width,h:source.height},canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(r.w));canvas.height=Math.max(1,Math.round(r.h));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,r.x,r.y,r.w,r.h,0,0,canvas.width,canvas.height);
  const image=ctx.getImageData(0,0,canvas.width,canvas.height),d=image.data;
  for(let i=0;i<d.length;i+=4){const gray=(d[i]*299+d[i+1]*587+d[i+2]*114)/1000,bit=gray<bwThreshold?0:255;d[i]=d[i+1]=d[i+2]=bit;d[i+3]=255}
  ctx.putImageData(image,0,0);return canvas;
}
function refreshBlackWhite(){
  if(!source||!crop?.w||!crop?.h)return;
  preview=makeOutput();const target=document.querySelector('#bw-preview');target.width=preview.width;target.height=preview.height;target.hidden=false;target.getContext('2d').drawImage(preview,0,0);document.querySelector('#print-image').disabled=false;
}
function loadImage(url,shared=false){
  const image=new Image();image.onload=()=>{source=image;crop={x:0,y:0,w:image.width,h:image.height};document.querySelector('#crop-wrap').hidden=true;document.querySelector('#bw-options').hidden=false;document.querySelector('#start-crop').disabled=false;refreshBlackWhite();if(shared)toast('Gambar dari Share siap dicetak')};image.onerror=()=>toast('Gambar tidak dapat dibuka');image.src=url;
}

export function showImagePrint(){
  document.querySelector('#page-title').textContent='Print gambar';source=null;crop=null;preview=null;bwThreshold=180;
  app().innerHTML=`<h1>Print gambar</h1><p class="muted">Gambar akan otomatis dibuat hitam-putih dan siap dicetak.</p><div class="field"><label>Gambar</label><input id="print-image-file" class="mobile-file-input" type="file" accept="image/*"><label class="mobile-upload-box" for="print-image-file"><b>Upload gambar</b></label></div><div class="image-crop-wrap" id="crop-wrap" hidden><canvas id="image-preview"></canvas><small class="muted">Tarik pada gambar untuk memilih area crop.</small></div><div class="bw-options" id="bw-options" hidden><label for="bw-threshold">Kejelasan hitam-putih <output id="bw-value">180</output></label><input id="bw-threshold" type="range" min="60" max="240" value="180"><div><small>Lebih putih</small><small>Lebih hitam</small></div></div><canvas id="bw-preview" hidden></canvas><div class="actions"><button class="btn secondary" id="start-crop" disabled>Crop gambar</button><button class="btn" id="print-image" disabled>Print</button></div>`;
  const file=document.querySelector('#print-image-file'),range=document.querySelector('#bw-threshold'),cropButton=document.querySelector('#start-crop'),cropWrap=document.querySelector('#crop-wrap'),canvas=document.querySelector('#image-preview');
  file.onchange=()=>{const selected=file.files?.[0];if(selected)loadImage(URL.createObjectURL(selected))};
  range.oninput=()=>{bwThreshold=Number(range.value);document.querySelector('#bw-value').value=bwThreshold;if(cropWrap.hidden)refreshBlackWhite()};
  cropButton.onclick=()=>{if(!source)return toast('Upload gambar terlebih dahulu');if(cropWrap.hidden){cropWrap.hidden=false;document.querySelector('#bw-preview').hidden=true;cropButton.textContent='Selesai crop';drawCrop()}else{cropWrap.hidden=true;cropButton.textContent='Crop gambar';refreshBlackWhite()}};
  canvas.onpointerdown=e=>{if(!source)return;dragStart=cropPoint(e);canvas.setPointerCapture(e.pointerId)};
  canvas.onpointermove=e=>{if(!dragStart)return;const now=cropPoint(e);crop={x:Math.max(0,Math.min(dragStart.x,now.x)),y:Math.max(0,Math.min(dragStart.y,now.y)),w:Math.min(source.width,Math.abs(now.x-dragStart.x)),h:Math.min(source.height,Math.abs(now.y-dragStart.y))};drawCrop()};
  canvas.onpointerup=()=>{dragStart=null};
  document.querySelector('#print-image').onclick=async()=>{try{if(!preview)return toast('Upload gambar terlebih dahulu');await printCanvasImage(preview);toast('Gambar dikirim ke printer')}catch(error){toast(error.message)}};
  const shared=sessionStorage.getItem('transaku-shared-image');if(shared){sessionStorage.removeItem('transaku-shared-image');loadImage(shared,true)}
}

route('/print',showImagePrint);
new MutationObserver(()=>{const title=document.querySelector('#page-title')?.textContent,grid=app().querySelector('.grid');if((title!=='Home'&&title!=='Transaksi')||!grid||grid.querySelector('#image-print-shortcut'))return;const button=document.createElement('button');button.id='image-print-shortcut';button.className='card shortcut';button.innerHTML='Print<span>Crop dan cetak gambar</span>';button.onclick=()=>navigate('/print');grid.append(button)}).observe(app(),{childList:true,subtree:true});
new MutationObserver(()=>{if(sessionStorage.getItem('transaku-shared-image')&&location.hash!=='#/print')navigate('/print')}).observe(app(),{childList:true,subtree:true});
new MutationObserver(()=>{if(document.querySelector('#page-title')?.textContent!=='Home')return;const grid=app().querySelector('.grid');if(!grid||grid.dataset.homeSimplified)return;grid.dataset.homeSimplified='true';[...grid.querySelectorAll('.shortcut')].filter(button=>/^(Token PLN|Transfer)/.test(button.textContent.trim())).forEach(button=>button.remove());const transaction=document.createElement('button');transaction.className='card shortcut';transaction.innerHTML='Transaksi<span>Token, transfer, pulsa, dan layanan</span>';transaction.onclick=()=>navigate('/transactions');grid.prepend(transaction)}).observe(app(),{childList:true,subtree:true});
