// nkc2.js — nostr.ph tools library
// All 5 tools: npub/hex converter, NIP-05 lookup, relay list, note decoder, client links

// ── Core library ────────────────────────────────────────────────────
if (!window._nkcLoaded) {
  window._nkcLoaded = true;

  const _B32  = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  const _B32G = [0x3b6a57b2,0x26508e6d,0x1ea119fa,0x3d4233dd,0x2a1462b3];

  function _poly(v){let c=1;for(const x of v){const t=c>>25;c=((c&0x1ffffff)<<5)^x;for(let i=0;i<5;i++)if((t>>i)&1)c^=_B32G[i];}return c;}
  function _hrpX(h){const r=[];for(let i=0;i<h.length;i++)r.push(h.charCodeAt(i)>>5);r.push(0);for(let i=0;i<h.length;i++)r.push(h.charCodeAt(i)&31);return r;}

  window._b32Decode = function(str) {
    const s = str.toLowerCase().trim();
    const p = s.lastIndexOf('1');
    if (p < 1) throw new Error('Invalid bech32');
    const hrp = s.slice(0, p), data = [];
    for (let i = p+1; i < s.length; i++) {
      const d = _B32.indexOf(s[i]);
      if (d < 0) throw new Error('Invalid character: ' + s[i]);
      data.push(d);
    }
    if (_poly([..._hrpX(hrp), ...data]) !== 1) throw new Error('Invalid checksum');
    return { hrp, words: data.slice(0,-6) };
  };

  window._b32Encode = function(hrp, words) {
    const comb = [..._hrpX(hrp), ...words, 0,0,0,0,0,0];
    const poly = _poly(comb) ^ 1;
    const chk  = [0,1,2,3,4,5].map(i => (poly>>(5*(5-i)))&31);
    return hrp + '1' + [...words, ...chk].map(w => _B32[w]).join('');
  };

  window._cvBits = function(data, from, to, pad) {
    let acc=0, bits=0; const out=[], max=(1<<to)-1;
    for (const v of data) {
      acc=(acc<<from)|v; bits+=from;
      while(bits>=to){bits-=to; out.push((acc>>bits)&max);}
    }
    if (pad && bits>0) out.push((acc<<(to-bits))&max);
    return out;
  };

  window._h2b = function(hex) {
    const h = hex.toLowerCase().replace(/\s/g,'');
    if (h.length%2 || !/^[0-9a-f]*$/.test(h)) throw new Error('Invalid hex');
    return new Uint8Array(h.match(/.{2}/g).map(b=>parseInt(b,16)));
  };

  window._b2h = function(b) {
    return Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('');
  };

  window._npubEncode = function(hex) {
    return _b32Encode('npub', _cvBits(_h2b(hex), 8, 5, true));
  };

  window._noteEncode = function(hex) {
    return _b32Encode('note', _cvBits(_h2b(hex), 8, 5, true));
  };

  window._resolveNpub = function(raw) {
    raw = raw.trim();
    if (/^npub1/i.test(raw)) {
      const d = _b32Decode(raw);
      if (d.hrp !== 'npub') throw new Error('Not an npub');
      return _b2h(new Uint8Array(_cvBits(d.words, 5, 8, false)));
    }
    if (raw.length !== 64) throw new Error('Hex pubkey must be 64 characters');
    _h2b(raw);
    return raw.toLowerCase();
  };

  window._hexToNpub = function(hex) {
    return _npubEncode(hex);
  };

  window._parseTLV = function(bytes) {
    const r={}; let i=0;
    while (i+1<bytes.length) {
      const t=bytes[i++], len=bytes[i++];
      if (i+len>bytes.length) break;
      if (!r[t]) r[t]=[];
      r[t].push(bytes.slice(i,i+len));
      i+=len;
    }
    return r;
  };

  window._esc = function(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };

  window._copy = function(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      const prev = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = prev, 1500);
    });
  };

  const _css = [
    '.nkc2{border:1px solid #dde1e7;border-radius:8px;padding:22px 24px;margin:28px 0;background:#f8f9fb;font-family:inherit;}',
    '.nkc2 h3{margin:0 0 5px;font-size:17px;}',
    '.nkc2 .nkc2-desc{font-size:14px;color:#5a6474;margin:0 0 16px;line-height:1.6;}',
    '.nkc2 label{display:block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#5a6474;margin:0 0 5px;}',
    '.nkc2 input[type=text]{display:block;width:100%;padding:9px 12px;border:1px solid #cdd1d8;border-radius:5px;font-family:monospace;font-size:13px;box-sizing:border-box;background:#fff;color:#1a1a2e;transition:border-color .15s;margin-bottom:4px;}',
    '.nkc2 input[type=text]:focus{outline:none;border-color:#7c3aed;}',
    '.nkc2 .nkc2-btn{display:inline-block;margin-top:10px;padding:9px 22px;background:#1a1a2e;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:14px;transition:background .15s;}',
    '.nkc2 .nkc2-btn:hover{background:#373756;}',
    '.nkc2 .nkc2-btn:disabled{opacity:.5;cursor:not-allowed;}',
    '.nkc2-result{margin-top:16px;}',
    '.nkc2-field{background:#fff;border:1px solid #dde1e7;border-radius:5px;padding:11px 13px;margin-bottom:8px;}',
    '.nkc2-field-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;}',
    '.nkc2-field-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8a93a2;}',
    '.nkc2-val{font-family:monospace;font-size:13px;word-break:break-all;color:#1a1a2e;line-height:1.6;}',
    '.nkc2-copy{font-size:11px;padding:2px 8px;border:1px solid #cdd1d8;border-radius:3px;background:#f4f5f7;cursor:pointer;color:#5a6474;white-space:nowrap;}',
    '.nkc2-copy:hover{background:#e8eaed;}',
    '.nkc2-err{font-size:13px;color:#b91c1c;margin-top:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:5px;padding:9px 12px;display:none;}',
    '.nkc2-note{font-size:13px;color:#5a6474;border-left:3px solid #7c3aed;padding:7px 12px;margin-bottom:14px;background:#f3f0ff;border-radius:0 4px 4px 0;line-height:1.6;}',
    '.nkc2-relay-list{list-style:none;padding:0;margin:0;}',
    '.nkc2-relay-item{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eef0f3;gap:8px;font-family:monospace;font-size:12px;}',
    '.nkc2-relay-item:last-child{border-bottom:none;}',
    '.nkc2-tag{font-size:10px;padding:2px 7px;border-radius:3px;white-space:nowrap;font-family:inherit;font-weight:700;}',
    '.nkc2-tag-rw{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;}',
    '.nkc2-tag-r{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;}',
    '.nkc2-tag-w{background:#faf5ff;border:1px solid #e9d5ff;color:#6b21a8;}',
    '.nkc2-client-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin-top:2px;}',
    '.nkc2-client-a{display:block;padding:9px 13px;border:1px solid #dde1e7;border-radius:5px;text-decoration:none!important;background:#fff;color:#1a1a2e!important;font-size:14px;font-weight:600;transition:border-color .15s,background .15s;}',
    '.nkc2-client-a:hover{border-color:#7c3aed;background:#f9f7ff;}',
    '.nkc2-client-a small{display:block;font-size:11px;color:#8a93a2;font-weight:400;margin-top:2px;font-family:monospace;}'
  ].join('');

  if (!document.getElementById('nkc2-styles')) {
    const st = document.createElement('style');
    st.id = 'nkc2-styles';
    st.textContent = _css;
    document.head.appendChild(st);
  }
}

// ── Tool functions ───────────────────────────────────────────────────

function nkc2_n2h() {
  const raw = document.getElementById('n2h-in').value.trim();
  const err = document.getElementById('n2h-err');
  const res = document.getElementById('n2h-result');
  err.style.display='none'; res.style.display='none';
  if (!raw) { err.textContent='Enter an npub.'; err.style.display='block'; return; }
  if (!/^npub1/i.test(raw)) { err.textContent='Must start with npub1.'; err.style.display='block'; return; }
  try {
    const hex = _resolveNpub(raw);
    document.getElementById('n2h-hex').textContent = hex;
    document.getElementById('n2h-copy').onclick = function(){ _copy(hex, this); };
    res.style.display='block';
  } catch(e) { err.textContent=e.message; err.style.display='block'; }
}

function nkc2_h2n() {
  const raw = document.getElementById('h2n-in').value.trim().toLowerCase();
  const err = document.getElementById('h2n-err');
  const res = document.getElementById('h2n-result');
  err.style.display='none'; res.style.display='none';
  if (!raw) { err.textContent='Enter a hex pubkey.'; err.style.display='block'; return; }
  if (!/^[0-9a-f]{64}$/.test(raw)) { err.textContent='Must be a 64-character hex string.'; err.style.display='block'; return; }
  try {
    const npub = _hexToNpub(raw);
    document.getElementById('h2n-npub').textContent = npub;
    document.getElementById('h2n-copy').onclick = function(){ _copy(npub, this); };
    res.style.display='block';
  } catch(e) { err.textContent=e.message; err.style.display='block'; }
}

async function nkc2_nip05() {
  const val = document.getElementById('n05-in').value.trim().toLowerCase();
  const err = document.getElementById('n05-err');
  const res = document.getElementById('n05-result');
  const btn = document.getElementById('n05-btn');
  err.style.display='none'; res.style.display='none'; res.innerHTML='';

  const parts = val.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    err.textContent='Enter a nostr address in name@domain.com format.';
    err.style.display='block'; return;
  }
  const [name, domain] = parts;
  btn.textContent='Looking up\u2026'; btn.disabled=true;

  try {
    const r = await fetch('https://' + domain + '/.well-known/nostr.json?name=' + encodeURIComponent(name));
    if (!r.ok) throw new Error('Server returned HTTP ' + r.status);
    const data = await r.json();
    const hex = data.names?.[name] ?? data.names?.[name.toLowerCase()];
    if (!hex) throw new Error('"' + name + '" not found in the nostr.json at ' + domain);
    const npub = _npubEncode(hex);
    const relays = data.relays?.[hex] || [];

    let h = '<div class="nkc2-field"><div class="nkc2-field-head"><span class="nkc2-field-label">npub</span>'
          + '<button class="nkc2-copy" onclick="_copy(\'' + _esc(npub) + '\',this)">Copy</button></div>'
          + '<div class="nkc2-val">' + _esc(npub) + '</div></div>'
          + '<div class="nkc2-field"><div class="nkc2-field-head"><span class="nkc2-field-label">hex pubkey</span>'
          + '<button class="nkc2-copy" onclick="_copy(\'' + _esc(hex) + '\',this)">Copy</button></div>'
          + '<div class="nkc2-val">' + _esc(hex) + '</div></div>';

    if (relays.length) {
      h += '<div class="nkc2-field"><div class="nkc2-field-head"><span class="nkc2-field-label">relays in nostr.json (' + relays.length + ')</span></div>'
         + '<ul class="nkc2-relay-list">' + relays.map(u => '<li class="nkc2-relay-item"><span>' + _esc(u) + '</span></li>').join('') + '</ul></div>';
    }
    res.innerHTML=h; res.style.display='block';
  } catch(e) {
    err.textContent='Lookup failed: ' + e.message; err.style.display='block';
  } finally {
    btn.textContent='Look up'; btn.disabled=false;
  }
}

async function nkc2_relay() {
  const raw      = document.getElementById('rl-key').value.trim();
  const relayUrl = document.getElementById('rl-relay').value.trim();
  const err      = document.getElementById('rl-err');
  const res      = document.getElementById('rl-result');
  const btn      = document.getElementById('rl-btn');
  err.style.display='none'; res.style.display='none'; res.innerHTML='';

  if (!raw)      { err.textContent='Enter an npub or hex pubkey.'; err.style.display='block'; return; }
  if (!relayUrl) { err.textContent='Enter a relay URL.'; err.style.display='block'; return; }

  let pubHex;
  try { pubHex = _resolveNpub(raw); }
  catch(e) { err.textContent=e.message; err.style.display='block'; return; }

  btn.textContent='Connecting\u2026'; btn.disabled=true;

  try {
    const relays = await nkc2_wsLookup(pubHex, relayUrl);
    if (!relays.length) {
      res.innerHTML='<p style="font-size:13px;color:#5a6474;padding:4px 0">No relay list (kind 10002) found for this key on that relay. Try a different relay, or the user may not have published one.</p>';
    } else {
      res.innerHTML='<div class="nkc2-field"><div class="nkc2-field-head"><span class="nkc2-field-label">relay list \u2014 ' + relays.length + ' ' + (relays.length===1?'entry':'entries') + '</span></div>'
        + '<ul class="nkc2-relay-list">' + relays.map(r =>
            '<li class="nkc2-relay-item"><span>' + _esc(r.url) + '</span>'
            + (r.type==='read'  ? '<span class="nkc2-tag nkc2-tag-r">read</span>'
              :r.type==='write' ? '<span class="nkc2-tag nkc2-tag-w">write</span>'
              :                   '<span class="nkc2-tag nkc2-tag-rw">read + write</span>')
            + '</li>'
          ).join('') + '</ul></div>';
    }
    res.style.display='block';
  } catch(e) {
    err.textContent='Lookup failed: ' + e.message; err.style.display='block';
  } finally {
    btn.textContent='Look up'; btn.disabled=false;
  }
}

function nkc2_wsLookup(pubHex, relayUrl) {
  return new Promise((resolve, reject) => {
    let ws, done=false;
    function finish(fn,v){if(done)return;done=true;clearTimeout(t);try{ws.close();}catch(e){}fn(v);}
    try { ws=new WebSocket(relayUrl); } catch(e) { reject(new Error('Invalid relay URL')); return; }
    const t=setTimeout(()=>finish(reject,new Error('Timed out after 10s')),10000);
    ws.onopen=()=>{
      const sub=Math.random().toString(36).slice(2,10);
      ws.send(JSON.stringify(['REQ',sub,{kinds:[10002],authors:[pubHex],limit:1}]));
    };
    ws.onmessage=e=>{
      try {
        const msg=JSON.parse(e.data);
        if(msg[0]==='EVENT'&&msg[2]){
          finish(resolve,msg[2].tags.filter(t=>t[0]==='r'&&t[1]).map(t=>({url:t[1],type:t[2]||'both'})));
        } else if(msg[0]==='EOSE'){
          finish(resolve,[]);
        }
      } catch(e){}
    };
    ws.onerror=()=>finish(reject,new Error('WebSocket connection failed'));
    ws.onclose=()=>{if(!done)finish(reject,new Error('Connection closed unexpectedly'));};
  });
}

function nkc2_note() {
  const raw = document.getElementById('nd-in').value.trim();
  const err = document.getElementById('nd-err');
  const res = document.getElementById('nd-result');
  err.style.display='none'; res.style.display='none'; res.innerHTML='';

  if (!raw) { err.textContent='Enter a note1, nevent1, or hex event ID.'; err.style.display='block'; return; }

  try {
    let eventId=null, relays=[], author=null, kind=null, inputType='';

    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      _h2b(raw);
      eventId=raw.toLowerCase();
      inputType='hex';
    } else if (/^note1/i.test(raw)) {
      const d=_b32Decode(raw);
      if(d.hrp!=='note') throw new Error('Not a valid note1 string');
      const bytes=new Uint8Array(_cvBits(d.words,5,8,false));
      if(bytes.length!==32) throw new Error('Expected 32 bytes for a note ID');
      eventId=_b2h(bytes);
      inputType='note1';
    } else if (/^nevent1/i.test(raw)) {
      const d=_b32Decode(raw);
      if(d.hrp!=='nevent') throw new Error('Not a valid nevent1 string');
      const bytes=new Uint8Array(_cvBits(d.words,5,8,false));
      const tlv=_parseTLV(bytes);
      const td=new TextDecoder();
      if(tlv[0]?.[0]) eventId=_b2h(tlv[0][0]);
      if(tlv[1]?.length) relays=tlv[1].map(r=>td.decode(r));
      if(tlv[2]?.[0]) author=_b2h(tlv[2][0]);
      if(tlv[3]?.[0]){const kb=tlv[3][0];kind=(kb[0]<<24)|(kb[1]<<16)|(kb[2]<<8)|kb[3];}
      inputType='nevent1';
    } else {
      throw new Error('Input not recognized. Expected note1, nevent1, or a 64-char hex string.');
    }

    if (!eventId) throw new Error('Could not extract event ID from input');

    const note1=_noteEncode(eventId);
    let h='<div class="nkc2-field"><div class="nkc2-field-head"><span class="nkc2-field-label">input type</span></div>'
        +'<div class="nkc2-val" style="color:#7c3aed">'+_esc(inputType)+'</div></div>';

    h+='<div class="nkc2-field"><div class="nkc2-field-head"><span class="nkc2-field-label">event ID (hex)</span>'
      +'<button class="nkc2-copy" onclick="_copy(\''+_esc(eventId)+'\',this)">Copy</button></div>'
      +'<div class="nkc2-val">'+_esc(eventId)+'</div></div>';

    h+='<div class="nkc2-field"><div class="nkc2-field-head"><span class="nkc2-field-label">note1</span>'
      +'<button class="nkc2-copy" onclick="_copy(\''+_esc(note1)+'\',this)">Copy</button></div>'
      +'<div class="nkc2-val">'+_esc(note1)+'</div></div>';

    if (author) {
      const authorNpub=_npubEncode(author);
      h+='<div class="nkc2-field"><div class="nkc2-field-head"><span class="nkc2-field-label">author (npub)</span>'
        +'<button class="nkc2-copy" onclick="_copy(\''+_esc(authorNpub)+'\',this)">Copy</button></div>'
        +'<div class="nkc2-val">'+_esc(authorNpub)+'</div></div>';
      h+='<div class="nkc2-field"><div class="nkc2-field-head"><span class="nkc2-field-label">author (hex)</span>'
        +'<button class="nkc2-copy" onclick="_copy(\''+_esc(author)+'\',this)">Copy</button></div>'
        +'<div class="nkc2-val">'+_esc(author)+'</div></div>';
    }

    if (kind !== null) {
      h+='<div class="nkc2-field"><div class="nkc2-field-head"><span class="nkc2-field-label">kind</span></div>'
        +'<div class="nkc2-val">'+kind+'</div></div>';
    }

    if (relays.length) {
      h+='<div class="nkc2-field"><div class="nkc2-field-head"><span class="nkc2-field-label">relay hints ('+relays.length+')</span></div>'
        +'<ul class="nkc2-relay-list">'+relays.map(r=>'<li class="nkc2-relay-item"><span>'+_esc(r)+'</span></li>').join('')+'</ul></div>';
    }

    res.innerHTML=h; res.style.display='block';
  } catch(e) {
    err.textContent=e.message; err.style.display='block';
  }
}

function nkc2_clients() {
  const raw = document.getElementById('cl-in').value.trim();
  const err = document.getElementById('cl-err');
  const res = document.getElementById('cl-result');
  err.style.display='none'; res.style.display='none'; res.innerHTML='';

  let pubHex, npub;
  try {
    pubHex=_resolveNpub(raw);
    npub=/^npub1/i.test(raw) ? raw.trim().toLowerCase() : _npubEncode(pubHex);
  } catch(e) {
    err.textContent=e.message; err.style.display='block'; return;
  }

  const clients=[
    {name:'Primal',    host:'primal.net',      url:'https://primal.net/p/'+npub},
    {name:'njump',     host:'njump.me',         url:'https://njump.me/'+npub},
    {name:'Snort',     host:'snort.social',     url:'https://snort.social/p/'+npub},
    {name:'Coracle',   host:'coracle.social',   url:'https://coracle.social/'+npub},
    {name:'Iris',      host:'iris.to',          url:'https://iris.to/'+npub},
    {name:'nostrudel', host:'nostrudel.ninja',  url:'https://nostrudel.ninja/#/u/'+npub},
    {name:'nosta.me',  host:'nosta.me',         url:'https://nosta.me/'+npub},
    {name:'Nostter',   host:'nostter.app',      url:'https://nostter.app/'+npub},
  ];

  const grid=clients.map(c=>
    '<a class="nkc2-client-a" href="'+_esc(c.url)+'" target="_blank" rel="noopener noreferrer">'
    +_esc(c.name)+'<small>'+_esc(c.host)+'</small></a>'
  ).join('');

  res.innerHTML='<div class="nkc2-client-grid">'+grid+'</div>'
    +'<div style="margin-top:10px"><div class="nkc2-field"><div class="nkc2-field-head"><span class="nkc2-field-label">npub</span>'
    +'<button class="nkc2-copy" onclick="_copy(\''+_esc(npub)+'\',this)">Copy</button></div>'
    +'<div class="nkc2-val">'+_esc(npub)+'</div></div></div>';

  res.style.display='block';
}

// ── Event listeners (Enter key on inputs) ───────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var pairs = [
    ['n2h-in',  nkc2_n2h],
    ['h2n-in',  nkc2_h2n],
    ['n05-in',  nkc2_nip05],
    ['rl-key',  nkc2_relay],
    ['nd-in',   nkc2_note],
    ['cl-in',   nkc2_clients],
  ];
  pairs.forEach(function(p) {
    var el = document.getElementById(p[0]);
    if (el) el.addEventListener('keydown', function(e) { if (e.key==='Enter') p[1](); });
  });
});
