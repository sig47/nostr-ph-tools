'use strict';

// ── Config ──────────────────────────────────────────────────────────────────
const GV_PROXY   = 'https://nostr.ph/btcpay-proxy.php';
const NOSTR_JSON = 'https://nostr.ph/.well-known/nostr.json';
const NAME_RE    = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
const HEX_RE     = /^[0-9a-fA-F]{64}$/;

// ── Bech32 decoder (npub to hex) ─────────────────────────────────────────────
const B32C = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const B32G = [0x3b6a57b2,0x26508e6d,0x1ea119fa,0x3d4233dd,0x2a1462b3];

function b32Poly(vals) {
  let c = 1;
  for (const v of vals) {
    const t = c >> 25;
    c = ((c & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((t>>i)&1) c ^= B32G[i];
  }
  return c;
}
function b32Hrp(hrp) {
  const r = [];
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i)>>5);
  r.push(0);
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i)&31);
  return r;
}
function b32Decode(str) {
  const s = str.toLowerCase().trim();
  const p = s.lastIndexOf('1');
  if (p < 1 || p+7 > s.length) throw new Error('invalid');
  const hrp = s.slice(0, p);
  const data = [];
  for (let i = p+1; i < s.length; i++) {
    const d = B32C.indexOf(s[i]);
    if (d < 0) throw new Error('invalid char');
    data.push(d);
  }
  if (b32Poly([...b32Hrp(hrp), ...data]) !== 1) throw new Error('bad checksum');
  return { hrp, words: data.slice(0,-6) };
}
function cvBits(data, from, to) {
  let acc=0, bits=0;
  const out=[], max=(1<<to)-1;
  for (const v of data) {
    acc=(acc<<from)|v; bits+=from;
    while(bits>=to){bits-=to;out.push((acc>>bits)&max);}
  }
  return out;
}
function npubToHex(npub) {
  const { hrp, words } = b32Decode(npub);
  if (hrp !== 'npub') throw new Error('not an npub');
  return cvBits(words, 5, 8).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,64);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function $id(id) { return document.getElementById(id); }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── Availability cache ────────────────────────────────────────────────────────
let takenNames = null;

async function loadTakenNames() {
  if (takenNames !== null) return;
  try {
    const r = await fetch(NOSTR_JSON);
    const data = await r.json();
    takenNames = Object.keys(data.names || {}).map(n => n.toLowerCase());
  } catch(e) {
    takenNames = [];
  }
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateName(val) {
  if (!val) return { ok: false, msg: 'Letters, numbers, hyphens and underscores only.' };
  if (!NAME_RE.test(val)) return { ok: false, msg: 'Invalid format. Use letters, numbers, - and _ only.' };
  if (takenNames && takenNames.includes(val.toLowerCase())) return { ok: false, msg: val + '@nostr.ph is already taken.' };
  return { ok: true, msg: val + '@nostr.ph is available.' };
}

function validatePubkey(val) {
  if (!val) return { ok: false, hex: null, msg: 'Paste your npub or hex pubkey. Never share your nsec.' };
  const v = val.trim();
  if (HEX_RE.test(v)) return { ok: true, hex: v.toLowerCase(), msg: 'Valid hex pubkey.' };
  try {
    const hex = npubToHex(v);
    return { ok: true, hex, msg: 'Valid npub.' };
  } catch(e) {
    return { ok: false, hex: null, msg: 'Not a valid npub or 64-char hex pubkey.' };
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {

// ── Live input handlers ───────────────────────────────────────────────────────
$id('gv-name').addEventListener('input', async function() {
  await loadTakenNames();
  const val = this.value.trim().toLowerCase();
  const hint = $id('gv-name-hint');
  const preview = $id('gv-preview');

  if (!val) {
    hint.className = 'nphv2-hint';
    hint.textContent = 'Letters, numbers, hyphens and underscores only.';
    preview.className = 'nphv2-preview';
    preview.innerHTML = 'yourname@nostr.ph';
    this.className = 'nphv2-input';
  } else {
    const { ok, msg } = validateName(val);
    hint.className = 'nphv2-hint ' + (ok ? 'ok' : 'err');
    hint.textContent = msg;
    preview.className = 'nphv2-preview ' + (ok ? 'active' : '');
    preview.innerHTML = ok ? '<span>' + esc(val) + '</span>@nostr.ph' : 'yourname@nostr.ph';
    this.className = 'nphv2-input ' + (ok ? 'ok' : 'err');
  }
  updateBtn();
});

$id('gv-pubkey').addEventListener('input', function() {
  const val = this.value.trim();
  const hint = $id('gv-pubkey-hint');

  if (!val) {
    hint.className = 'nphv2-hint';
    hint.textContent = 'Paste your npub or hex pubkey. Never share your nsec.';
    this.className = 'nphv2-input';
  } else {
    const { ok, msg } = validatePubkey(val);
    hint.className = 'nphv2-hint ' + (ok ? 'ok' : 'err');
    hint.textContent = msg;
    this.className = 'nphv2-input ' + (ok ? 'ok' : 'err');
  }
  updateBtn();
});

function updateBtn() {
  const name = $id('gv-name').value.trim().toLowerCase();
  const pub  = $id('gv-pubkey').value.trim();
  const ready = validateName(name).ok && validatePubkey(pub).ok;
  $id('gv-btn').classList.toggle('disabled', !ready);
}

// ── Invoice generation ────────────────────────────────────────────────────────
$id('gv-btn').addEventListener('click', async function() {
  if (this.classList.contains('disabled')) return;

  const name   = $id('gv-name').value.trim().toLowerCase();
  const pubRaw = $id('gv-pubkey').value.trim();
  const { hex } = validatePubkey(pubRaw);

  this.textContent = 'Generating...';
  this.classList.add('disabled');

  try {
    const r = await fetch(GV_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, pubkey: hex })
    });
    const invoice = await r.json();
    if (!invoice.id) throw new Error('No invoice returned');

    // Fetch BOLT11 payment string
    const mr = await fetch(GV_PROXY + '?invoice=' + invoice.id + '&methods=1');
    const methods = await mr.json();
    let bolt11 = null;
    if (Array.isArray(methods)) {
      const ln = methods.find(m => m.paymentMethodId === 'BTC-LN' || m.paymentType === 'LightningLike');
      if (ln) bolt11 = ln.destination || ln.paymentLink || null;
    }

    showInvoice(invoice, bolt11);

  } catch(e) {
    this.textContent = 'Generate Invoice';
    this.classList.remove('disabled');
    alert('Something went wrong generating your invoice. Please try again.');
  }
});

// ── Show invoice ──────────────────────────────────────────────────────────────
function showInvoice(invoice, bolt11) {
  const payString  = bolt11 || invoice.checkoutLink;
  const invoiceId  = invoice.id;

  const qrDiv  = $id('gv-qr');
  const strDiv = $id('gv-payment-string');

  strDiv.textContent = payString;

  if (window.QRCode) {
    qrDiv.innerHTML = '';
    new QRCode(qrDiv, {
      text: payString.toUpperCase(),
      width: 200,
      height: 200,
      colorDark: '#111018',
      colorLight: '#ffffff'
    });
  } else {
    qrDiv.textContent = 'QR unavailable';
  }

  $id('gv-invoice').classList.add('visible');

  $id('gv-copy-btn').onclick = async function() {
    try {
      await navigator.clipboard.writeText(payString);
      this.textContent = 'Copied!';
      this.classList.add('copied');
      setTimeout(() => { this.textContent = 'Copy invoice'; this.classList.remove('copied'); }, 2000);
    } catch(e) {}
  };

  pollPayment(invoiceId);
}

// ── Poll for payment ──────────────────────────────────────────────────────────
function pollPayment(invoiceId) {
  const statusDiv = $id('gv-status');
  statusDiv.className = 'nphv2-status waiting';
  statusDiv.textContent = 'Waiting for payment...';

  const interval = setInterval(async () => {
    try {
      const r = await fetch(GV_PROXY + '?invoice=' + invoiceId);
      const data = await r.json();
      if (data.status === 'Settled') {
        clearInterval(interval);
        statusDiv.className = 'nphv2-status paid';
        statusDiv.textContent = 'Payment received. Your address will be live within 24 hours.';
        $id('gv-btn').textContent = 'Paid';
      }
    } catch(e) {}
  }, 5000);

  setTimeout(() => clearInterval(interval), 1200000);
}

}); // end DOMContentLoaded

window._gvLoaded = true;
