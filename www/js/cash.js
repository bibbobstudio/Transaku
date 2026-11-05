import {db} from './database.js';
import {escapeHtml} from './utils.js';
import {navigate} from './router.js';

const formatMoney=value=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value||0));
const accounts=['Dana','Seabank','Buku Agen','BCA','Lainnya'];
const denominations=[1000000,100000,50000,20000,10000,5000,2000,1000];
const dateKey=value=>String(value||'').slice(0,10);
const localToday=()=>{const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`};
const dateLabel=date=>new Date(`${date}T00:00:00`).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

function recordTotal(item){
  if(item.type==='account')return Object.values(item.accounts||{}).reduce((sum,value)=>sum+Number(value||0),0);
  if(item.type==='cash'&&item.bills)return Object.entries(item.bills).reduce((sum,[value,count])=>sum+Number(value)*Number(count||0),0);
  return Number(item.amount||0);
}

function debtBalanceForDate(date,transactions,payments){
  const paymentsBySource=new Map();
  for(const payment of payments){const list=paymentsBySource.get(payment.transaction_id)||[];list.push(payment);paymentsBySource.set(payment.transaction_id,list)}
  return transactions.reduce((total,item)=>{
    if(item.type==='DEBT_PAYMENT')return total;
    const related=paymentsBySource.get(item.id)||[],current=Number(item.balance_due)||0;
    if(current<=0&&!related.length)return total;
    const opened=dateKey(item.created_at);if(!opened||opened>date)return total;
    const openingBalance=current+related.reduce((sum,payment)=>sum+Number(payment.amount||0),0);
    const paidByDate=related.filter(payment=>dateKey(payment.created_at)<=date).reduce((sum,payment)=>sum+Number(payment.amount||0),0);
    return total+Math.max(0,openingBalance-paidByDate);
  },0);
}

function renderDay(date,groups,transactions,payments,capital,open=false){
  const records=groups[date]||[],dailyMoney=records.reduce((sum,item)=>sum+recordTotal(item),0),dailyDebt=debtBalanceForDate(date,transactions,payments),initialCapital=capital.initialHistory.filter(item=>item.date<=date).at(-1)?.amount||0,dailyCapital=Number(initialCapital)+capital.contributions.filter(item=>dateKey(item.created_at)<=date).reduce((sum,item)=>sum+Number(item.amount||0),0),total=dailyMoney+dailyDebt,globalProfit=total-dailyCapital,previousKey=Object.keys(capital.dailyTotals).filter(day=>day<date).sort().at(-1),previousTotal=previousKey?(capital.dailyTotals[previousKey]||0)+debtBalanceForDate(previousKey,transactions,payments):0,hasPreviousEntryThisMonth=Boolean(previousKey&&previousKey.slice(0,7)===date.slice(0,7)),dailyProfit=Number(date.slice(8,10))===1||!hasPreviousEntryThisMonth?globalProfit:total-previousTotal;
  const entries=records.map(item=>`<div class="list-item"><div class="grow"><strong>${formatMoney(recordTotal(item))} · ${item.type==='account'?'Rekening':'Cash'}</strong>${item.type==='account'?`<p>${accounts.map((name,index)=>{const value=Number(item.accounts?.[name]||item.accounts?.[index]||0);return value?`${name}: ${formatMoney(value)}`:''}).filter(Boolean).join(' · ')}</p>`:item.bills?`<p>${denominations.map(value=>item.bills[value]?`${formatMoney(value)} × ${item.bills[value]} lembar`:'' ).filter(Boolean).join(' · ')}</p>`:''}${item.note?`<p>${escapeHtml(item.note)}</p>`:''}</div><div class="cash-item-actions"><button class="btn secondary" data-cash-edit="${item.id}">Edit</button><button class="btn danger" data-cash-delete="${item.id}">Hapus</button></div></div>`).join('');
  const globalProfitClass=globalProfit<0?'cash-profit-loss':'cash-profit-positive',dailyProfitClass=dailyProfit<0?'cash-profit-loss':'cash-profit-positive';
  const headlineIsToday=date===localToday(),headlineProfit=headlineIsToday?dailyProfit:globalProfit,headlineLabel=headlineIsToday?'Keuntungan hari ini':'Keuntungan global',headlineClass=headlineProfit<0?'cash-profit-loss':'cash-profit-positive';
  return `<details class="cash-day card" ${open?'open':''}><summary class="cash-day-summary"><h2>${dateLabel(date)}</h2><strong class="cash-day-headline ${headlineClass}">${headlineLabel}: ${formatMoney(headlineProfit)}</strong></summary><div class="cash-day-details"><div class="cash-summary-grid"><div class="cash-summary-tile cash-capital-total"><span>Kas</span><b>${formatMoney(dailyMoney)}</b></div><div class="cash-summary-tile cash-capital-total"><span>Total Modal</span><b>${formatMoney(dailyCapital)}</b></div><div class="cash-summary-tile cash-debt-total"><span>Total Hutang</span><b>${formatMoney(dailyDebt)}</b></div><div class="cash-summary-tile ${globalProfitClass}"><span>Keuntungan Global</span><b>${formatMoney(globalProfit)}</b>${globalProfit<0?'<small>Total uang masih di bawah total modal.</small>':''}</div><div class="cash-summary-tile cash-money-detail"><span>Total Uang</span><b>${formatMoney(total)}</b></div><div class="cash-summary-tile ${dailyProfitClass}"><span>Keuntungan Hari Ini</span><b>${formatMoney(dailyProfit)}</b>${dailyProfit<0?'<small>Total uang turun dibanding hari sebelumnya.</small>':''}</div></div><div class="list">${entries||'<p class="muted">Tidak ada catatan uang untuk tanggal ini.</p>'}</div></div></details>`;
}

async function getCashData(){
  const [records,transactions,payments,contributions,initialHistory]=await Promise.all([db.cashRecords(),db.transactions(),db.debtPayments(),db.capitalContributions(),db.initialCapitalHistory()]);
  const groups=records.reduce((result,item)=>((result[item.date]??=[]).push(item),result),{});
  const dates=[...Object.keys(groups)].sort((a,b)=>b.localeCompare(a));
  const dailyTotals=records.reduce((result,item)=>{result[item.date]=(result[item.date]||0)+recordTotal(item);return result},{}),capital={initialHistory,contributions,cashRecords:records,dailyTotals};
  return {groups,transactions,payments,dates,capital};
}

function renderForm(){
  const accountFields=accounts.map((name,index)=>`<div class="field"><label>${name}</label><input name="account_${index}" data-money inputmode="numeric" placeholder="0"></div>`).join('');
  const cashFields=denominations.map(value=>`<div class="field"><label>${formatMoney(value)} <small>jumlah lembar</small></label><input name="bill_${value}" data-bill inputmode="numeric" pattern="[0-9]*" placeholder="0"></div>`).join('');
  return `<form id="cash-form" class="form-grid"><div class="field"><label>Tanggal</label><input name="date" type="date" value="${localToday()}" required></div><div class="field"><label>Sumber uang</label><select name="type" id="cash-type"><option value="cash">Cash</option><option value="account">Rekening</option></select></div><div id="cash-bills">${cashFields}<b id="cash-estimate">Total cash: ${formatMoney(0)}</b></div><div id="account-fields" hidden>${accountFields}<b id="account-estimate">Total rekening: ${formatMoney(0)}</b></div><div class="field"><label>Catatan (opsional)</label><input name="note" placeholder="Contoh: uang laci"></div><button class="btn">Tambah catatan</button></form>`;
}

function connectForm(editRecord=null){
  const form=document.querySelector('#cash-form'),type=document.querySelector('#cash-type'),billBox=document.querySelector('#cash-bills'),accountBox=document.querySelector('#account-fields'),estimate=document.querySelector('#cash-estimate'),accountEstimate=document.querySelector('#account-estimate');
  const setCashEstimate=()=>{const total=denominations.reduce((sum,value)=>sum+value*(Number(form.elements[`bill_${value}`].value)||0),0);estimate.textContent=`Total cash: ${formatMoney(total)}`};
  const setAccountEstimate=()=>{const total=accounts.reduce((sum,name,index)=>sum+(Number(form.elements[`account_${index}`].value.replace(/\D/g,''))||0),0);accountEstimate.textContent=`Total rekening: ${formatMoney(total)}`};
  const setType=()=>{const account=type.value==='account';billBox.hidden=account;accountBox.hidden=!account};type.onchange=setType;setType();
  form.querySelectorAll('[data-bill]').forEach(input=>input.oninput=()=>{input.value=input.value.replace(/\D/g,'');setCashEstimate()});
  form.querySelectorAll('[data-money]').forEach(input=>input.oninput=()=>{const amount=Number(input.value.replace(/\D/g,''))||0;input.value=amount?new Intl.NumberFormat('id-ID').format(amount):'';setAccountEstimate()});
  const submitButton=form.querySelector('button[type="submit"],button:not([type])');
  if(editRecord){form.date.value=editRecord.date;type.value=editRecord.type==='account'?'account':'cash';form.note.value=editRecord.note||'';if(editRecord.type==='account')accounts.forEach((name,index)=>{form.elements[`account_${index}`].value=editRecord.accounts?.[name]||editRecord.accounts?.[index]||''});else denominations.forEach(value=>{form.elements[`bill_${value}`].value=editRecord.bills?.[value]||''});setType();setCashEstimate();setAccountEstimate();submitButton.textContent='Simpan perubahan';const cancel=document.createElement('button');cancel.type='button';cancel.className='btn secondary';cancel.textContent='Batal edit';cancel.onclick=()=>showCash();submitButton.insertAdjacentElement('afterend',cancel)}
  form.onsubmit=async event=>{event.preventDefault();try{const accountValues=Object.fromEntries(accounts.map((name,index)=>[name,Number(form.elements[`account_${index}`].value.replace(/\D/g,''))||0])),bills=Object.fromEntries(denominations.map(value=>[value,Number(form.elements[`bill_${value}`].value)||0])),input={date:form.date.value,type:type.value,amount:0,bills,accounts:accountValues,note:form.note.value};if(editRecord)await db.updateCashRecord(editRecord.id,input);else await db.addCashRecord(input);showCash()}catch(error){alert(error.message)}};
}

function connectRecordButtons(){document.querySelectorAll('[data-cash-edit]').forEach(button=>button.onclick=async()=>{const id=button.dataset.cashEdit,record=(await db.cashRecords()).find(item=>item.id===id);if(!record)return;if(location.hash==='#/cash-history'){sessionStorage.setItem('transaku-cash-edit-id',id);navigate('/cash')}else showCash(id)});document.querySelectorAll('[data-cash-delete]').forEach(button=>button.onclick=async()=>{if(!confirm('Hapus catatan uang ini?'))return;await db.deleteCashRecord(button.dataset.cashDelete);if(location.hash==='#/cash-history')showCashHistory();else showCash()})}

export async function showCash(editId=null){
  document.querySelector('#page-title').textContent='Uang';
  editId=editId||sessionStorage.getItem('transaku-cash-edit-id');sessionStorage.removeItem('transaku-cash-edit-id');
  const {groups,transactions,payments,capital}=await getCashData(),today=localToday(),editRecord=editId?(await db.cashRecords()).find(item=>item.id===editId):null;
  document.querySelector('#app').innerHTML=`<h1>Catatan uang</h1><p class="muted">Tambahkan catatan uang dan lihat ringkasan hari ini.</p>${renderForm()}<section id="cash-today">${renderDay(today,groups,transactions,payments,capital,true)}</section><div class="cash-page-actions"><button class="btn secondary" id="cash-capital-settings">Atur modal</button><button class="btn secondary cash-all-button" id="all-cash-records">Semua catatan</button></div>`;
  connectForm(editRecord);document.querySelector('#cash-capital-settings').onclick=()=>navigate('/capital');document.querySelector('#all-cash-records').onclick=()=>navigate('/cash-history');connectRecordButtons();
}

export async function showCashHistory(){
  document.querySelector('#page-title').textContent='Semua catatan uang';
  const {groups,transactions,payments,dates,capital}=await getCashData();
  document.querySelector('#app').innerHTML=`<div class="cash-history-heading"><div><h1>Semua catatan uang</h1><p class="muted">Daftar uang dan saldo hutang per hari.</p></div></div><div class="quick-values cash-history-filters"><button type="button" data-cash-period="all" class="active">Semua</button><button type="button" data-cash-period="week">Minggu ini</button><button type="button" data-cash-period="month">Bulan ini</button></div><section id="cash-days"></section>`;
  const list=document.querySelector('#cash-days'),render=period=>{const now=new Date(),today=localToday(),startWeek=new Date(now);startWeek.setDate(now.getDate()-((now.getDay()+6)%7));startWeek.setHours(0,0,0,0);const startWeekKey=`${startWeek.getFullYear()}-${String(startWeek.getMonth()+1).padStart(2,'0')}-${String(startWeek.getDate()).padStart(2,'0')}`,startMonth=today.slice(0,7);const filtered=dates.filter(date=>period==='all'||period==='week'&&date>=startWeekKey&&date<=today||period==='month'&&date.startsWith(startMonth));list.innerHTML=filtered.length?filtered.map(date=>renderDay(date,groups,transactions,payments,capital)).join(''):'<div class="empty">Tidak ada catatan uang pada periode ini.</div>';connectRecordButtons()};document.querySelectorAll('[data-cash-period]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-cash-period]').forEach(item=>item.classList.toggle('active',item===button));render(button.dataset.cashPeriod)});render('all');
}
