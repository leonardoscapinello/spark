# Receitas Sumi: marcação pronta

Copie e troque só o conteúdo. Requer `sumi.css` + `sumi.js` (`Sumi.init()`).
Base de superfície (repetida abaixo como **FOLHA**): `background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:var(--r-xl); corner-shape:squircle;`

---

## Botões
```html
<!-- Carvão: 1 por área -->
<button data-press="ink" style="height:var(--h-md);padding:0 16px 0 14px;display:inline-flex;align-items:center;gap:6px;border:0;border-radius:var(--r-pill);background:var(--ac);color:var(--acf);box-shadow:var(--ink);font:500 13px/1 var(--font)">
  <svg width="16" height="16" …/><span data-lbl><span>Nova campanha</span></span>
</button>
<!-- Folha -->
<button data-press="sheet" style="height:var(--h-md);padding:0 16px;border:1px solid var(--bd);border-radius:var(--r-pill);background:var(--sf3) var(--grain);box-shadow:var(--sh1);color:var(--tx);font:500 13px/1 var(--font)"><span data-lbl><span>Exportar</span></span></button>
<!-- Tinta -->
<button data-press="ghost" style="height:var(--h-md);padding:0 16px;border:0;border-radius:var(--r-pill);background:transparent;color:var(--tx2);font:500 13px/1 var(--font)">Ver tudo</button>
<!-- Shu (destrutivo) -->
<button data-press="ink" style="…carvão…;background:var(--er);color:#fff">Excluir</button>
```
Carregando: troque o rótulo para "Salvando…" (a largura escoa sozinha) e use `aria-busy="true"`.

## Campo
```html
<label style="display:flex;flex-direction:column;gap:6px">
  <span style="font-size:12px;font-weight:500">E-mail</span>
  <div style="height:var(--h-field);padding:0 16px;display:flex;align-items:center;gap:8px;border-radius:var(--r-pill);background:var(--sf2);box-shadow:var(--deb)">
    <input type="email" style="flex:1;border:0;background:transparent;outline:none;color:var(--tx);font:400 13px/1 var(--font)">
  </div>
  <!-- erro: nunca some/aparece seco -->
  <div data-collapse data-open="false" style="--g:6px"><div><span style="font-size:11px;color:var(--er)">Inclua um domínio</span></div></div>
</label>
```
Erro no campo: `box-shadow: var(--deb), 0 0 0 1px var(--er)`. Foco: `0 0 0 3px var(--ring)`. Área de texto: mesmo estilo, `border-radius:24px; corner-shape:squircle`.
Senha: só use `type="password"`, e as marcas de carvão são automáticas.

## Dropdown / select
```html
<div style="position:relative;align-self:flex-start">
  <button data-pop-trigger onclick="toggle()" style="min-width:150px;height:40px;padding:0 12px 0 14px;display:flex;align-items:center;gap:8px;border:1px solid var(--bd);border-radius:var(--r-pill);background:var(--sf3) var(--grain);box-shadow:var(--sh1)">
    <span data-lbl><span>Mais recentes</span></span><svg …chevron…/>
  </button>
  <!-- render só quando aberto; feche no evento sumi:close -->
  <div data-pop style="position:absolute;top:calc(100% + 6px);left:0;min-width:max(100%,210px);padding:6px;display:flex;flex-direction:column;gap:2px;background:var(--glass);backdrop-filter:blur(24px) saturate(1.3);border:1px solid var(--gbd);box-shadow:var(--e2);border-radius:24px;corner-shape:squircle;animation:sumiPop .38s var(--ease)">
    <button style="min-height:36px;padding:0 12px;border:0;border-radius:var(--r-pill);background:transparent;text-align:left">Opção</button>
  </div>
</div>
```
Sem espaço embaixo: posicione com `bottom:calc(100% + 6px)` e use `sumiPopUp`. Separador: `<div style="height:1px;background:var(--bd);margin:4px 10px"></div>`.

## Abas / segmentado / paginação (indicador deslizante)
```html
<div data-slide style="display:flex;padding:4px;gap:2px;border-radius:var(--r-pill);background:var(--sf2);box-shadow:var(--deb)">
  <span data-ind style="background:var(--sf3);box-shadow:var(--sh1);border-radius:var(--r-pill)"></span>
  <button data-on="true"  style="height:32px;padding:0 16px;border:0;border-radius:var(--r-pill);background:transparent;color:var(--tx)">Dia</button>
  <button data-on="false" style="…;color:var(--tx3)">Semana</button>
</div>
```
Abas com sublinhado: `<span data-ind="line" style="background:var(--tx);border-radius:2px">`. Paginação: indicador `background:var(--ac);box-shadow:var(--ink)`. Para trocar, mude os atributos `data-on`, e o indicador desliza sozinho.

## Switch · checkbox · radio
```html
<!-- Switch 42×24 -->
<span style="position:relative;width:42px;height:24px;border-radius:999px;background:var(--tx)/*on*/ ;box-shadow:inset 0 1px 2px rgba(0,0,0,.35)">
  <span style="position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:999px;background:var(--sf3) var(--grain);box-shadow:0 0 0 .5px var(--bd2),0 2px 4px -1px rgba(0,0,0,.2);transform:translateX(18px)/*on; off=0*/;transition:transform .5s var(--ease-spring)"></span>
</span>
<!-- off: background var(--sf2); box-shadow var(--deb), inset 0 0 0 1px var(--bd) -->
<!-- Checkbox 20: squircle 7px; on = --tx + --ink; o ✓ é um path com stroke-dasharray:24 e dashoffset 24→0 -->
<!-- Radio em cartão: lista dentro de [data-slide] com <span data-ind> folha erguida (--e2, raio 28) -->
```

## Card / KPI
```html
<div style="FOLHA;padding:22px 24px;display:flex;flex-direction:column;gap:14px">
  <span style="font-size:12px;color:var(--tx2)">Receita</span>
  <span data-odo="R$ 184.320" style="font:300 32px/1 var(--font);letter-spacing:-.04em"></span>
  <span style="height:22px;padding:0 8px;border-radius:999px;background:var(--oks);color:var(--ok);font-size:11px;font-weight:500">+12,4%</span>
</div>
```
Para atualizar: `el.setAttribute('data-odo','R$ 185.010')`, e os dígitos rolam para cima ou para baixo.

## Bloco com estados (morfismo)
```html
<div data-morph style="FOLHA;padding:28px"> <!-- troque o conteúdo interno: idle → tentando → ok --> </div>
```

## Modal / drawer (num portal, fora de transforms)
```html
<div style="position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:24px">
  <div style="position:absolute;inset:0;background:var(--veil);animation:sumiFade .55s var(--ease)"></div>
  <!-- 4 camadas de desfoque progressivo -->
  <div style="position:absolute;inset:0;backdrop-filter:blur(2px);mask-image:radial-gradient(ellipse 70% 65% at 50% 50%,transparent 0%,#000 35%);animation:sumiBlurIn .7s var(--ease) both"></div>
  <div style="…blur(6px)…transparent 10%,#000 55%…"></div>
  <div style="…blur(14px)…transparent 25%,#000 75%…"></div>
  <div style="…blur(28px)…transparent 40%,#000 100%…"></div>
  <div role="dialog" aria-modal="true" style="position:relative;width:min(440px,100%);padding:28px;background:var(--sf3) var(--grain);border:1px solid var(--bd);box-shadow:var(--e3);border-radius:var(--r-xl);corner-shape:squircle;animation:sumiRise .62s var(--ease)">…</div>
</div>
```
Fechar: `sumiSink .28s var(--ease-out)` + `sumiBlurOut`, e só então remova. Drawer: painel `top/right/bottom:12px`, `sumiDrawerIn .45s` e máscara linear (270deg) nas camadas de desfoque.

## Toast
Pílula `background:var(--ac);color:var(--acf);box-shadow:var(--e3);height:54px`. Entra com `sumiToastIn .6s`, sai com `sumiToastOut .34s`. Na pilha, cada anterior fica `translateY(-9px·i) scale(1-.045·i)` e no hover expande para `translateY(-62px·i)`. Com promessa, o ícone faz crossfade (loader → check/alerta, escala .4 → 1) e a mensagem entra de baixo com blur.

## Sidebar
Folha erguida (`--e2`, raio 44, `position:sticky;top:16px;margin:16px`). Itens dentro de `[data-slide]` com indicador folha pousada. Compacta: 68px, só ícones, `data-tipwrap` + `data-tip`. No celular vira gaveta: o mesmo conteúdo, `sumiDrawerIn` a partir da esquerda.

## Arrastar e soltar (kanban)
O fantasma usa `data-instant`, `position:fixed` e é movido por `transform:translate3d()` em rAF, com inclinação de 1.6° e escala 1.035. O destino mostra um espaço tracejado com a altura do cartão. Ao soltar: `Sumi.land(el, {x,y})`. Clique sem arrastar: `Sumi.expandFrom(painel, rectDoCartao)`.
