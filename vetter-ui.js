/* Nostr Account Vetter UI — nostr.ph
 * Load via WPCode. Place <div id="nphvet-root"></div> on the WordPress page.
 * Calls /vetter-proxy.php which proxies to the Luna Node VPS.
 */
;(function () {
  'use strict'

  const API = 'https://api.nostr.ph'
  window._nphvetLoaded = true

  // ── Styles ──────────────────────────────────────────────────────────────────
  const css = `
    .nphvet { font-family: Inter, sans-serif; color: #111018; max-width: 860px; margin: 0 auto; padding: 0 16px 60px; }
    .nphvet h2 { font-family: Sora, sans-serif; font-weight: 700; font-size: 1.4rem; margin: 36px 0 12px; color: #111018; }
    .nphvet h3 { font-family: Sora, sans-serif; font-weight: 600; font-size: 1.05rem; margin: 0 0 6px; }

    /* Input card */
    .nphvet-card { background: #fff; border: 1px solid #e8e4f5; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .nphvet-input { width: 100%; box-sizing: border-box; font-family: 'IBM Plex Mono', monospace; font-size: 0.85rem;
      border: 1px solid #e8e4f5; border-radius: 8px; padding: 10px 12px; resize: vertical; min-height: 64px; color: #111018; }
    .nphvet-input:focus { outline: 2px solid #9333ea; border-color: #9333ea; }
    .nphvet-hint { font-size: 0.78rem; color: #6b6882; margin: 6px 0 16px; }
    .nphvet-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .nphvet-btn { background: #9333ea; color: #fff; border: none; border-radius: 8px; padding: 10px 22px;
      font-family: Sora, sans-serif; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: background 0.15s; }
    .nphvet-btn:hover { background: #7e22ce; }
    .nphvet-btn:disabled { background: #c4b5fd; cursor: not-allowed; }
    .nphvet-btn-sec { background: #f3f0ff; color: #9333ea; border: 1px solid #e8e4f5; }
    .nphvet-btn-sec:hover { background: #ede9fe; }

    /* Status */
    .nphvet-status { font-size: 0.85rem; color: #6b6882; margin-top: 10px; min-height: 20px; }

    /* Report */
    .nphvet-report { background: #f9f8ff; border: 1px solid #e8e4f5; border-radius: 12px; padding: 24px; margin-bottom: 24px; display: none; }
    .nphvet-report.visible { display: block; }
    .nphvet-report-body { font-size: 0.9rem; line-height: 1.7; color: #111018; }
    .nphvet-report-body p { margin: 0 0 14px; }
    .nphvet-report-body strong { color: #111018; }

    /* Verdict badge */
    .nphvet-verdict { display: inline-block; font-family: Sora, sans-serif; font-weight: 700; font-size: 0.8rem;
      padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; }
    .nphvet-verdict-VERIFIED   { background: #dcfce7; color: #15803d; }
    .nphvet-verdict-PROMISING  { background: #fef9c3; color: #854d0e; }
    .nphvet-verdict-UNVERIFIED { background: #f1f5f9; color: #475569; }
    .nphvet-verdict-RED\\ FLAG  { background: #fee2e2; color: #b91c1c; }

    /* Results table */
    .nphvet-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .nphvet-table th { text-align: left; padding: 8px 12px; background: #f9f8ff; border-bottom: 2px solid #e8e4f5;
      font-family: Sora, sans-serif; font-weight: 600; font-size: 0.78rem; color: #6b6882; text-transform: uppercase; letter-spacing: 0.04em; }
    .nphvet-table td { padding: 10px 12px; border-bottom: 1px solid #f1f0f8; vertical-align: middle; }
    .nphvet-table tr:last-child td { border-bottom: none; }
    .nphvet-table tr:hover td { background: #faf9ff; }
    .nphvet-table .npub-cell { font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem; color: #6b6882; }
    .nphvet-table .score-cell { font-family: 'IBM Plex Mono', monospace; font-weight: 600; }
    .nphvet-table .btn-link { background: none; border: none; color: #9333ea; cursor: pointer; font-size: 0.82rem;
      padding: 0; text-decoration: underline; font-family: Inter, sans-serif; }

    /* Verdict pill (small, for table) */
    .nphvet-pill { display: inline-block; font-size: 0.72rem; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
    .nphvet-pill-VERIFIED   { background: #dcfce7; color: #15803d; }
    .nphvet-pill-PROMISING  { background: #fef9c3; color: #854d0e; }
    .nphvet-pill-UNVERIFIED { background: #f1f5f9; color: #475569; }
    .nphvet-pill-RED\\ FLAG  { background: #fee2e2; color: #b91c1c; }

    .nphvet-empty { color: #6b6882; font-size: 0.88rem; padding: 20px 0; text-align: center; }
    .nphvet-ts { font-size: 0.75rem; color: #6b6882; }

    @media (max-width: 600px) {
      .nphvet-table th:nth-child(3), .nphvet-table td:nth-child(3) { display: none; }
    }
  `
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)

  // ── Root ────────────────────────────────────────────────────────────────────
  const root = document.getElementById('nphvet-root')
  if (!root) return
  root.className = 'nphvet'

  root.innerHTML = `
    <h2>Vet a Nostr Account</h2>
    <div class="nphvet-card">
      <textarea class="nphvet-input" id="nphvet-input"
        placeholder="Enter one npub per line for batch vetting, or a single npub to vet immediately"></textarea>
      <p class="nphvet-hint">Single npub → instant report &nbsp;·&nbsp; Multiple npubs (one per line) → batch queue, results stored</p>
      <div class="nphvet-row">
        <button class="nphvet-btn" id="nphvet-submit">Vet Account</button>
        <button class="nphvet-btn nphvet-btn-sec" id="nphvet-refresh">Refresh Results</button>
      </div>
      <p class="nphvet-status" id="nphvet-status"></p>
    </div>

    <div class="nphvet-report" id="nphvet-report">
      <div id="nphvet-report-badge"></div>
      <div class="nphvet-report-body" id="nphvet-report-body"></div>
    </div>

    <h2>Vetted Accounts</h2>
    <div id="nphvet-table-wrap">
      <p class="nphvet-empty">Loading…</p>
    </div>
  `

  const inputEl   = document.getElementById('nphvet-input')
  const submitBtn = document.getElementById('nphvet-submit')
  const refreshBtn = document.getElementById('nphvet-refresh')
  const statusEl  = document.getElementById('nphvet-status')
  const reportEl  = document.getElementById('nphvet-report')
  const badgeEl   = document.getElementById('nphvet-report-badge')
  const bodyEl    = document.getElementById('nphvet-report-body')
  const tableWrap = document.getElementById('nphvet-table-wrap')

  // ── Markdown renderer (handles the subset we generate) ───────────────────
  function renderMarkdown(md) {
    return md
      .split('\n\n')
      .map(block => {
        const line = block
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>')
        return `<p>${line}</p>`
      })
      .join('')
  }

  // ── API helpers ──────────────────────────────────────────────────────────
  async function apiFetch(path, opts = {}) {
    const res = await fetch(API + path, opts)
    return res.json()
  }

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg
    statusEl.style.color = isError ? '#dc2626' : '#6b6882'
  }

  function tsToDate(ts) {
    return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // ── Show report ──────────────────────────────────────────────────────────
  function showReport(result) {
    const vClass = result.verdict.replace(' ', '\\ ')
    badgeEl.innerHTML = `<span class="nphvet-verdict nphvet-verdict-${vClass}">${result.verdict}</span>
      <span style="font-size:0.78rem;color:#6b6882;margin-left:10px;">Score: ${result.score} &nbsp;·&nbsp; ${result.displayName}</span>`
    bodyEl.innerHTML = renderMarkdown(result.report)
    reportEl.classList.add('visible')
    reportEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Results table ────────────────────────────────────────────────────────
  function renderTable(rows) {
    if (!rows.length) {
      tableWrap.innerHTML = '<p class="nphvet-empty">No accounts vetted yet.</p>'
      return
    }
    const rowsHtml = rows.map(r => {
      const vClass = r.verdict.replace(' ', '\\ ')
      return `<tr>
        <td><strong>${escHtml(r.display_name || '')}</strong></td>
        <td><span class="nphvet-pill nphvet-pill-${vClass}">${r.verdict}</span></td>
        <td class="score-cell">${r.score}</td>
        <td class="npub-cell">${r.npub.slice(0, 20)}…</td>
        <td class="ts-cell nphvet-ts">${tsToDate(r.updated_at)}</td>
        <td><button class="btn-link" data-npub="${escHtml(r.npub)}">View</button></td>
      </tr>`
    }).join('')

    tableWrap.innerHTML = `
      <table class="nphvet-table">
        <thead><tr>
          <th>Account</th><th>Verdict</th><th>Score</th>
          <th>npub</th><th>Last vetted</th><th></th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`

    tableWrap.querySelectorAll('.btn-link').forEach(btn => {
      btn.addEventListener('click', async () => {
        const npub = btn.dataset.npub
        setStatus('Loading report…')
        const data = await apiFetch(`/results/${npub}`)
        if (data.error) { setStatus(data.error, true); return }
        showReport(data)
        setStatus('')
      })
    })
  }

  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  // ── Load results ─────────────────────────────────────────────────────────
  async function loadResults() {
    const data = await apiFetch('/results').catch(() => null)
    if (!data || data.error) { tableWrap.innerHTML = '<p class="nphvet-empty">Could not load results.</p>'; return }
    renderTable(data)
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  submitBtn.addEventListener('click', async () => {
    const raw   = inputEl.value.trim()
    const npubs = raw.split('\n').map(s => s.trim()).filter(s => s.startsWith('npub1'))

    if (!npubs.length) { setStatus('Please enter a valid npub (starts with npub1).', true); return }

    submitBtn.disabled = true
    reportEl.classList.remove('visible')

    if (npubs.length === 1) {
      setStatus('Vetting account — this may take 20–40 seconds…')
      const data = await apiFetch('/vet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npub: npubs[0] }),
      }).catch(e => ({ error: e.message }))

      if (data.error) { setStatus(`Error: ${data.error}`, true) }
      else { showReport(data); setStatus('Done.'); loadResults() }

    } else {
      setStatus(`Queuing ${npubs.length} accounts for batch vetting…`)
      const data = await apiFetch('/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npubs }),
      }).catch(e => ({ error: e.message }))

      if (data.error) setStatus(`Error: ${data.error}`, true)
      else setStatus(`${data.message}. Check back in a few minutes and click Refresh Results.`)
    }

    submitBtn.disabled = false
  })

  refreshBtn.addEventListener('click', () => { setStatus('Refreshing…'); loadResults().then(() => setStatus('')) })

  // ── Init ─────────────────────────────────────────────────────────────────
  loadResults()
})()
