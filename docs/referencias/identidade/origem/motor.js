/* =========================================================
   SUMI 墨 — motor de movimento · v1.0
   Framework-agnóstico. Funciona com React, Vue, Svelte ou HTML puro.
   Uso:  <script src="sumi.js"></script>  →  Sumi.init()
   Tudo é ativado por atributos data-*; nenhum componente precisa
   lembrar de animar. "Uma só física": curva Respiro, 550ms.
   ========================================================= */
(function (global) {
  'use strict';
  var EASE = 'cubic-bezier(.22,1,.36,1)';
  var EASE_OUT = 'cubic-bezier(.4,0,.6,1)';
  var reduce = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cssVar = function (n) { return getComputedStyle(document.body).getPropertyValue(n).trim(); };
  var raf = global.requestAnimationFrame.bind(global);

  /* ---------- 1. Indicador deslizante · [data-slide] > [data-ind] + filhos [data-on="true"] ---------- */
  function slideAll(root) {
    (root || document).querySelectorAll('[data-slide]').forEach(function (c) {
      var ind = c.querySelector(':scope > [data-ind]'); if (!ind) return;
      var on = c.querySelector('[data-on="true"]');
      if (!on) { ind.style.opacity = 0; return; }
      if (!on.offsetWidth) return; // seção dormindo (content-visibility)
      var line = ind.getAttribute('data-ind') === 'line';
      ind.style.width = on.offsetWidth + 'px';
      ind.style.height = (line ? 2 : on.offsetHeight) + 'px';
      ind.style.transform = 'translate(' + on.offsetLeft + 'px,' + (line ? on.offsetTop + on.offsetHeight - 2 : on.offsetTop) + 'px)';
      ind.style.opacity = 1;
      if (!c.hasAttribute('data-ready')) raf(function () { raf(function () { c.setAttribute('data-ready', '1'); }); });
    });
  }

  /* ---------- 2. Todo estado morfa · [data-morph] ---------- */
  var mc = new WeakMap();
  function snapMorph(el) { var c = el.cloneNode(true); c.querySelectorAll('[data-morph-ghost]').forEach(function (g) { g.remove(); }); mc.set(el, { h: el.getBoundingClientRect().height, html: c.innerHTML }); }
  function morph(box) {
    var prev = mc.get(box); if (!prev) { snapMorph(box); return; } if (box._morphing) return;
    var clone = box.cloneNode(true); clone.querySelectorAll('[data-morph-ghost]').forEach(function (g) { g.remove(); });
    if (clone.innerHTML === prev.html) return;
    if (Math.abs(prev.html.length - clone.innerHTML.length) < 6 && prev.html.split('<').length === clone.innerHTML.split('<').length) { snapMorph(box); return; }
    box._morphing = true;
    var cs = getComputedStyle(box); if (cs.position === 'static') box.style.position = 'relative';
    var nh = box.getBoundingClientRect().height;
    var kids = Array.prototype.filter.call(box.children, function (c) { return !c.hasAttribute('data-morph-ghost'); });
    var g = document.createElement('div');
    g.setAttribute('data-morph-ghost', '1'); g.setAttribute('data-instant', '1'); g.setAttribute('aria-hidden', 'true');
    g.innerHTML = prev.html;
    g.querySelectorAll('*').forEach(function (e) { e.style.animation = 'none'; e.removeAttribute('data-ai'); });
    g.style.cssText = 'position:absolute;left:' + cs.paddingLeft + ';right:' + cs.paddingRight + ';top:' + cs.paddingTop + ';display:' + cs.display + ';flex-direction:' + cs.flexDirection + ';align-items:' + cs.alignItems + ';gap:' + cs.gap + ';pointer-events:none;z-index:0';
    box.appendChild(g);
    if (!reduce && prev.h > 0 && Math.abs(prev.h - nh) > 1) { box.style.overflow = 'hidden'; box.animate([{ height: prev.h + 'px' }, { height: nh + 'px' }], { duration: 620, easing: EASE }).onfinish = function () { box.style.overflow = ''; }; }
    g.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(4px)', transform: 'translateY(-4px) scale(.99)' }], { duration: 380, easing: EASE_OUT, fill: 'forwards' });
    kids.forEach(function (k, i) { if (k.style && k.style.animation) k.style.animation = 'none'; k.animate && k.animate([{ opacity: 0, filter: 'blur(4px)', transform: 'translateY(6px) scale(.99)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 620, delay: 120 + i * 30, easing: EASE, fill: 'backwards' }); });
    setTimeout(function () { g.remove(); box._morphing = false; snapMorph(box); }, 760);
  }

  /* ---------- 3. Rótulo que muda, forma que escoa · todo <button> ---------- */
  var bw = new WeakMap();
  function morphButton(b) {
    var old = bw.get(b); var prevW = b._origW != null ? b._origW : (b._origW = b.style.width);
    b.style.width = prevW && prevW.slice(-1) === '%' ? prevW : '';
    var nw = b.getBoundingClientRect().width; bw.set(b, nw);
    if (!old || Math.abs(old - nw) < 1.5 || !b.offsetParent || (prevW && prevW.slice(-1) !== '%')) { b.style.width = prevW; return; }
    b.style.overflow = 'hidden'; b.style.width = old + 'px'; void b.offsetWidth;
    b.style.transition = 'width .55s ' + EASE; raf(function () { b.style.width = nw + 'px'; });
    clearTimeout(b._wt); b._wt = setTimeout(function () { b.style.width = prevW; b.style.overflow = ''; b.style.transition = ''; }, 600);
    var l = b.querySelector('[data-lbl]') || b.lastElementChild || b;
    l.animate && l.animate([{ opacity: 0, filter: 'blur(3px)', transform: 'translateY(2px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 460, easing: EASE });
  }

  /* ---------- 4. Marquee em rótulos truncados · [data-lbl] ---------- */
  function onOver(e) { var b = e.target.closest && e.target.closest('[data-press]'); if (!b) return; var l = b.querySelector('[data-lbl]'); if (!l) return; var d = l.scrollWidth - l.clientWidth; if (d > 1) { l.style.setProperty('--mq', '-' + (d + 8) + 'px'); l.style.setProperty('--mqd', Math.max(1.6, d / 35) + 's'); l.setAttribute('data-mq', '1'); } }
  function onOut(e) { var b = e.target.closest && e.target.closest('[data-press]'); if (!b || b.contains(e.relatedTarget)) return; var l = b.querySelector('[data-lbl]'); if (l) l.removeAttribute('data-mq'); }

  /* ---------- 5. Digitação: respiro do campo + letra que surge ---------- */
  var cv;
  function onType(e) {
    var t = e.target; if (!t || !(t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') || t.type === 'range' || t.type === 'file') return;
    if (t.type === 'password' || t.hasAttribute('data-was-pw')) { charcoal(t); return; }
    var box = null; for (var el = t; el && el !== document.body; el = el.parentElement) { if (el.hasAttribute('data-morph') || el.tagName === 'SECTION') break; if (parseFloat(getComputedStyle(el).borderTopLeftRadius) >= 18) { box = el; break; } }
    var now = performance.now();
    if (box && box.animate && !reduce && (!box._tb || now - box._tb > 140)) { box._tb = now; var ring = cssVar('--ring') || 'rgba(0,0,0,.12)'; box.animate([{ transform: 'scale(1)', outline: '0 solid transparent' }, { transform: 'scale(1.0015)', outline: '1px solid ' + ring, outlineOffset: '1px', offset: .3 }, { transform: 'scale(1)', outline: '1px solid transparent', outlineOffset: '2px' }], { duration: 480, easing: EASE }); }
    if (t.tagName === 'TEXTAREA' && !reduce) { (function(){if(!((e.inputType||'').startsWith('insert')&&e.data))return;try{const cs=getComputedStyle(t);const pos=t.selectionEnd??t.value.length;const mir=document.createElement('div');['fontFamily','fontSize','fontWeight','letterSpacing','lineHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','boxSizing','textTransform','wordSpacing','tabSize'].forEach(p=>mir.style[p]=cs[p]);mir.style.cssText+=';position:absolute;visibility:hidden;left:-9999px;top:0;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;border-style:solid;width:'+t.offsetWidth+'px';mir.textContent=t.value.slice(0,pos-e.data.length);const sp=document.createElement('span');sp.textContent=e.data;mir.appendChild(sp);document.body.appendChild(mir);const lx=sp.offsetLeft,ly=sp.offsetTop,cw=sp.offsetWidth,lh=sp.offsetHeight;mir.remove();const par=t.offsetParent||t.parentElement;const tr=t.getBoundingClientRect(),pr=par.getBoundingClientRect();const x=tr.left-pr.left+lx-t.scrollLeft,y=tr.top-pr.top+ly-t.scrollTop;let bg='transparent';for(let el=t;el&&el!==document.body;el=el.parentElement){const b=getComputedStyle(el).backgroundColor;if(b&&b!=='rgba(0, 0, 0, 0)'&&b!=='transparent'){bg=b;break;}}if(bg!=='transparent'&&y>=-4&&y<t.clientHeight){if(getComputedStyle(par).position==='static')par.style.position='relative';const m=document.createElement('span');m.setAttribute('data-morph-ghost','1');m.setAttribute('data-instant','1');m.style.cssText='position:absolute;pointer-events:none;z-index:2;left:'+(x-1)+'px;top:'+(y+lh*.12)+'px;width:'+(cw+3)+'px;height:'+(lh*.78)+'px;border-radius:3px;background:'+bg;par.appendChild(m);m.animate([{opacity:1,clipPath:'inset(0 0 0 0)'},{opacity:.85,clipPath:'inset(0 0 55% 0)',offset:.45},{opacity:0,transform:'translateY(-3px)',clipPath:'inset(0 0 100% 0)'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'}).onfinish=()=>m.remove();const w2=document.createElement('span');w2.setAttribute('data-morph-ghost','1');w2.setAttribute('data-instant','1');w2.style.cssText='position:absolute;pointer-events:none;z-index:2;left:'+x+'px;top:'+(y+lh*.88)+'px;width:'+Math.max(4,cw)+'px;height:1.5px;border-radius:2px;background:'+cs.color;par.appendChild(w2);w2.animate([{opacity:.55,transform:'translateX(0) scaleX(1)',filter:'blur(0px)'},{opacity:0,transform:'translateX(5px) scaleX(1.6)',filter:'blur(2px)'}],{duration:520,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'}).onfinish=()=>w2.remove();}}catch(_){}})(); return; }
    if (t.tagName !== 'INPUT' || !(e.inputType || '').startsWith('insert') || !e.data || reduce) return;
    try {
      var cs = getComputedStyle(t); cv = cv || document.createElement('canvas').getContext('2d'); cv.font = cs.font;
      var pos = t.selectionEnd == null ? t.value.length : t.selectionEnd;
      var w = cv.measureText(t.value.slice(0, pos)).width, cw = cv.measureText(e.data).width;
      var par = t.offsetParent || t.parentElement; var tr = t.getBoundingClientRect(), pr = par.getBoundingClientRect();
      var x = tr.left - pr.left + parseFloat(cs.paddingLeft) + w - cw - t.scrollLeft;
      var bg = 'transparent'; for (var p = t; p && p !== document.body; p = p.parentElement) { var b2 = getComputedStyle(p).backgroundColor; if (b2 && b2 !== 'rgba(0, 0, 0, 0)' && b2 !== 'transparent') { bg = b2; break; } }
      if (bg === 'transparent') return; if (getComputedStyle(par).position === 'static') par.style.position = 'relative';
      var m = document.createElement('span'); m.setAttribute('data-morph-ghost', '1'); m.setAttribute('data-instant', '1');
      m.style.cssText = 'position:absolute;pointer-events:none;z-index:2;left:' + (x - 1) + 'px;top:' + (tr.top - pr.top + tr.height * .18) + 'px;width:' + (cw + 3) + 'px;height:' + (tr.height * .64) + 'px;border-radius:3px;background:' + bg;
      par.appendChild(m); m.animate([{ opacity: 1, clipPath: 'inset(0 0 0 0)' }, { opacity: .85, clipPath: 'inset(0 0 55% 0)', offset: .45 }, { opacity: 0, transform: 'translateY(-3px)', clipPath: 'inset(0 0 100% 0)' }], { duration: 420, easing: EASE, fill: 'forwards' }).onfinish = function () { m.remove(); };
      var w2 = document.createElement('span'); w2.setAttribute('data-morph-ghost', '1'); w2.setAttribute('data-instant', '1');
      w2.style.cssText = 'position:absolute;pointer-events:none;z-index:2;left:' + x + 'px;top:' + (tr.top - pr.top + tr.height * .78) + 'px;width:' + Math.max(4, cw) + 'px;height:1.5px;border-radius:2px;background:' + cs.color;
      par.appendChild(w2); w2.animate([{ opacity: .55 }, { opacity: 0, transform: 'translateX(5px) scaleX(1.6)', filter: 'blur(2px)' }], { duration: 520, easing: EASE, fill: 'forwards' }).onfinish = function () { w2.remove(); };
    } catch (_) {}
  }

  /* ---------- 6. Senha a carvão · todo input[type=password] ---------- */
  function charcoal(t) {
    var par = t.parentElement; if (!par) return; t.setAttribute('data-was-pw', '1');
    var ov = par.querySelector(':scope > [data-pw-ov]');
    if (t.type !== 'password') { if (ov) { ov.style.display = 'none'; ov._len = -1; } return; }
    if (ov && ov._len === t.value.length && ov.style.display !== 'none') return;
    if (!ov) { ov = document.createElement('span'); ov.setAttribute('data-pw-ov', '1'); ov.setAttribute('data-morph-ghost', '1'); ov.setAttribute('data-instant', '1'); ov.setAttribute('aria-hidden', 'true'); if (getComputedStyle(par).position === 'static') par.style.position = 'relative'; par.appendChild(ov); }
    var cs = getComputedStyle(t); cv = cv || document.createElement('canvas').getContext('2d'); cv.font = cs.font;
    var bwid = cv.measureText('•').width + parseFloat(cs.letterSpacing || 0);
    ov.style.cssText = 'position:absolute;pointer-events:none;z-index:1;display:flex;align-items:center;overflow:hidden;left:' + (t.offsetLeft + parseFloat(cs.paddingLeft)) + 'px;top:' + t.offsetTop + 'px;height:' + t.offsetHeight + 'px;width:' + Math.max(0, t.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) + 'px';
    var ink = cssVar('--tx') || '#1d1b18', want = t.value.length; ov._len = want;
    var have = Array.prototype.filter.call(ov.children, function (x) { return !x._gone; });
    for (var k = have.length; k < want; k++) {
      var seed = (k * 9301 + 49297) % 233280 / 233280, w = 6.4 + seed * 2.2, h = w * (.82 + ((k * 37) % 10) / 40), r = Math.round((seed - .5) * 70);
      var b = document.createElement('span'); b._r = r;
      b.style.cssText = 'flex:none;display:block;width:' + w + 'px;height:' + h + 'px;margin-right:' + Math.max(1, bwid - w) + 'px;border-radius:52% 46% 55% 44% / 48% 56% 44% 52%;background:radial-gradient(ellipse at 42% 40%,' + ink + ' 0%,' + ink + ' 34%,color-mix(in oklab,' + ink + ' 55%,transparent) 56%,transparent 74%);box-shadow:' + (-2.5 - seed) + 'px ' + (1.5 + seed) + 'px 0 -2.3px color-mix(in oklab,' + ink + ' 45%,transparent),' + (2.6 + seed) + 'px -1.8px 0 -2.5px color-mix(in oklab,' + ink + ' 35%,transparent),.5px 3px 0 -2.6px color-mix(in oklab,' + ink + ' 30%,transparent);opacity:' + (.78 + seed * .2) + ';transform:rotate(' + r + 'deg)';
      ov.appendChild(b);
      b.animate && b.animate([{ transform: 'rotate(' + r + 'deg) scale(.15)', filter: 'blur(2.5px)', opacity: 0 }, { transform: 'rotate(' + r + 'deg) scale(1.18)', filter: 'blur(.6px)', opacity: 1, offset: .45 }, { transform: 'rotate(' + r + 'deg) scale(1)', filter: 'blur(.25px)' }], { duration: 420, easing: EASE });
    }
    for (var j = have.length - 1; j >= want; j--) { (function (b) { b._gone = true; b.animate([{ opacity: b.style.opacity }, { opacity: 0, filter: 'blur(3px)', transform: 'rotate(' + b._r + 'deg) scale(1.5) translateX(3px)' }], { duration: 320, easing: EASE, fill: 'forwards' }).onfinish = function () { b.remove(); }; })(have[j]); }
  }

  /* ---------- 7. Odômetro · <span data-odo="R$ 184.320"></span> ---------- */
  function odo(el) {
    var v = el.getAttribute('data-odo') || '0', prev = el._v == null ? v : el._v; if (el._v === v && el._built) return; el._v = v;
    el.setAttribute('aria-label', v);
    if (!el._built) { el._built = true; el.style.cssText += ';display:inline-flex;align-items:flex-start;white-space:nowrap;line-height:1;height:1em;font-variant-numeric:tabular-nums;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 16%,#000 84%,transparent 100%);mask-image:linear-gradient(180deg,transparent 0,#000 16%,#000 84%,transparent 100%);padding:.06em 0;box-sizing:content-box'; }
    var cols = el._cols || (el._cols = []), L = v.length;
    while (el.firstChild) el.removeChild(el.firstChild);
    var next = [];
    v.split('').forEach(function (ch, i) {
      var fe = L - 1 - i, isNum = /\d/.test(ch), pc = prev[prev.length - 1 - fe];
      var slot = document.createElement('span'); slot.setAttribute('aria-hidden', 'true'); slot.style.cssText = 'display:inline-block;height:1em;overflow:hidden;white-space:pre';
      if (!isNum) { slot.textContent = ch; el.appendChild(slot); next.push(null); return; }
      var tape = document.createElement('span'); tape.setAttribute('data-instant', '1'); tape.style.cssText = 'display:flex;flex-direction:column';
      for (var n = 0; n < 10; n++) { var d = document.createElement('span'); d.style.height = '1em'; d.textContent = n; tape.appendChild(d); }
      var from = /\d/.test(pc || '') ? +pc : +ch;
      tape.style.transform = 'translateY(' + (-from * 10) + '%)'; slot.appendChild(tape); el.appendChild(slot);
      if (from !== +ch) raf(function () { tape.style.transition = 'transform .9s ' + EASE + ' ' + (fe * 55) + 'ms'; tape.style.transform = 'translateY(' + (-(+ch) * 10) + '%)'; });
      next.push(tape);
    });
    el._cols = next;
  }

  /* ---------- 8. Camadas flutuantes · [data-pop] fecha ao clicar fora (com saída animada) ---------- */
  function closePop(p) { if (p._closing) return; p._closing = true; p.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-4px) scale(.985)', filter: 'blur(1px)' }], { duration: 240, easing: EASE_OUT, fill: 'forwards' }).onfinish = function () { p.dispatchEvent(new CustomEvent('sumi:close', { bubbles: true })); }; }
  function onDownOutside(e) { document.querySelectorAll('[data-pop]').forEach(function (p) { if (p.contains(e.target)) return; var trig = e.target.closest && e.target.closest('[data-pop-trigger]'); if (trig) return; closePop(p); }); }

  /* ---------- 9. Revelação ao rolar · [data-reveal] ---------- */
  var io = 'IntersectionObserver' in global ? new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.setAttribute('data-in', '1'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: .04 }) : null;

  /* ---------- Observadores ---------- */
  function isQuiet(n) { return n.nodeType === 1 && (n.hasAttribute('data-pop') || n.hasAttribute('data-morph-ghost') || n.hasAttribute('data-pw-ov')); }
  function onMutations(ms) {
    var boxes = new Set(), buttons = new Set(), slide = false;
    ms.forEach(function (m) {
      if (m.type === 'attributes') { if (m.attributeName === 'data-on') slide = true; if (m.attributeName === 'data-odo') odo(m.target); return; }
      var ch = Array.prototype.slice.call(m.addedNodes).concat(Array.prototype.slice.call(m.removedNodes)).filter(function (x) { return x.nodeType === 1; });
      if (ch.length && ch.every(isQuiet)) return;
      var tg = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!tg || !tg.closest) return;
      if (tg.closest('[data-pop]')) return;
      var box = tg.closest('[data-morph]'); if (box) boxes.add(box);
      var b = tg.closest('button'); if (b) buttons.add(b);
      m.addedNodes && m.addedNodes.forEach(function (n) { if (n.nodeType !== 1) return; scan(n); });
    });
    if (!reduce) { boxes.forEach(morph); buttons.forEach(morphButton); }
    if (slide) raf(function () { slideAll(); });
  }
  function scan(root) {
    (root.querySelectorAll ? root : document).querySelectorAll('[data-morph]').forEach(function (el) { if (!mc.has(el)) snapMorph(el); });
    (root.querySelectorAll ? root : document).querySelectorAll('button').forEach(function (b) { if (!bw.has(b)) raf(function () { bw.set(b, b.getBoundingClientRect().width); }); });
    (root.querySelectorAll ? root : document).querySelectorAll('[data-odo]').forEach(odo);
    (root.querySelectorAll ? root : document).querySelectorAll('[data-reveal]').forEach(function (el) { if (io && !el.hasAttribute('data-in')) io.observe(el); });
  }

  var started = false;
  var Sumi = {
    version: '1.0',
    init: function (opts) {
      if (started) return Sumi; started = true; opts = opts || {};
      if (opts.theme) Sumi.setTheme(opts.theme);
      scan(document); slideAll();
      new MutationObserver(onMutations).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-on', 'data-odo'] });
      document.addEventListener('pointerdown', function (e) { var b = e.target.closest && e.target.closest('button'); if (b) bw.set(b, b.getBoundingClientRect().width); onDownOutside(e); }, true);
      document.addEventListener('input', onType, true);
      document.addEventListener('mouseover', onOver); document.addEventListener('mouseout', onOut);
      document.addEventListener('contentvisibilityautostatechange', function (e) { if (!e.skipped) { e.target.querySelectorAll && e.target.querySelectorAll('[data-morph]').forEach(snapMorph); raf(function () { slideAll(); }); } }, true);
      global.addEventListener('resize', function () { slideAll(); });
      document.fonts && document.fonts.ready.then(function () { slideAll(); });
      setInterval(function () { document.querySelectorAll('input[type=password],input[data-was-pw]').forEach(charcoal); }, 350);
      return Sumi;
    },
    setTheme: function (t) { document.documentElement.setAttribute('data-sumi-theme', t === 'carvao' || t === 'dark' ? 'carvao' : 'papel'); },
    refresh: function () { slideAll(); scan(document); },
    closePop: closePop,
    /** Pouso "papel": anima um elemento de uma posição de origem (ex.: onde foi solto) até onde está agora */
    land: function (el, from) { if (!el || !el.animate) return; var r = el.getBoundingClientRect(), dx = from.x - r.left, dy = from.y - r.top, e3 = cssVar('--e3'), e2 = cssVar('--e2'), sh = cssVar('--sh1'); el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(1.6deg) scale(1.035)', boxShadow: e3 }, { transform: 'translate(' + dx * .35 + 'px,' + (dy * .35 - 6) + 'px) rotate(1deg) scale(1.025)', boxShadow: e3, offset: .3 }, { transform: 'translate(0,-3px) rotate(.35deg) scale(1.01)', boxShadow: e2, offset: .6 }, { transform: 'translate(0,1px) rotate(-.12deg) scale(.997)', boxShadow: sh, offset: .82 }, { transform: 'none', boxShadow: sh }], { duration: 1050, easing: 'cubic-bezier(.25,.8,.3,1)' }); },
    /** Expande um elemento a partir do retângulo de outro (cartão → painel) */
    expandFrom: function (panel, rect) { var r = panel.getBoundingClientRect(); panel.animate([{ transform: 'translate(' + (rect.left - r.left) + 'px,' + (rect.top - r.top) + 'px) scale(' + rect.width / r.width + ',' + rect.height / r.height + ')', opacity: .6 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: EASE, fill: 'both' }); },
    ease: { respiro: EASE, mare: 'cubic-bezier(.65,0,.35,1)', folha: 'cubic-bezier(.34,1.22,.64,1)', saida: EASE_OUT }
  };
  global.Sumi = Sumi;
  if (typeof module !== 'undefined' && module.exports) module.exports = Sumi;
})(typeof window !== 'undefined' ? window : this);
