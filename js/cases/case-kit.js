/* Operation Island — Case Files player.
 * A guided virtual-lab layout: a large interactive scene, a side panel with the case's stages
 * and a Handbook, a glossary of tappable words, coach tips, read-aloud and a score.
 * A case supplies: { id, number, title, stages, glossary, handbook, coach }.
 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const canSpeak = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';

  function mount(root, def) {
    const store = OI.store.get();
    store.cases = store.cases || {};
    const S = store.cases[def.id] = Object.assign({ stage: def.stages[0].id, done: {}, answers: {}, coachSeen: {}, data: {}, read: false }, store.cases[def.id] || {});
    const save = () => OI.store.save();
    let tab = 'case', coachList = [], coachIdx = 0, onRender = null;

    const stageIdx = id => def.stages.findIndex(s => s.id === id);
    const unlocked = id => { const i = stageIdx(id); return i === 0 || (!def.stages[i].locked && !!store.preview) || (!def.stages[i].locked && !!S.done[def.stages[i - 1].id]); };
    const maxScore = () => def.stages.reduce((a, s) => a + (s.points || 0), 0);
    const score = () => Object.values(S.answers).reduce((a, x) => a + (x.points || 0), 0);

    // ----- glossary -----
    const terms = Object.keys(def.glossary).sort((a, b) => b.length - a.length);
    function gloss(text) {
      // wrap the first appearance of each glossary term in a plain-text string
      let html = esc(text); const used = new Set();
      terms.forEach(t => {
        if (used.has(t)) return;
        const re = new RegExp(`(^|[^\\w>])(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[^\\w<]|$)`, 'i');
        if (re.test(html)) { html = html.replace(re, (m, pre, word) => `${pre}<button type="button" class="term" data-term="${esc(t)}">${word}</button>`); used.add(t); }
      });
      return html;
    }
    function showTerm(btn) {
      const t = btn.dataset.term, pop = root.querySelector('#term-pop');
      pop.innerHTML = `<strong>${esc(t.charAt(0).toUpperCase() + t.slice(1))}</strong><p>${esc(def.glossary[t])}</p><button type="button" class="btn small ghost" id="term-close">Close</button>`;
      pop.hidden = false;
      const r = btn.getBoundingClientRect(), host = root.querySelector('#case').getBoundingClientRect();
      pop.style.left = Math.max(0, Math.min(r.left - host.left, host.width - pop.offsetWidth)) + 'px';
      pop.style.top = (r.bottom - host.top + 8) + 'px';
      pop.querySelector('#term-close').addEventListener('click', () => { pop.hidden = true; });
      say(`${t}. ${def.glossary[t]}`, true);
      S.data.termsOpened = (S.data.termsOpened || 0) + 1; save();
    }

    // ----- read aloud -----
    function say(text, force) {
      if (!canSpeak || (!S.read && !force)) return;
      try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; window.speechSynthesis.speak(u); } catch (e) { /* speech unavailable */ }
    }
    function readCurrent() {
      const parts = [...root.querySelectorAll('#case-stage [data-read]')].map(el => el.textContent.trim()).filter(Boolean);
      if (parts.length) say(parts.join('. '));
    }

    // ----- coach tips -----
    function startCoach(list, force) {
      const key = S.stage;
      if (!list || !list.length || (S.coachSeen[key] && !force)) return;
      coachList = list; coachIdx = 0; showCoach();
    }
    function showCoach() {
      const bubble = root.querySelector('#coach');
      const step = coachList[coachIdx];
      if (!step) { bubble.hidden = true; S.coachSeen[S.stage] = true; save(); root.querySelectorAll('.coach-target').forEach(e => e.classList.remove('coach-target')); return; }
      const target = root.querySelector(step.sel);
      root.querySelectorAll('.coach-target').forEach(e => e.classList.remove('coach-target'));
      if (!target) { coachIdx++; return showCoach(); }
      target.classList.add('coach-target');
      bubble.innerHTML = `<p>${step.text}</p><div class="coach-actions"><span class="mono">${coachIdx + 1} / ${coachList.length}</span><button type="button" class="btn small ghost" id="coach-skip">Hide tips</button><button type="button" class="btn small primary" id="coach-next">${coachIdx + 1 < coachList.length ? 'Next' : 'Got it'}</button></div>`;
      bubble.hidden = false;
      const r = target.getBoundingClientRect(), host = root.querySelector('#case').getBoundingClientRect();
      const left = Math.max(0, Math.min(r.left - host.left, host.width - bubble.offsetWidth));
      const below = r.bottom - host.top + 12;
      bubble.style.left = left + 'px'; bubble.style.top = below + 'px';
      bubble.style.setProperty('--arrow', Math.max(16, Math.min(r.left - host.left - left + r.width / 2, bubble.offsetWidth - 30)) + 'px');
      if (r.bottom > window.innerHeight || r.top < 0) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      bubble.querySelector('#coach-next').addEventListener('click', () => { coachIdx++; showCoach(); });
      bubble.querySelector('#coach-skip').addEventListener('click', () => { coachIdx = coachList.length; showCoach(); });
      say(bubble.querySelector('p').textContent);
    }
    // a click on the highlighted target moves the tour on
    function coachClick(e) {
      if (!coachList[coachIdx]) return;
      const t = root.querySelector(coachList[coachIdx].sel);
      if (t && t.contains(e.target) && !e.target.closest('#coach')) setTimeout(() => { coachIdx++; showCoach(); }, 50);
    }

    // ----- questions -----
    // q: { id, text, options, correct (index or array), multi, explain }
    function question(q) {
      const a = S.answers[q.id] || {};
      const done = a.correct;
      return `<div class="cq ${done ? 'done' : ''}" data-q="${q.id}">
        <p class="cq-text" data-read>${gloss(q.text)}</p>
        <div class="cq-options">${q.options.map((o, i) => `<label class="${(a.choice || []).includes(i) ? 'on' : ''}"><input type="${q.multi ? 'checkbox' : 'radio'}" name="q-${q.id}" value="${i}" ${(a.choice || []).includes(i) ? 'checked' : ''} ${done ? 'disabled' : ''}> ${esc(o)}</label>`).join('')}</div>
        ${done ? `<p class="calc-fb ok">Correct${a.points ? ` (+${a.points})` : ''}. ${esc(q.explain || '')}</p>` : `<button type="button" class="btn small" data-check="${q.id}">Check answer</button><p class="calc-fb" id="fb-${q.id}" aria-live="polite"></p>`}
      </div>`;
    }
    function bindQuestions(qs, after) {
      qs.forEach(q => {
        const b = root.querySelector(`[data-check="${q.id}"]`);
        if (!b) return;
        b.addEventListener('click', () => {
          const choice = [...root.querySelectorAll(`input[name="q-${q.id}"]:checked`)].map(x => Number(x.value));
          const fb = root.querySelector('#fb-' + q.id);
          if (!choice.length) { fb.className = 'calc-fb no'; fb.textContent = 'Choose an answer first.'; return; }
          const want = [].concat(q.correct).sort().join(',');
          const ok = choice.slice().sort().join(',') === want;
          const a = S.answers[q.id] = S.answers[q.id] || { tries: 0 };
          a.tries += 1; a.choice = choice;
          if (ok) { a.correct = true; a.points = a.tries === 1 ? 2 : 1; save(); renderStage(); after && after(); }
          else { save(); fb.className = 'calc-fb no'; fb.textContent = q.hint || 'Not quite. Look at your evidence again.'; say(fb.textContent); }
        });
      });
    }
    const answered = ids => ids.every(id => S.answers[id] && S.answers[id].correct);

    // ----- layout -----
    function frame() {
      root.innerHTML = `<div class="case" id="case">
        <div class="case-top">
          <div><p class="eyebrow">Case File #${def.number} · Operation Island 2040</p><h1 class="display">${esc(def.title)}</h1></div>
          <div class="case-tools">
            <span class="case-score mono" id="case-score"></span>
            ${canSpeak ? `<button type="button" class="btn small ghost" id="read-btn" aria-pressed="${S.read}">${S.read ? 'Read aloud: on' : 'Read aloud: off'}</button>` : ''}
            <button type="button" class="btn small ghost" id="gloss-btn">Glossary</button>
            <button type="button" class="btn small ghost" id="tips-btn">Show tips</button>
            <button type="button" class="btn small ghost preview-btn" id="preview-btn" aria-pressed="${!!store.preview}">${store.preview ? 'Teacher preview: on' : 'Teacher preview: off'}</button>
          </div>
        </div>
        <p class="preview-banner" id="preview-banner" ${store.preview ? '' : 'hidden'}>Teacher preview is on: every stage is open and the questions are unlocked, so you can jump anywhere. Turn it off before learners use this device.</p>
        <div class="case-body">
          <section class="case-stage" id="case-stage" aria-live="polite"></section>
          <aside class="case-side">
            <div class="case-tabs" role="tablist"><button type="button" role="tab" id="tab-case" aria-selected="${tab === 'case'}">Case</button><button type="button" role="tab" id="tab-handbook" aria-selected="${tab === 'handbook'}">Handbook</button></div>
            <div class="case-tab" id="case-tab"></div>
          </aside>
        </div>
        <div class="gloss-panel" id="gloss-panel" hidden></div>
        <div class="term-pop" id="term-pop" hidden></div>
        <div class="coach" id="coach" hidden></div>
      </div>`;
      root.querySelector('#tab-case').addEventListener('click', () => { tab = 'case'; side(); });
      root.querySelector('#tab-handbook').addEventListener('click', () => { tab = 'handbook'; side(); });
      const rb = root.querySelector('#read-btn');
      if (rb) rb.addEventListener('click', () => { S.read = !S.read; save(); rb.textContent = S.read ? 'Read aloud: on' : 'Read aloud: off'; rb.setAttribute('aria-pressed', String(S.read)); if (S.read) readCurrent(); else try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } });
      root.querySelector('#gloss-btn').addEventListener('click', () => {
        const p = root.querySelector('#gloss-panel');
        p.hidden = !p.hidden;
        p.innerHTML = `<div class="gloss-head"><h2>Glossary</h2><button type="button" class="btn small ghost" id="gloss-close">Close</button></div><dl>${Object.keys(def.glossary).sort().map(t => `<div><dt>${esc(t.charAt(0).toUpperCase() + t.slice(1))}</dt><dd>${esc(def.glossary[t])}</dd></div>`).join('')}</dl>`;
        p.querySelector('#gloss-close').addEventListener('click', () => { p.hidden = true; });
      });
      root.querySelector('#preview-btn').addEventListener('click', () => {
        store.preview = !store.preview; save();
        const b = root.querySelector('#preview-btn'); b.textContent = store.preview ? 'Teacher preview: on' : 'Teacher preview: off'; b.setAttribute('aria-pressed', String(!!store.preview));
        root.querySelector('#preview-banner').hidden = !store.preview;
        if (!unlocked(S.stage)) S.stage = def.stages[0].id;
        renderStage();
      });
      root.querySelector('#tips-btn').addEventListener('click', () => { const st = def.stages[stageIdx(S.stage)]; startCoach(st.coach, true); });
      const caseEl = root.querySelector('#case');
      caseEl.addEventListener('click', e => { const t = e.target.closest('.term'); if (t) showTerm(t); });
      caseEl.addEventListener('click', coachClick, true);
    }
    function side() {
      root.querySelector('#tab-case').setAttribute('aria-selected', String(tab === 'case'));
      root.querySelector('#tab-handbook').setAttribute('aria-selected', String(tab === 'handbook'));
      const el = root.querySelector('#case-tab');
      if (tab === 'case') {
        el.innerHTML = `<ol class="stage-list">${def.stages.map((s, i) => {
          const open = unlocked(s.id), cur = s.id === S.stage, done = !!S.done[s.id];
          return `<li><button type="button" class="stage-btn ${cur ? 'cur' : ''} ${done ? 'done' : ''}" style="--sc:${s.color}" data-stage="${s.id}" ${open ? '' : 'disabled'}>
            <span class="stage-n mono">${done ? '✔' : i + 1}</span><span>${esc(s.title)}${s.locked ? '<small>Coming soon</small>' : !open ? '<small>Locked</small>' : ''}</span></button>
            ${cur && s.steps ? `<ul class="step-list">${s.steps.map(st => `<li class="${(S.data.stepDone || {})[st.id] ? 'done' : ''}">${esc(st.title)}</li>`).join('')}</ul>` : ''}</li>`;
        }).join('')}</ol>`;
        el.querySelectorAll('[data-stage]').forEach(b => b.addEventListener('click', () => go(b.dataset.stage)));
      } else {
        const page = S.data.hbPage || def.handbook[0].id;
        const p = def.handbook.find(h => h.id === page) || def.handbook[0];
        el.innerHTML = `<div class="hb-nav">${def.handbook.map(h => `<button type="button" class="hb-link ${h.id === p.id ? 'on' : ''}" data-hb="${h.id}">${esc(h.title)}</button>`).join('')}</div>
          <article class="hb-page"><h3>${esc(p.title)}</h3>${p.html}</article>`;
        el.querySelectorAll('[data-hb]').forEach(b => b.addEventListener('click', () => { S.data.hbPage = b.dataset.hb; save(); side(); }));
      }
      root.querySelector('#case-score').textContent = `Score ${score()} / ${maxScore()} · saved on this device`;
    }
    function go(id) {
      if (!unlocked(id)) return;
      S.stage = id; save();
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
      renderStage(true);
      root.querySelector('#case').scrollIntoView({ block: 'start' });
    }
    function renderStage(fresh) {
      const st = def.stages[stageIdx(S.stage)];
      root.querySelector('#coach').hidden = true;
      onRender = null;
      st.render(api, root.querySelector('#case-stage'));
      side();
      if (onRender) onRender();
      if (fresh) { readCurrent(); setTimeout(() => startCoach(st.coach), 250); }
    }
    const api = {
      S, save, gloss, esc, question, bindQuestions, answered, say, go,
      get preview() { return !!store.preview; },
      stepDone(id) { S.data.stepDone = S.data.stepDone || {}; if (!S.data.stepDone[id]) { S.data.stepDone[id] = true; save(); side(); } },
      // award points for a task other than a question: 2 on the first try, 1 after that
      award(id, firstTry) { if (S.answers[id] && S.answers[id].correct) return; S.answers[id] = { correct: true, points: firstTry ? 2 : 1 }; save(); side(); },
      tries(id) { S.data.tries = S.data.tries || {}; S.data.tries[id] = (S.data.tries[id] || 0) + 1; save(); return S.data.tries[id]; },
      complete(stageId) { if (!S.done[stageId]) { S.done[stageId] = true; save(); side(); } },
      next(stageId) { const i = stageIdx(stageId); const n = def.stages[i + 1]; return n && !n.locked ? n : null; },
      rerender() { renderStage(false); },
      after(fn) { onRender = fn; },
      refreshSide: side
    };
    frame();
    if (!unlocked(S.stage)) S.stage = def.stages[0].id;
    renderStage(true);
    return { unmount() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } } };
  }

  OI.caseKit = { mount };
})();
