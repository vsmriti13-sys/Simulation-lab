/* Operation Island — small shared pieces of interface used by every mission. */
(function () {
  const PREF = 'operation-island-wide-map';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  let wide = false;
  try { wide = localStorage.getItem(PREF) === '1'; } catch (e) { /* no storage */ }

  OI.ui = {
    esc,
    pips: n => `<span class="pips" aria-label="${n} out of 3">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`,
    // map on the left (or full width), mission panel on the right (or below)
    workspace(panel) {
      return `<div class="workspace${wide ? ' wide' : ''}">
        <div class="map-col">
          <div class="map-frame"><canvas id="map" tabindex="0" aria-label="Map of the island. Use the arrow keys to move and Enter to choose a square."></canvas></div>
          <div class="map-bar"><p class="readout" id="readout" aria-live="polite"></p>
            <button type="button" class="btn small ghost" id="map-size" aria-pressed="${wide}">${wide ? 'Smaller map' : 'Bigger map'}</button></div>
        </div>
        <aside class="panel" id="panel">${panel}</aside>
      </div>`;
    },
    bindWorkspace(root) {
      const b = root.querySelector('#map-size');
      if (!b) return;
      b.addEventListener('click', () => {
        wide = !wide;
        try { localStorage.setItem(PREF, wide ? '1' : '0'); } catch (e) { /* no storage */ }
        root.querySelector('.workspace').classList.toggle('wide', wide);
        b.textContent = wide ? 'Smaller map' : 'Bigger map';
        b.setAttribute('aria-pressed', String(wide));
      });
    }
  };
})();
