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

    /* npub display */
    .nphvet-npub { font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem; color: #6b6882;
      word-break: break-all; margin: 4px 0 16px; }

    /* Criteria disclosure */
    .nphvet-criteria { margin-bottom: 24px; }
    .nphvet-criteria summary { cursor: pointer; font-family: Sora, sans-serif; font-weight: 600;
      font-size: 0.85rem; color: #9333ea; list-style: none; display: flex; align-items: center; gap: 6px; user-select: none; }
    .nphvet-criteria summary::-webkit-details-marker { display: none; }
    .nphvet-criteria summary::before { content: '▸'; font-size: 0.7rem; transition: transform 0.15s; }
    .nphvet-criteria[open] summary::before { transform: rotate(90deg); }
    .nphvet-criteria-body { background: #f9f8ff; border: 1px solid #e8e4f5; border-radius: 10px;
      padding: 18px 20px; margin-top: 10px; font-size: 0.84rem; line-height: 1.75; color: #111018; }
    .nphvet-criteria-body p { margin: 0 0 10px; }
    .nphvet-criteria-body p:last-child { margin-bottom: 0; }
    .nphvet-criteria-body strong { color: #111018; }
    .nphvet-criteria-body ul { margin: 4px 0 10px 18px; padding: 0; }
    .nphvet-criteria-body li { margin-bottom: 2px; }
  `
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)

  // ── Root ────────────────────────────────────────────────────────────────────
  const root = document.getElementById('nphvet-root')
  if (!root) return
  root.className = 'nphvet'

  root.innerHTML = `
    <h2>Nostr Account Vetter</h2>
    <div class="nphvet-card">
      <textarea class="nphvet-input" id="nphvet-input"
        placeholder="Enter an npub to vet (starts with npub1)"></textarea>
      <p class="nphvet-hint">Enter a single npub to generate a report. Results are not stored — use the copy button to save.</p>
      <div class="nphvet-row">
        <button class="nphvet-btn" id="nphvet-submit">Vet Account</button>
      </div>
      <p class="nphvet-status" id="nphvet-status"></p>
    </div>

    <details class="nphvet-criteria" id="nphvet-criteria">
      <summary>How accounts are scored</summary>
      <div class="nphvet-criteria-body">
        <p><strong>Imposter detection</strong> — the account's name and display name are checked against a list of known Nostr figures (Jack Dorsey, fiatjaf, Snowden, and others). If the name matches a known figure but the npub does not, the report issues an <strong>IMPOSTER WARNING</strong> and the verdict is forced to RED FLAG regardless of score. Follower count is also surfaced as context — a high follower count combined with no WOT follows and a new account is a secondary imposter signal.</p>
        <p><strong>Bot risk detection</strong> — a composite warning is shown when three or more of the following signals are present: high average post rate (over 15/day), very low reply ratio (bots rarely converse), unusually uniform post lengths, suspiciously regular posting intervals, or a large follow/follower asymmetry. This is a probabilistic warning, not a score deduction.</p>
        <p><strong>Web of Trust (WOT)</strong> is the most heavily weighted scoring factor. Each account is checked against 12 trusted anchor accounts — Anita Posch, Alex Gladstein, Jack Dorsey, fiatjaf, Matt Odell, DerGigi, jb55, Snowden, Derek Ross, Lyn Alden, NVK, and Vitor Pamplona. A follow from any anchor adds <strong>20 points</strong>. A mutual follow between the account and any anchor adds a further <strong>5-point bonus</strong> per anchor.</p>
        <p><strong>Activity</strong> — posting within the past 90 days adds <strong>+15 points</strong>. Going completely silent for over a year deducts <strong>20 points</strong>.</p>
        <p><strong>Zap activity</strong> — actively sending zaps on Lightning (any zaps in the past 90 days, or more than 5 total) adds <strong>+15 points</strong>. A strong signal of genuine Bitcoin/Nostr participation.</p>
        <p><strong>Engagement</strong> — three or more substantive replies (over 80 characters) in the past 90 days adds <strong>+10 points</strong>; lighter reply activity adds <strong>+3 points</strong>.</p>
        <p><strong>Paid relay</strong> — if the account publishes to a known paid relay (relay.damus.io, nostr.wine, etc.), that adds <strong>+10 points</strong>. Bots and throwaway accounts rarely pay for relay access. No penalty for absence — many legitimate accounts use only free relays.</p>
        <p><strong>Identity verification</strong> — a verified NIP-05 address adds <strong>+5 points</strong>. If the NIP-05 domain also matches the website listed in the profile, that's an additional <strong>+10 points</strong>.</p>
        <p><strong>Profile completeness</strong> — having a profile picture, a bio, and a website set adds <strong>+5 points</strong>.</p>
        <p>Verdicts are assigned by total score: <strong>VERIFIED</strong> (75+), <strong>PROMISING</strong> (40–74), <strong>UNVERIFIED</strong> (15–39), <strong>RED FLAG</strong> (below 15). Imposter matches always produce RED FLAG regardless of score.</p>
      </div>
    </details>

    <div class="nphvet-report" id="nphvet-report">
      <div id="nphvet-report-badge"></div>
      <div class="nphvet-npub" id="nphvet-report-npub"></div>
      <div class="nphvet-report-body" id="nphvet-report-body"></div>
      <div style="margin-top:16px;">
        <button class="nphvet-btn nphvet-btn-sec" id="nphvet-copy">Copy Report</button>
        <span id="nphvet-copy-status" style="font-size:0.78rem;color:#6b6882;margin-left:10px;"></span>
      </div>
    </div>
  `

  const inputEl      = document.getElementById('nphvet-input')
  const submitBtn    = document.getElementById('nphvet-submit')
  const statusEl     = document.getElementById('nphvet-status')
  const reportEl     = document.getElementById('nphvet-report')
  const badgeEl      = document.getElementById('nphvet-report-badge')
  const npubEl       = document.getElementById('nphvet-report-npub')
  const bodyEl       = document.getElementById('nphvet-report-body')
  const copyBtn      = document.getElementById('nphvet-copy')
  const copyStatusEl = document.getElementById('nphvet-copy-status')

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

  // ── Show report ──────────────────────────────────────────────────────────
  let currentReport = null

  function showReport(result) {
    currentReport = result
    const vClass = result.verdict.replace(' ', '\\ ')
    badgeEl.innerHTML = `<span class="nphvet-verdict nphvet-verdict-${vClass}">${result.verdict}</span>
      <span style="font-size:0.78rem;color:#6b6882;margin-left:10px;">Score: ${result.score} &nbsp;·&nbsp; ${result.displayName}</span>`
    npubEl.textContent = result.npub
    bodyEl.innerHTML = renderMarkdown(result.report)
    copyStatusEl.textContent = ''
    reportEl.classList.add('visible')
    reportEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Copy report ──────────────────────────────────────────────────────────
  copyBtn.addEventListener('click', () => {
    if (!currentReport) return
    const text = [
      'Nostr Account Vet Report',
      `npub: ${currentReport.npub}`,
      `Account: ${currentReport.displayName}`,
      `Verdict: ${currentReport.verdict} (score: ${currentReport.score})`,
      '',
      currentReport.report,
      '',
      'Vetted at nostr.ph/vetter',
    ].join('\n')

    navigator.clipboard.writeText(text).then(() => {
      copyStatusEl.textContent = 'Copied!'
      setTimeout(() => { copyStatusEl.textContent = '' }, 2000)
    }).catch(() => {
      copyStatusEl.textContent = 'Copy failed — select and copy manually.'
    })
  })

  // ── Submit ───────────────────────────────────────────────────────────────
  submitBtn.addEventListener('click', async () => {
    const raw  = inputEl.value.trim()
    const npub = raw.split('\n').map(s => s.trim()).find(s => s.startsWith('npub1'))

    if (!npub) { setStatus('Please enter a valid npub (starts with npub1).', true); return }

    submitBtn.disabled = true
    reportEl.classList.remove('visible')

    setStatus('Vetting account — this may take 20–40 seconds…')
    const data = await apiFetch('/vet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ npub }),
    }).catch(e => ({ error: e.message }))

    if (data.error) { setStatus(`Error: ${data.error}`, true) }
    else { showReport(data); setStatus('') }

    submitBtn.disabled = false
  })
})()
