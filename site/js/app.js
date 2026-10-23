/* 2º Turno em Jogo · lógica da página
   Reproduz o capítulo 11 do notebook regressao_linear.ipynb:
   reta de cada série em x = 100 + transferência da 3ª via,
   normalizada pela soma dos dois finalistas (só votos válidos). */
(() => {
  'use strict';

  const D = window.DADOS;
  const BLOCOS = ['cury', 'renan', 'caiado', 'zema', 'demais'];
  const IDX = Object.fromEntries(D.chaves.map((k, i) => [k, i + 1]));
  const SIGLA = { cury: 'AC', renan: 'RS', caiado: 'RC', zema: 'RZ', demais: '+' + D.demais.length };
  const CORTES = [30, 50, 75, 100];
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  // ---------- Formatação pt-BR ----------
  const formatos = {};
  const fmt = (v, d = 2) => {
    formatos[d] = formatos[d] || new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
    return formatos[d].format(Math.abs(v) < 1e-9 ? 0 : v);
  };
  const pct = (v, d = 2) => fmt(v, d) + '%';
  const sinal = (v, d = 2) => { const r = +v.toFixed(d); return (r > 0 ? '+' : r < 0 ? '−' : '') + fmt(Math.abs(r), d); };
  const votos = (n) => (n >= 1e6 ? fmt(n / 1e6, n >= 1e7 ? 1 : 2) + ' mi' : fmt(n / 1e3, 0) + ' mil');

  // ---------- Número animado ----------
  function tween(el, alvo, formato, dur = 520) {
    if (!el) return;
    const de = typeof el._v === 'number' ? el._v : alvo;
    el._v = alvo;
    cancelAnimationFrame(el._raf);
    if (reduzido.matches || de === alvo) { el.textContent = formato(alvo); return; }
    const t0 = performance.now();
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = formato(de + (alvo - de) * e);
      if (k < 1) el._raf = requestAnimationFrame(passo);
    };
    el._raf = requestAnimationFrame(passo);
  }

  // ---------- Regressão linear simples (mínimos quadrados) ----------
  const PONTOS = D.pontos.slice().sort((a, b) => a[0] - b[0]);
  const cacheRetas = {};
  function reta(chave, corte) {
    const id = chave + '@' + corte;
    if (cacheRetas[id]) return cacheRetas[id];
    const i = IDX[chave];
    const pts = PONTOS.filter((p) => p[0] <= corte + 1e-9);
    const n = pts.length;
    const xm = pts.reduce((s, p) => s + p[0], 0) / n;
    const ym = pts.reduce((s, p) => s + p[i], 0) / n;
    let sxy = 0, sxx = 0;
    for (const p of pts) { sxy += (p[0] - xm) * (p[i] - ym); sxx += (p[0] - xm) ** 2; }
    const b1 = sxy / sxx;
    const b0 = ym - b1 * xm;
    let sqr = 0, sqt = 0;
    for (const p of pts) { sqr += (p[i] - (b0 + b1 * p[0])) ** 2; sqt += (p[i] - ym) ** 2; }
    return (cacheRetas[id] = { b0, b1, r2: 1 - sqr / sqt, n, em: (x) => b0 + b1 * x });
  }

  // ---------- Estado ----------
  const transfPadrao = () => Object.fromEntries(BLOCOS.map((b) => [b, { lula: 50, fora: 0 }]));
  const estado = { corte: 100, base: 'reta', t: transfPadrao() };

  const PRESETS = {
    neutro: () => transfPadrao(),
    notebook: () => ({ ...transfPadrao(), caiado: { lula: 40, fora: 0 } }),
    flavio: () => Object.fromEntries(BLOCOS.map((b) => [b, { lula: 30, fora: 10 }])),
    lula: () => Object.fromEntries(BLOCOS.map((b) => [b, { lula: 70, fora: 10 }])),
    abstencao: () => Object.fromEntries(BLOCOS.map((b) => [b, { lula: 50, fora: 40 }])),
  };

  // Lê um cenário salvo na URL (?c=100&b=r&t=50-0,50-0,...)
  function lerUrl() {
    try {
      const q = new URLSearchParams(location.search);
      const c = Number(q.get('c'));
      if (CORTES.includes(c)) estado.corte = c;
      // Base "Resultado oficial" bloqueada até existir resultado oficial.
      const t = (q.get('t') || '').split(',');
      if (t.length === BLOCOS.length) {
        t.forEach((par, i) => {
          const [l, f] = par.split('-').map(Number);
          if (l >= 0 && l <= 100 && f >= 0 && f <= 100) estado.t[BLOCOS[i]] = { lula: Math.round(l), fora: Math.round(f) };
        });
      }
    } catch (e) { /* URL inválida: fica o padrão */ }
  }
  function consulta() {
    const t = BLOCOS.map((b) => estado.t[b].lula + '-' + estado.t[b].fora).join(',');
    return '?c=' + estado.corte + '&b=' + (estado.base === 'oficial' ? 'o' : 'r') + '&t=' + t;
  }
  let timerUrl;
  function salvarUrl() {
    clearTimeout(timerUrl);
    timerUrl = setTimeout(() => { try { history.replaceState(null, '', location.pathname + consulta() + location.hash); } catch (e) { /* file:// pode bloquear */ } }, 300);
  }

  // ---------- Modelo do 2º turno (capítulo 11.4) ----------
  function modelo() {
    const tam = {};
    for (const k of D.chaves) tam[k] = estado.base === 'oficial' ? D.final[k].pct : reta(k, estado.corte).em(100);
    const linhas = BLOCOS.map((b) => {
      const t = estado.t[b];
      const pF = (100 - t.fora) * (100 - t.lula) / 100;
      const pL = (100 - t.fora) * t.lula / 100;
      return { b, tam: tam[b], pF, pL, pO: t.fora, ptsF: tam[b] * pF / 100, ptsL: tam[b] * pL / 100, ptsO: tam[b] * t.fora / 100 };
    });
    const soma = (k) => linhas.reduce((s, r) => s + r[k], 0);
    const herdF = soma('ptsF'), herdL = soma('ptsL'), fora = soma('ptsO');
    const F2 = tam.flavio + herdF, L2 = tam.lula + herdL, tot = F2 + L2;
    return {
      tam, linhas, herdF, herdL, fora, F2, L2, tot,
      partF: tam.flavio, partL: tam.lula, tamBlocos: soma('tam'),
      pctF: 100 * F2 / tot, pctL: 100 * L2 / tot,
      emJogo: herdF + herdL, // eleitores da 3ª via que votam em alguém
    };
  }

  // =========================================================
  //  Simulador
  // =========================================================
  const blocosEl = $('#blocks');
  const refs = {};

  function montarBlocos() {
    const frag = document.createDocumentFragment();
    for (const b of BLOCOS) {
      const art = document.createElement('article');
      art.className = 'block reveal';
      art.dataset.b = b;
      const info = b === 'demais'
        ? `<button type="button" class="info" aria-label="Quem está em Demais" aria-expanded="false"><svg class="ico"><use href="#i-info"/></svg><span class="info__pop">${D.demais.join(', ')}</span></button>`
        : '';
      art.innerHTML = `
        <div class="block__head">
          <span class="block__badge">${SIGLA[b]}</span>
          <div class="block__title"><h3>${D.nomes[b]} ${info}</h3><p>${votos(D.final[b].votos)} de votos no 1º turno</p></div>
          <div class="block__size"><b class="num" data-tam></b><small>dos válidos</small></div>
        </div>
        <div class="slider">
          <div class="slider__top"><label for="s-${b}">Quem recebe os votos</label></div>
          <input type="range" class="r-split" id="s-${b}" min="0" max="100" step="1" data-split>
          <div class="slider__ends num"><span class="e-f" data-ef></span><span class="e-l" data-el></span></div>
        </div>
        <div class="slider">
          <div class="slider__top"><label for="o-${b}">Não votam em ninguém <span class="sr-only">(branco, nulo ou abstenção)</span></label><span class="e-o mono num" data-eo></span></div>
          <input type="range" class="r-fora" id="o-${b}" min="0" max="100" step="1" data-fora>
        </div>
        <div class="mini">
          <div class="stack" aria-hidden="true">
            <span class="stack__seg stack__seg--f" data-sf></span><span class="stack__seg stack__seg--l" data-sl></span><span class="stack__seg stack__seg--o" data-so></span>
          </div>
          <div class="mini__txt num"><span>Flávio <b data-pf></b></span><span>Lula <b data-pl></b></span><span>fora <b data-po></b></span></div>
        </div>`;
      frag.appendChild(art);
      const r = (s) => art.querySelector(s);
      refs[b] = {
        art, split: r('[data-split]'), fora: r('[data-fora]'), tam: r('[data-tam]'),
        ef: r('[data-ef]'), el: r('[data-el]'), eo: r('[data-eo]'),
        sf: r('[data-sf]'), sl: r('[data-sl]'), so: r('[data-so]'),
        pf: r('[data-pf]'), pl: r('[data-pl]'), po: r('[data-po]'),
      };
      refs[b].split.addEventListener('input', (e) => { estado.t[b].lula = +e.target.value; atualizar('slider'); });
      refs[b].fora.addEventListener('input', (e) => { estado.t[b].fora = +e.target.value; atualizar('slider'); });
    }
    blocosEl.appendChild(frag);

    // Popover "Demais" também abre com toque
    $$('.info', blocosEl).forEach((btn) => {
      btn.addEventListener('click', () => btn.setAttribute('aria-expanded', btn.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'));
      btn.addEventListener('blur', () => btn.setAttribute('aria-expanded', 'false'));
    });
  }

  const R = {
    pctF: $('#pctF'), pctL: $('#pctL'), votF: $('#votF'), votL: $('#votL'),
    candF: $('#candF'), candL: $('#candL'), tugF: $('#tugF'), verdict: $('#verdict'), anuncio: $('#anuncio'),
    kHerdF: $('#kHerdF'), kHerdL: $('#kHerdL'), kFora: $('#kFora'), baseBadge: $('#baseBadge'),
    viradaTxt: $('#viradaTxt'), sens: $('#sens'),
    dockF: $('#dockF'), dockL: $('#dockL'), dockBar: $('#dockBar'),
  };
  let vencedorAnterior = null;
  let timerAnuncio;

  function atualizarSimulador() {
    const m = modelo();

    for (const linha of m.linhas) {
      const r = refs[linha.b], t = estado.t[linha.b];
      if (+r.split.value !== t.lula) r.split.value = t.lula;
      if (+r.fora.value !== t.fora) r.fora.value = t.fora;
      r.fora.style.setProperty('--p', t.fora + '%');
      r.split.setAttribute('aria-valuetext', `Flávio ${100 - t.lula}%, Lula ${t.lula}%`);
      r.fora.setAttribute('aria-valuetext', `${t.fora}% não votam em ninguém`);
      r.ef.textContent = `◀ Flávio ${100 - t.lula}%`;
      r.el.textContent = `${t.lula}% Lula ▶`;
      r.eo.textContent = t.fora + '%';
      r.sf.style.setProperty('--w', linha.pF);
      r.sl.style.setProperty('--w', linha.pL);
      r.so.style.setProperty('--w', linha.pO);
      tween(r.tam, linha.tam, (v) => pct(v));
      r.pf.textContent = '+' + fmt(linha.ptsF);
      r.pl.textContent = '+' + fmt(linha.ptsL);
      r.po.textContent = fmt(linha.ptsO);
    }

    tween(R.pctF, m.pctF, (v) => pct(v));
    tween(R.pctL, m.pctL, (v) => pct(v));
    R.votF.textContent = '≈ ' + votos(m.F2 / 100 * D.validosFinal) + ' de votos';
    R.votL.textContent = '≈ ' + votos(m.L2 / 100 * D.validosFinal) + ' de votos';
    R.tugF.style.width = m.pctF + '%';
    tween(R.kHerdF, m.herdF, (v) => '+' + fmt(v) + ' p.p.');
    tween(R.kHerdL, m.herdL, (v) => '+' + fmt(v) + ' p.p.');
    tween(R.kFora, m.fora, (v) => fmt(v) + ' p.p.');
    R.baseBadge.textContent = estado.base === 'oficial' ? 'BASE: OFICIAL' : `RETAS ATÉ ${estado.corte}%`;

    const dif = m.pctF - m.pctL;
    const venc = Math.abs(dif) < 0.005 ? 'empate' : dif > 0 ? 'flavio' : 'lula';
    R.candF.classList.toggle('is-win', venc === 'flavio');
    R.candL.classList.toggle('is-win', venc === 'lula');
    const nome = venc === 'flavio' ? 'Flávio Bolsonaro' : 'Lula';
    R.verdict.innerHTML = venc === 'empate'
      ? '<svg class="ico"><use href="#i-target"/></svg> Empate exato: 50% para cada um.'
      : `<svg class="ico"><use href="#i-trophy"/></svg><span><b>${nome}</b> vence a simulação por <b class="num">${fmt(Math.abs(dif))} p.p.</b>${Math.abs(dif) < 1 ? ' Disputa apertada.' : ''}</span>`;
    if (vencedorAnterior && vencedorAnterior !== venc && !reduzido.matches) {
      R.verdict.classList.remove('pop'); void R.verdict.offsetWidth; R.verdict.classList.add('pop');
    }
    vencedorAnterior = venc;
    clearTimeout(timerAnuncio);
    timerAnuncio = setTimeout(() => {
      R.anuncio.textContent = `Flávio ${pct(m.pctF)}, Lula ${pct(m.pctL)}. ${venc === 'empate' ? 'Empate.' : nome + ' vence.'}`;
    }, 700);

    R.dockF.textContent = pct(m.pctF, 1);
    R.dockL.textContent = pct(m.pctL, 1);
    R.dockBar.style.width = m.pctF + '%';

    atualizarVirada(m);
    atualizarPassos(m);
    marcarPreset();
  }

  // ---------- Ponto de virada + sensibilidade ----------
  function atualizarVirada(m) {
    const pf = m.partF, pl = m.partL, M = m.emJogo;
    const base = pf + pl + M;
    const svg = R.sens;
    const W = 360, H = 150, ml = 38, mr = 12, mt = 12, mb = 30;
    const pw = W - ml - mr, ph = H - mt - mb;

    if (M < 1e-6) {
      R.viradaTxt.innerHTML = 'Todos os eleitores da 3ª via ficaram de fora. Sem votos em jogo, vence quem largou na frente.';
      svg.innerHTML = svg.querySelector('title').outerHTML;
      return;
    }
    const sEstrela = (pf - pl + M) / (2 * M); // fatia que o Lula precisa
    const sAgora = m.herdL / M;
    const L = (s) => 100 * (pl + M * s) / base;

    if (Math.abs(m.pctF - m.pctL) < 0.005) {
      R.viradaTxt.innerHTML = 'Empate exato: qualquer ponto percentual da 3ª via decide.';
    } else if (m.pctF > m.pctL) {
      R.viradaTxt.innerHTML = sEstrela > 1
        ? `Nem com <b>100%</b> da 3ª via o Lula alcança: a distância de <b class="num">${fmt(pf - pl)} pontos</b> é maior que os <b class="num">${fmt(M)}</b> em jogo.`
        : `Para virar, o <b>Lula</b> precisaria de <b class="num">${pct(sEstrela * 100, 1)}</b> dos eleitores da 3ª via que vão votar. No seu cenário, ele recebe <b class="num">${pct(sAgora * 100, 1)}</b>.`;
    } else {
      const precisa = 1 - sEstrela;
      R.viradaTxt.innerHTML = precisa > 1
        ? `Nem com <b>100%</b> da 3ª via o Flávio alcança: a distância de <b class="num">${fmt(pl - pf)} pontos</b> é maior que os <b class="num">${fmt(M)}</b> em jogo.`
        : `Para virar, o <b>Flávio</b> precisaria de <b class="num">${pct(precisa * 100, 1)}</b> dos eleitores da 3ª via que vão votar. No seu cenário, ele recebe <b class="num">${pct((1 - sAgora) * 100, 1)}</b>.`;
    }

    // Gráfico: % do Lula no 2º turno conforme a fatia da 3ª via que vai para ele
    const y0 = Math.floor(Math.min(L(0), 50) - 0.5), y1 = Math.ceil(Math.max(L(1), 50) + 0.5);
    const sx = (s) => ml + s * pw;
    const sy = (v) => mt + (y1 - v) / (y1 - y0) * ph;
    const y50 = sy(50);
    let h = svg.querySelector('title').outerHTML;
    h += `<rect x="${ml}" y="${mt}" width="${pw}" height="${Math.max(0, y50 - mt)}" fill="var(--lula)" opacity=".08"/>`;
    h += `<rect x="${ml}" y="${y50}" width="${pw}" height="${Math.max(0, mt + ph - y50)}" fill="var(--flavio)" opacity=".08"/>`;
    h += `<line class="s-50" x1="${ml}" x2="${ml + pw}" y1="${y50}" y2="${y50}"/>`;
    h += `<text x="${ml + pw - 4}" y="${Math.max(mt + 11, y50 - 6)}" text-anchor="end">Lula vence</text>`;
    h += `<text x="${ml + pw - 4}" y="${Math.min(mt + ph - 4, y50 + 14)}" text-anchor="end">Flávio vence</text>`;
    for (const v of [y0, 50, y1]) h += `<text x="${ml - 6}" y="${sy(v) + 3.5}" text-anchor="end">${fmt(v, 0)}%</text>`;
    h += `<line class="s-grid" x1="${ml}" x2="${ml + pw}" y1="${mt + ph}" y2="${mt + ph}"/>`;
    for (const s of [0, 0.5, 1]) h += `<text x="${sx(s)}" y="${mt + ph + 14}" text-anchor="${s === 0 ? 'start' : s === 1 ? 'end' : 'middle'}">${s * 100}%</text>`;
    h += `<text x="${ml + pw / 2}" y="${H - 2}" text-anchor="middle">fatia da 3ª via que vai para o Lula</text>`;
    h += `<line class="s-line" x1="${sx(0)}" y1="${sy(L(0))}" x2="${sx(1)}" y2="${sy(L(1))}"/>`;
    if (sEstrela >= 0 && sEstrela <= 1) {
      const fx = sx(sEstrela);
      h += `<rect class="s-flip" x="${fx - 5}" y="${y50 - 5}" width="10" height="10" transform="rotate(45 ${fx} ${y50})"/>`;
    }
    h += `<circle class="s-now" cx="${sx(sAgora)}" cy="${sy(L(sAgora))}" r="6"/>`;
    const lx = Math.min(Math.max(sx(sAgora), ml + 40), ml + pw - 40);
    h += `<text class="s-lbl" x="${lx}" y="${sy(L(sAgora)) + (L(sAgora) > 50 ? 18 : -10)}" text-anchor="middle">você: ${pct(sAgora * 100, 0)}</text>`;
    svg.innerHTML = h;
  }

  // ---------- Passo a passo ----------
  function atualizarPassos(m) {
    const origem = estado.base === 'oficial' ? 'resultado oficial do 1º turno' : `retas em 100% das urnas, treino até ${estado.corte}%`;
    $('#sPartida').innerHTML = `<b class="num">${fmt(m.partF)}</b> pontos (Flávio) e <b class="num">${fmt(m.partL)}</b> pontos (Lula), do ${origem}`;
    $('#stepsTable tbody').innerHTML = m.linhas.map((r) => `
      <tr><td>${D.nomes[r.b]}</td><td>${pct(r.tam)}</td>
      <td>${fmt(r.pF, 0)}%</td><td class="c-f">${fmt(r.ptsF)}</td>
      <td>${fmt(r.pL, 0)}%</td><td class="c-l">${fmt(r.ptsL)}</td>
      <td>${fmt(r.ptsO)}</td></tr>`).join('');
    $('#stepsTable tfoot').innerHTML = `<tr><td>Total</td><td>${pct(m.tamBlocos)}</td><td></td><td class="c-f">${fmt(m.herdF)}</td><td></td><td class="c-l">${fmt(m.herdL)}</td><td>${fmt(m.fora)}</td></tr>`;
    $('#sSoma').innerHTML = `Flávio: ${fmt(m.partF)} + ${fmt(m.herdF)} = <b class="num">${fmt(m.F2)}</b> · Lula: ${fmt(m.partL)} + ${fmt(m.herdL)} = <b class="num">${fmt(m.L2)}</b>`;
    $('#sNorm').innerHTML = `Válidos no 2º turno: ${fmt(m.F2)} + ${fmt(m.L2)} = ${fmt(m.tot)}. Flávio = ${fmt(m.F2)} ÷ ${fmt(m.tot)} = <b class="num">${pct(m.pctF)}</b>; Lula = ${fmt(m.L2)} ÷ ${fmt(m.tot)} = <b class="num">${pct(m.pctL)}</b>.`;
  }

  function marcarPreset() {
    for (const chip of $$('[data-preset]')) {
      const p = PRESETS[chip.dataset.preset]();
      const igual = BLOCOS.every((b) => p[b].lula === estado.t[b].lula && p[b].fora === estado.t[b].fora);
      chip.classList.toggle('is-on', igual);
      chip.setAttribute('aria-pressed', igual ? 'true' : 'false');
    }
  }

  // =========================================================
  //  Gráfico da apuração
  // =========================================================
  const NS = 'http://www.w3.org/2000/svg';
  // As medidas acompanham a largura real, para o texto não encolher no celular.
  const G = { mt: 30, mb: 46 };
  function medir() {
    const w = Math.max(320, Math.round(wrap.clientWidth || 820));
    const estreito = w < 600;
    Object.assign(G, { W: w, H: estreito ? 340 : Math.min(460, Math.round(w * 0.54)), ml: estreito ? 40 : 50, mr: estreito ? 104 : 120 });
    G.pw = G.W - G.ml - G.mr;
    G.ph = G.H - G.mt - G.mb;
    svg.setAttribute('viewBox', `0 0 ${G.W} ${G.H}`);
  }
  const svg = $('#chart');
  const tip = $('#tip');
  const wrap = $('#chartWrap');
  const C = {};
  let dominio = null;

  const novo = (tag, attrs = {}, pai = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    pai.appendChild(e);
    return e;
  };
  const sx = (x) => G.ml + (x / 100) * G.pw;
  const sy = (y) => G.mt + ((dominio[1] - y) / (dominio[1] - dominio[0])) * G.ph;

  function montarGrafico() {
    medir();
    $$(':scope > :not(title):not(desc)', svg).forEach((e) => e.remove());
    C.grid = novo('g', { class: 'grid' });
    C.zona = novo('rect', { class: 'train-zone', y: G.mt, height: G.ph });
    C.corte = novo('line', { class: 'cut-line', y1: G.mt - 8, y2: G.mt + G.ph });
    C.corteTxt = novo('text', { class: 'cut-label', y: G.mt - 12, 'text-anchor': 'middle' });
    C.fGhost = novo('path', { class: 'serie serie--f serie--ghost' });
    C.lGhost = novo('path', { class: 'serie serie--l serie--ghost' });
    C.f = novo('path', { class: 'serie serie--f draw' });
    C.l = novo('path', { class: 'serie serie--l draw' });
    C.rf = novo('path', { class: 'reta reta--f' });
    C.rl = novo('path', { class: 'reta reta--l' });
    C.realF = novo('circle', { class: 'mk-real', r: 5, fill: 'var(--flavio)' });
    C.realL = novo('circle', { class: 'mk-real', r: 5, fill: 'var(--lula)' });
    C.prevF = novo('circle', { class: 'mk-prev', r: 6.5, stroke: 'var(--flavio)' });
    C.prevL = novo('circle', { class: 'mk-prev', r: 6.5, stroke: 'var(--lula)' });
    C.lblF = novo('text', { class: 'end-label end-label--f end-halo' });
    C.lblL = novo('text', { class: 'end-label end-label--l end-halo' });
    novo('text', { class: 'ax-title', x: G.ml + G.pw / 2, y: G.H - 6, 'text-anchor': 'middle' }).textContent = '% de urnas apuradas';
    novo('text', { class: 'ax-title', x: 4, y: 14 }).textContent = '% dos votos válidos';
    C.hover = novo('g', { opacity: 0 });
    C.xhair = novo('line', { class: 'xhair', y1: G.mt, y2: G.mt + G.ph }, C.hover);
    C.hF = novo('circle', { class: 'hover-dot', r: 5.5, fill: 'var(--flavio)' }, C.hover);
    C.hL = novo('circle', { class: 'hover-dot', r: 5.5, fill: 'var(--lula)' }, C.hover);
    C.alvo = novo('rect', {
      x: G.ml, y: G.mt, width: G.pw, height: G.ph, fill: 'transparent', tabindex: 0, role: 'slider',
      'aria-label': 'Explorar os pontos da apuração (use as setas)', 'aria-valuemin': 0, 'aria-valuemax': 100, style: 'cursor:crosshair;outline:none',
    });
    ligarHover();
  }

  function dominioAlvo() {
    const rf = reta('flavio', estado.corte), rl = reta('lula', estado.corte);
    const xs = PONTOS[0][0];
    const vals = [rf.em(100), rl.em(100), rf.em(xs), rl.em(xs), D.final.flavio.pct, D.final.lula.pct];
    for (const p of PONTOS) vals.push(p[IDX.flavio], p[IDX.lula]);
    return [Math.floor(Math.min(...vals) - 0.6), Math.ceil(Math.max(...vals) + 0.6)];
  }

  function passoGrade(range) {
    for (const s of [0.5, 1, 2, 5, 10]) if (range / s <= 7) return s;
    return 10;
  }

  function caminho(i, filtro) {
    let d = '';
    for (const p of PONTOS) if (filtro(p[0])) d += (d ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[i]).toFixed(1);
    return d;
  }

  function desenhar() {
    const corte = estado.corte;
    // grade
    const passo = passoGrade(dominio[1] - dominio[0]);
    let g = '';
    for (let v = Math.ceil(dominio[0] / passo) * passo; v <= dominio[1] + 1e-9; v += passo) {
      const y = sy(v).toFixed(1);
      g += `<line x1="${G.ml}" x2="${G.ml + G.pw}" y1="${y}" y2="${y}"${Math.abs(v - 50) < 1e-9 ? ' class="g50"' : ''}/>`;
      g += `<text x="${G.ml - 8}" y="${+y + 4}" text-anchor="end">${fmt(v, passo < 1 ? 1 : 0)}%</text>`;
    }
    for (let x = 0; x <= 100; x += 20) g += `<text x="${sx(x)}" y="${G.mt + G.ph + 20}" text-anchor="middle">${x}%</text>`;
    g += `<line x1="${G.ml}" x2="${G.ml + G.pw}" y1="${G.mt + G.ph}" y2="${G.mt + G.ph}" style="stroke:var(--line-soft)"/>`;
    C.grid.innerHTML = g;

    // zona de treino
    const xc = sx(corte);
    C.zona.setAttribute('x', G.ml);
    C.zona.setAttribute('width', xc - G.ml);
    C.zona.style.opacity = corte < 100 ? '' : '0';
    for (const e of [C.corte, C.corteTxt]) e.style.display = corte < 100 ? '' : 'none';
    C.corte.setAttribute('x1', xc); C.corte.setAttribute('x2', xc);
    C.corteTxt.setAttribute('x', xc);
    C.corteTxt.textContent = `treino até ${corte}%`;

    // séries: parte usada no treino (cheia) e o resto (apagado)
    const ultimoTreino = PONTOS.filter((p) => p[0] <= corte).pop()[0];
    C.f.setAttribute('d', caminho(IDX.flavio, (x) => x <= corte));
    C.l.setAttribute('d', caminho(IDX.lula, (x) => x <= corte));
    C.fGhost.setAttribute('d', caminho(IDX.flavio, (x) => x >= ultimoTreino));
    C.lGhost.setAttribute('d', caminho(IDX.lula, (x) => x >= ultimoTreino));

    // retas
    const x0 = PONTOS[0][0];
    const rf = reta('flavio', corte), rl = reta('lula', corte);
    C.rf.setAttribute('d', `M${sx(x0)} ${sy(rf.em(x0))}L${sx(100)} ${sy(rf.em(100))}`);
    C.rl.setAttribute('d', `M${sx(x0)} ${sy(rl.em(x0))}L${sx(100)} ${sy(rl.em(100))}`);
    const pos = (e, x, y) => { e.setAttribute('cx', sx(x)); e.setAttribute('cy', sy(y)); };
    pos(C.realF, 100, D.final.flavio.pct);
    pos(C.realL, 100, D.final.lula.pct);
    pos(C.prevF, 100, rf.em(100));
    pos(C.prevL, 100, rl.em(100));

    // rótulos no fim, sem sobreposição
    let yF = sy(rf.em(100)), yL = sy(rl.em(100));
    const gap = 18;
    if (Math.abs(yF - yL) < gap) {
      const m = (yF + yL) / 2, s = yF <= yL ? -1 : 1;
      yF = m + s * gap / 2; yL = m - s * gap / 2;
    }
    const lx = sx(100) + 14;
    C.lblF.setAttribute('x', lx); C.lblF.setAttribute('y', yF + 4);
    C.lblL.setAttribute('x', lx); C.lblL.setAttribute('y', yL + 4);
    C.lblF.textContent = 'Flávio ' + pct(rf.em(100));
    C.lblL.textContent = 'Lula ' + pct(rl.em(100));
  }

  let larguraAnterior = 0, timerResize;
  addEventListener('resize', () => {
    clearTimeout(timerResize);
    timerResize = setTimeout(() => {
      if (Math.abs(wrap.clientWidth - larguraAnterior) < 8) return;
      larguraAnterior = wrap.clientWidth;
      encerrarEntrada(); montarGrafico(); desenhar();
    }, 150);
  });

  let rafDominio;
  function irParaDominio(alvo, animar) {
    cancelAnimationFrame(rafDominio);
    if (!dominio || !animar || reduzido.matches) { dominio = alvo; desenhar(); return; }
    const de = dominio.slice(), t0 = performance.now(), dur = 700;
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      dominio = [de[0] + (alvo[0] - de[0]) * e, de[1] + (alvo[1] - de[1]) * e];
      desenhar();
      if (k < 1) rafDominio = requestAnimationFrame(passo);
    };
    rafDominio = requestAnimationFrame(passo);
  }

  // Animação de "desenho" das linhas na primeira vez que o gráfico aparece
  function animarEntrada() {
    if (reduzido.matches) { $$('.draw', svg).forEach((p) => p.classList.remove('draw')); return; }
    $$('.draw', svg).forEach((p) => p.style.setProperty('--len', Math.ceil(p.getTotalLength())));
    requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('is-drawn')));
    setTimeout(encerrarEntrada, 2000);
  }
  function encerrarEntrada() { $$('.draw', svg).forEach((p) => p.classList.remove('draw')); }

  function atualizarEquacoes() {
    const corte = estado.corte;
    const cartoes = { flavio: $('#eqF'), lula: $('#eqL') };
    for (const k in cartoes) {
      const r = reta(k, corte), el = cartoes[k];
      const prev = r.em(100), real = D.final[k].pct, erro = prev - real;
      $('[data-eq]', el).textContent = `ŷ = ${fmt(r.b0, 4)} ${r.b1 < 0 ? '−' : '+'} ${fmt(Math.abs(r.b1), 6)} · x`;
      tween($('[data-r2]', el), r.r2, (v) => fmt(v, 3));
      tween($('[data-prev]', el), prev, (v) => pct(v));
      $('[data-real]', el).textContent = pct(real);
      const e = $('[data-erro]', el);
      tween(e, erro, (v) => sinal(v) + ' p.p.');
      e.className = 'num ' + (Math.abs(erro) < 1 ? 'erro--bom' : 'erro--ruim');
    }
    const rf = reta('flavio', corte), rl = reta('lula', corte);
    const eF = rf.em(100) - D.final.flavio.pct, eL = rl.em(100) - D.final.lula.pct;
    $('#chartNote').textContent = `Treino com ${rf.n} de ${PONTOS.length} pontos (até ${corte}% das urnas). A cada 1% de urnas apuradas, a reta do Flávio ${rf.b1 < 0 ? 'cai' : 'sobe'} ${fmt(Math.abs(rf.b1), 3)} p.p. e a do Lula ${rl.b1 < 0 ? 'cai' : 'sobe'} ${fmt(Math.abs(rl.b1), 3)} p.p.`;
    $('#insight').innerHTML = corte === 100
      ? `<b>Acerto fácil.</b> Com todos os dados, a reta erra menos de ${fmt(Math.max(Math.abs(eF), Math.abs(eL)), 1)} p.p. em 100%, mas ela já tinha visto quase toda a apuração. Experimente treinar até 30% ou 50%.`
      : `<b>Previsão no meio da noite.</b> Com as urnas até ${corte}%, a reta erra o Flávio em <b>${sinal(eF)} p.p.</b> e o Lula em <b>${sinal(eL)} p.p.</b> ${rf.b1 > 0 ? 'No começo o Flávio subia, e a reta não sabe que a tendência vai virar.' : 'A tendência já aparece, mas a extrapolação ainda erra.'}`;
  }

  // ---------- Hover / teclado no gráfico ----------
  function ligarHover() {
    let idx = PONTOS.length - 1;
    const mostrar = (i) => {
      idx = Math.max(0, Math.min(PONTOS.length - 1, i));
      const p = PONTOS[idx];
      const x = sx(p[0]), yf = sy(p[IDX.flavio]), yl = sy(p[IDX.lula]);
      C.xhair.setAttribute('x1', x); C.xhair.setAttribute('x2', x);
      C.hF.setAttribute('cx', x); C.hF.setAttribute('cy', yf);
      C.hL.setAttribute('cx', x); C.hL.setAttribute('cy', yl);
      C.hover.setAttribute('opacity', 1);
      const rf = reta('flavio', estado.corte), rl = reta('lula', estado.corte);
      tip.innerHTML = `
        <div class="tip__h">${pct(p[0])} das urnas</div>
        <div class="tip__r"><span><i style="background:var(--flavio)"></i>Flávio</span><b>${pct(p[IDX.flavio])}</b></div>
        <div class="tip__r"><span><i style="background:var(--lula)"></i>Lula</span><b>${pct(p[IDX.lula])}</b></div>
        <div class="tip__s">Retas: Flávio ${pct(rf.em(p[0]))} · Lula ${pct(rl.em(p[0]))}</div>
        ${p[0] > estado.corte ? '<div class="tip__s">Ponto fora do treino</div>' : ''}`;
      tip.hidden = false;
      const esc = wrap.clientWidth / G.W;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let left = x * esc + 16;
      if (left + tw > wrap.clientWidth) left = x * esc - tw - 16;
      const top = Math.max(0, Math.min(Math.min(yf, yl) * esc - th / 2, wrap.clientHeight - th));
      tip.style.left = Math.max(0, left) + 'px';
      tip.style.top = top + 'px';
      C.alvo.setAttribute('aria-valuenow', p[0]);
      C.alvo.setAttribute('aria-valuetext', `${pct(p[0])} das urnas: Flávio ${pct(p[IDX.flavio])}, Lula ${pct(p[IDX.lula])}`);
    };
    const esconder = () => { C.hover.setAttribute('opacity', 0); tip.hidden = true; };
    const maisProximo = (ev) => {
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
      const xv = ((loc.x - G.ml) / G.pw) * 100;
      let lo = 0, hi = PONTOS.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (PONTOS[mid][0] < xv) lo = mid; else hi = mid; }
      return Math.abs(PONTOS[lo][0] - xv) < Math.abs(PONTOS[hi][0] - xv) ? lo : hi;
    };
    C.alvo.addEventListener('pointermove', (ev) => mostrar(maisProximo(ev)));
    C.alvo.addEventListener('pointerdown', (ev) => mostrar(maisProximo(ev)));
    C.alvo.addEventListener('pointerleave', esconder);
    C.alvo.addEventListener('focus', () => mostrar(idx));
    C.alvo.addEventListener('blur', esconder);
    C.alvo.addEventListener('keydown', (ev) => {
      const passo = ev.shiftKey ? 10 : 1;
      const mapa = { ArrowRight: passo, ArrowUp: passo, ArrowLeft: -passo, ArrowDown: -passo, Home: -1e9, End: 1e9 };
      if (ev.key in mapa) { ev.preventDefault(); mostrar(idx + mapa[ev.key]); }
      if (ev.key === 'Escape') esconder();
    });
  }

  // =========================================================
  //  Controles compartilhados
  // =========================================================
  function marcarSegmentos() {
    $$('[data-corte]').forEach((b) => b.setAttribute('aria-checked', +b.dataset.corte === estado.corte ? 'true' : 'false'));
    $$('[data-base]').forEach((b) => b.setAttribute('aria-checked', b.dataset.base === estado.base ? 'true' : 'false'));
    $$('[data-corte-group]').forEach((g) => g.closest('.ctrl')?.style.setProperty('opacity', estado.base === 'oficial' ? '.45' : ''));
  }

  function atualizar(origem) {
    if (origem !== 'slider') {
      marcarSegmentos();
      atualizarEquacoes();
      irParaDominio(dominioAlvo(), origem === 'corte');
    }
    atualizarSimulador();
    salvarUrl();
  }

  function ligarControles() {
    $$('[data-corte]').forEach((b) => b.addEventListener('click', () => {
      if (+b.dataset.corte === estado.corte) return;
      encerrarEntrada();
      estado.corte = +b.dataset.corte;
      atualizar('corte');
    }));
    $$('[data-base]').forEach((b) => b.addEventListener('click', () => { estado.base = b.dataset.base; atualizar('base'); }));
    // setas nos grupos de rádio
    $$('[role="radiogroup"]').forEach((grupo) => grupo.addEventListener('keydown', (ev) => {
      const bts = $$('[role="radio"]:not([disabled])', grupo), i = bts.indexOf(document.activeElement);
      if (i < 0) return;
      const d = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      ev.preventDefault();
      const prox = bts[(i + d + bts.length) % bts.length];
      prox.focus(); prox.click();
    }));
    $$('[data-preset]').forEach((b) => b.addEventListener('click', () => { estado.t = PRESETS[b.dataset.preset](); atualizar('slider'); }));
    $('#btnReset').addEventListener('click', () => {
      estado.t = transfPadrao(); estado.base = 'reta'; estado.corte = 100;
      encerrarEntrada(); atualizar('corte');
    });
    $('#btnLink').addEventListener('click', async () => {
      const url = location.href.split(/[?#]/)[0] + consulta() + '#simulador';
      try { await navigator.clipboard.writeText(url); aviso('Link do cenário copiado'); }
      catch (e) { aviso('Não deu para copiar. O link está na barra de endereço.'); }
    });
  }

  let timerAviso;
  function aviso(txt) {
    const t = $('#toast');
    t.textContent = txt; t.classList.add('is-on');
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => t.classList.remove('is-on'), 2400);
  }

  // =========================================================
  //  Página: menu, progresso, revelação, scrollspy, dock
  // =========================================================
  function ligarPagina() {
    const menuBtn = $('#menuBtn'), menu = $('#menuMobile');
    const fechar = () => { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); };
    menuBtn.addEventListener('click', () => { menu.hidden = !menu.hidden; menuBtn.setAttribute('aria-expanded', String(!menu.hidden)); });
    $$('a', menu).forEach((a) => a.addEventListener('click', fechar));

    const barra = $('#progresso');
    let pendente = false;
    const progresso = () => {
      pendente = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      barra.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    };
    addEventListener('scroll', () => { if (!pendente) { pendente = true; requestAnimationFrame(progresso); } }, { passive: true });
    progresso();

    $('#fita').textContent = 'EM CONSTRUÇÃO · '.repeat(28);
    $('#fAtual').textContent = 'atualização final ' + new Date(D.atualizadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach((e) => e.classList.add('is-in'));
      contarHero(); animarEntrada();
      return;
    }
    const io = new IntersectionObserver((ents) => {
      for (const e of ents) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach((e) => io.observe(e));

    const ioUma = (el, fn, th = 0.35) => {
      const o = new IntersectionObserver((ents) => { if (ents[0].isIntersecting) { fn(); o.disconnect(); } }, { threshold: th });
      o.observe(el);
    };
    ioUma($('.score'), contarHero, 0.3);
    ioUma(svg, animarEntrada, 0.35);

    const links = $$('[data-spy]');
    const spy = new IntersectionObserver((ents) => {
      for (const e of ents) if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a.dataset.spy === e.target.id));
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => spy.observe(s));

    // Dock no celular: aparece no simulador quando o placar sai da tela
    const dock = $('#dock');
    let noSim = false, resVisivel = false;
    const dockAtualizar = () => dock.classList.toggle('is-on', noSim && !resVisivel);
    new IntersectionObserver((e) => { noSim = e[0].isIntersecting; dockAtualizar(); }, { rootMargin: '-20% 0px -20% 0px' }).observe($('#simulador'));
    new IntersectionObserver((e) => { resVisivel = e[0].isIntersecting; dockAtualizar(); }, { threshold: 0.25 }).observe($('#result'));
  }

  // Números do placar do 1º turno (vêm dos dados)
  function prepararHero() {
    const f = D.final, x = BLOCOS.reduce((s, b) => s + f[b].pct, 0);
    const vx = BLOCOS.reduce((s, b) => s + f[b].votos, 0);
    const nums = $$('.score [data-count]');
    const vals = [f.flavio.pct, f.lula.pct, f.flavio.pct - f.lula.pct, vx / 1e6, D.snapshots];
    nums.forEach((el, i) => { el.dataset.count = vals[i]; });
    const segs = $$('.stack--hero .stack__seg');
    segs[0].style.setProperty('--w', f.flavio.pct);
    segs[1].style.setProperty('--w', x);
    segs[2].style.setProperty('--w', f.lula.pct);
    $('.stack--hero').setAttribute('aria-label', `Flávio ${pct(f.flavio.pct)}, Lula ${pct(f.lula.pct)}, terceira via ${pct(x)} dos votos válidos`);
    $$('.score__legend b')[0].textContent = pct(x);
    $('.hl').textContent = pct(x, 1);
  }
  function contarHero() {
    $$('.score [data-count]').forEach((el) => {
      const alvo = +el.dataset.count, dec = el.dataset.dec !== undefined ? +el.dataset.dec : 2;
      const suf = el.dataset.suffix !== undefined ? el.dataset.suffix : '%';
      el._v = 0;
      tween(el, alvo, (v) => fmt(v, dec) + suf, 1300);
    });
  }

  // ---------- Início ----------
  lerUrl();
  prepararHero();
  montarBlocos();
  montarGrafico();
  ligarControles();
  marcarSegmentos();
  atualizarEquacoes();
  irParaDominio(dominioAlvo(), false);
  atualizarSimulador();
  ligarPagina();
})();
