/* Página de metodologia: menu, progresso, entrada ao rolar e tabela das retas. */
(() => {
  'use strict';
  const D = window.DADOS;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const fmt = (v, d = 2) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  const sinal = (v, d = 2) => { const r = +v.toFixed(d); return (r > 0 ? '+' : r < 0 ? '−' : '') + fmt(Math.abs(r), d); };

  const menuBtn = $('#menuBtn'), menu = $('#menuMobile');
  menuBtn.addEventListener('click', () => { menu.hidden = !menu.hidden; menuBtn.setAttribute('aria-expanded', String(!menu.hidden)); });

  const barra = $('#progresso');
  let pendente = false;
  const progresso = () => {
    pendente = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    barra.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  addEventListener('scroll', () => { if (!pendente) { pendente = true; requestAnimationFrame(progresso); } }, { passive: true });
  progresso();

  // Números vindos dos dados
  $('#mSnap').textContent = D.snapshots;
  $('#mPts').textContent = D.pontos.length;
  $('#fAtual').textContent = 'atualização final ' + new Date(D.atualizadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  $('#tabRetas tbody').innerHTML = D.chaves.map((k) => {
    const r = D.retas100[k], prev = r.beta0 + 100 * r.beta1, real = D.final[k].pct;
    const cor = k === 'flavio' ? ' class="c-f"' : k === 'lula' ? ' class="c-l"' : '';
    return `<tr><td${cor}>${D.nomes[k]}</td><td>${fmt(r.beta0, 4)}</td><td>${sinal(r.beta1, 6)}</td><td>${fmt(r.r2, 3)}</td>
      <td>${fmt(prev)}%</td><td>${fmt(real)}%</td><td>${sinal(prev - real)} p.p.</td></tr>`;
  }).join('');

  // Entrada ao rolar
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver((ents) => {
    for (const e of ents) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((e) => io.observe(e));
})();
