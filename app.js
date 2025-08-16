
// Friendsy Money Tracker - Voice-based PWA
// Storage
const storeKey = 'friendsy.money.txns.v1';
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const appEl = $('#app');
const helpDialog = $('#helpDialog');

const state = {
  txns: [],
  deferredPrompt: null
};

// Load
function load() {
  try {
    state.txns = JSON.parse(localStorage.getItem(storeKey) || '[]');
  } catch(e) { state.txns = []; }
  render();
  appEl.classList.add('ready');
}

// Save
function save() {
  localStorage.setItem(storeKey, JSON.stringify(state.txns));
  render();
}

// Render table + summary
function render() {
  const tbody = $('#txnTable tbody');
  tbody.innerHTML = '';
  let income = 0, expense = 0;
  state.txns.forEach((t, idx) => {
    if (t.type === 'income') income += t.amount;
    if (t.type === 'expense') expense += t.amount;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${escapeHtml(t.desc || '')}</td>
      <td>${escapeHtml(t.category || '')}</td>
      <td>${t.type}</td>
      <td>${t.amount.toFixed(2)}</td>
      <td><button class="btn subtle" data-idx="${idx}" aria-label="Delete">✖</button></td>
    `;
    tbody.appendChild(tr);
  });
  $('#totalIncome').textContent = income.toFixed(2);
  $('#totalExpense').textContent = expense.toFixed(2);
  $('#balance').textContent = (income - expense).toFixed(2);

  // bind delete buttons
  $$('#txnTable [data-idx]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
      state.txns.splice(i, 1);
      save();
      speak('Deleted the transaction.');
    });
  });
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// Form handling
$('#txnForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const date = $('#date').value || new Date().toISOString().slice(0,10);
  const desc = $('#desc').value.trim();
  const category = $('#category').value.trim();
  const amount = parseFloat($('#amount').value);
  const type = $('#type').value;
  if (!desc || isNaN(amount)) return;
  state.txns.unshift({ date, desc, category, amount, type });
  save();
  e.target.reset();
  speak(`Added ${type} ${amount} for ${desc}.`);
});

// Install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.deferredPrompt = e;
  $('#installBtn').disabled = false;
});
$('#installBtn').addEventListener('click', async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  $('#installBtn').disabled = true;
});

// Help dialog
$('#helpLink').addEventListener('click', (e) => {
  e.preventDefault();
  helpDialog.showModal();
});

// Voice Recognition + Commands
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognizer = SpeechRecognition ? new SpeechRecognition() : null;
if (recognizer){
  recognizer.lang = 'en-US';
  recognizer.interimResults = false;
  recognizer.maxAlternatives = 1;
}
$('#voiceBtn').addEventListener('click', () => {
  if (!recognizer){ alert('Speech recognition not supported in this browser.'); return; }
  recognizer.start();
  $('#voiceBtn').textContent = '🎙️ Listening…';
});
if (recognizer){
  recognizer.addEventListener('result', (e) => {
    $('#voiceBtn').textContent = '🎙️ Voice';
    const transcript = e.results[0][0].transcript;
    handleVoiceCommand(transcript);
  });
  recognizer.addEventListener('end', () => {
    $('#voiceBtn').textContent = '🎙️ Voice';
  });
}

function handleVoiceCommand(s){
  const text = s.toLowerCase();
  // Patterns: "add expense 200 for coffee", "add income 5000 salary"
  const addRe = /(add\s+)?(expense|income)\s+([\d,.]+)(?:\s*(?:for|on|to)?\s*(.*))?$/i;
  const delRe = /delete\s+(last|recent)/i;
  const summaryRe = /summary|totals|balance/i;

  if (addRe.test(text)){
    const m = text.match(addRe);
    const type = m[2].toLowerCase();
    const amount = parseFloat(m[3].replace(/,/g,''));
    const desc = (m[4] || '').trim() || (type === 'expense' ? 'general expense' : 'income');
    const date = new Date().toISOString().slice(0,10);
    state.txns.unshift({ date, desc, category: '', amount, type });
    save();
    speak(`Added ${type} ${amount} for ${desc}.`);
    return;
  }
  if (delRe.test(text)){
    if (state.txns.length){
      state.txns.shift();
      save();
      speak('Removed the most recent transaction.');
    } else {
      speak('There are no transactions to delete.');
    }
    return;
  }
  if (summaryRe.test(text)){
    const inc = parseFloat($('#totalIncome').textContent);
    const exp = parseFloat($('#totalExpense').textContent);
    const bal = parseFloat($('#balance').textContent);
    speak(`Income ${inc}, expenses ${exp}, balance ${bal}.`);
    return;
  }
  speak("Sorry, I didn't catch that. Try saying add expense 200 for coffee.");
}

// Voice Playback (Speech Synthesis)
function speak(text){
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1;
  utter.pitch = 1;
  speechSynthesis.speak(utter);
}
$('#speakSummaryBtn').addEventListener('click', () => {
  const inc = parseFloat($('#totalIncome').textContent);
  const exp = parseFloat($('#totalExpense').textContent);
  const bal = parseFloat($('#balance').textContent);
  speak(`Here's your summary. Income ${inc}, expenses ${exp}, balance ${bal}.`);
});

// Export to CSV (Excel-friendly)
function toCSV(rows){
  const escape = (v) => {
    const s = (v==null?'':String(v)).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return rows.map(r => r.map(escape).join(',')).join('\n');
}
$('#exportBtn').addEventListener('click', () => {
  const rows = [['Date','Description','Category','Type','Amount']];
  state.txns.forEach(t => rows.push([t.date, t.desc, t.category, t.type, t.amount.toFixed(2)]));
  const csv = toCSV(rows);
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'money-tracker-export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  speak('Exported your transactions.');
});

// Service worker registration
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js');
  });
}

// Init
document.addEventListener('DOMContentLoaded', load);
