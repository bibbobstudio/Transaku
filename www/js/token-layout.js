export const TOKEN_LAYOUT_DEFAULT=['nominal','token_number','pln','selling_price','payment_status','divider','datetime'];
export const TOKEN_LAYOUT_LABEL={token_label:'Label TOKEN',nominal:'Nominal',token_number:'Nomor token',pln:'Nomor PLN',selling_price:'Harga jual',payment_status:'Status bayar',divider:'Garis pemisah',datetime:'Jam & tanggal'};
export function normalizeTokenLayout(value){const source=Array.isArray(value)?value:[];return [...source.filter(x=>TOKEN_LAYOUT_DEFAULT.includes(x)),...TOKEN_LAYOUT_DEFAULT.filter(x=>!source.includes(x))]}
