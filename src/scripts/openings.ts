/**
 * Renders the live list of open roles from /api/openings.
 *
 * Kept out of the .astro file so Astro emits it as a real script file: the
 * site's CSP is `script-src 'self'`, which blocks anything inlined into the
 * page. This one matters — inlined, the careers page shows a skeleton forever.
 */
type Opening = {
    id: string;
    requisitionNumber: string;
    position: string;
    market: string;
    office: string;
    city: string;
    state: string;
    openings: number;
  };

  const host = document.getElementById('openings');
  const status = document.getElementById('openings-status');
  if (!host) throw new Error('openings host missing');

  const esc = (s: string) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

  function render(list: Opening[]) {
    if (!list.length) {
      host!.dataset.state = 'empty';
      host!.innerHTML = `
        <div class="card p-8">
          <h3 class="font-display text-xl">No postings open right now.</h3>
          <p class="mt-3 leading-relaxed" style="color: var(--text-body)">
            Crews change fast and roles open with little notice. Send an application anyway — we keep them
            on file and a recruiter will reach out when something matches.
          </p>
          <a href="/careers/apply" class="btn btn-primary mt-6">Submit an application</a>
        </div>`;
      if (status) status.textContent = 'No open positions at the moment.';
      return;
    }

    // Group by market so people scan for where they live.
    const byMarket = new Map<string, Opening[]>();
    for (const o of list) {
      const key = o.market || 'Other';
      if (!byMarket.has(key)) byMarket.set(key, []);
      byMarket.get(key)!.push(o);
    }

    host!.dataset.state = 'ready';
    host!.innerHTML = [...byMarket.entries()]
      .map(
        ([market, roles]) => `
        <section class="mb-12">
          <h3 class="font-display text-xs font-semibold uppercase tracking-[0.14em]" style="color: var(--text-muted)">
            ${esc(market)} &middot; ${roles.length} ${roles.length === 1 ? 'role' : 'roles'}
          </h3>
          <ul class="grid-hairline mt-5 grid sm:grid-cols-2 lg:grid-cols-3">
            ${roles
              .map(
                (r) => `
              <li class="p-7" style="background: var(--surface)">
                <p class="font-display text-xs font-semibold uppercase tracking-[0.14em]" style="color: var(--accent)">
                  Req ${esc(r.requisitionNumber)}
                </p>
                <h4 class="mt-2 font-display text-lg">${esc(r.position)}</h4>
                <p class="mt-1.5 text-sm" style="color: var(--text-muted)">
                  ${esc(r.city)}${r.state ? ', ' + esc(r.state) : ''}
                  ${r.openings > 1 ? ` &middot; ${r.openings} openings` : ''}
                </p>
                <a href="/careers/apply?req=${encodeURIComponent(r.requisitionNumber)}"
                   class="apply-link mt-5 inline-flex items-center gap-2 font-display text-sm font-semibold">
                  Apply for this role
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10m0 0-4-4m4 4-4 4" stroke="currentColor" stroke-width="1.75" stroke-linecap="square"/>
                  </svg>
                </a>
              </li>`
              )
              .join('')}
          </ul>
        </section>`
      )
      .join('');
    if (status) status.textContent = `${list.length} open positions.`;
  }

  fetch('/api/openings')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d) => render(d.openings ?? []))
    .catch(() => {
      host!.dataset.state = 'error';
      host!.innerHTML = `
        <div class="card p-8">
          <h3 class="font-display text-xl">We could not load the live list.</h3>
          <p class="mt-3 leading-relaxed" style="color: var(--text-body)">
            That is on us, not you. Send an application and a recruiter will follow up with what is open.
          </p>
          <a href="/careers/apply" class="btn btn-primary mt-6">Submit an application</a>
        </div>`;
      if (status) status.textContent = 'Open positions could not be loaded.';
    });
