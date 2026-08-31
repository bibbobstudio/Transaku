import {db} from './database.js';
const plugin=()=>window.Capacitor?.Plugins?.BluetoothPrinter;
export async function pairedPrinters(){const p=plugin();if(!p)throw new Error('Bluetooth direct hanya tersedia di APK Transaku.');try{await p.requestPermissions?.()}catch{}const result=await p.list();return result.devices||[]}
export async function savePrinter(printer){const data=await db.export();data.settings={...data.settings,bluetooth_printer:printer};await db.import(data)}
export async function testPrinter(printer){const p=plugin();if(!p)throw new Error('Bluetooth direct hanya tersedia di APK Transaku.');await p.print({address:printer.address,data:'\x1B\x40TRANS AKU\nTest printer berhasil\n\n\n'})}
