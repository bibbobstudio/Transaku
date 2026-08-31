// Adapter OCR: sengaja belum bergantung pada library atau cloud.
// Fase berikutnya cukup mengganti extractTransferDraft tanpa mengubah form transfer.
export async function extractTransferDraft(file){
  if(!file)throw new Error('Pilih screenshot terlebih dahulu.');
  if(!file.type.startsWith('image/'))throw new Error('File harus berupa gambar screenshot.');
  return {status:'PENDING_OCR',fileName:file.name,bank:'',recipient:'',account_number:'',transfer_amount:'',admin_fee:'',reference:''};
}
