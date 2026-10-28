(function () {
  'use strict';

  var CASA = window.CASA;
  var FOTOS = window.FOTOS || {};
  var raiz = document.documentElement;

  var movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  var telaCompacta = window.matchMedia('(max-width: 1023px)');
  var modoSimples = movimentoReduzido.matches || telaCompacta.matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Horário (lido de js/config.js) ---------- */

  var DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  var DIAS_MINUSC = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  function hora(texto) {
    var p = texto.split(':');
    return p[1] === '00' ? p[0] + 'h' : p[0] + 'h' + p[1];
  }
  function minutos(texto) {
    var p = texto.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  // Hora atual em São Paulo, independente do fuso de quem visita.
  function agoraEmSaoPaulo() {
    try {
      var partes = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).formatToParts(new Date());
      var mapa = {};
      partes.forEach(function (p) { mapa[p.type] = p.value; });
      var dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(mapa.weekday);
      return { dia: dia, min: (parseInt(mapa.hour, 10) % 24) * 60 + parseInt(mapa.minute, 10) };
    } catch (e) {
      var d = new Date();
      return { dia: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
  }

  function situacao() {
    var h = CASA.horario;
    var agora = agoraEmSaoPaulo();
    var abre = minutos(h.abre), fecha = minutos(h.fecha);
    var funcionaHoje = h.dias.indexOf(agora.dia) !== -1;

    if (funcionaHoje && agora.min >= abre && agora.min < fecha) {
      return { aberto: true, curto: 'Aberto até ' + hora(h.fecha), longo: 'Aberto agora, até as ' + hora(h.fecha) + '.' };
    }
    if (funcionaHoje && agora.min < abre) {
      return { aberto: false, curto: 'Abre hoje às ' + hora(h.abre), longo: 'Fechado agora. Abre hoje às ' + hora(h.abre) + '.' };
    }
    for (var i = 1; i <= 7; i++) {
      var d = (agora.dia + i) % 7;
      if (h.dias.indexOf(d) !== -1) {
        var quando = i === 1 ? 'amanhã' : DIAS_MINUSC[d];
        return {
          aberto: false,
          curto: 'Fechado, abre ' + quando + ' às ' + hora(h.abre),
          longo: 'Fechado agora. Abre ' + quando + ' às ' + hora(h.abre) + '.',
        };
      }
    }
    return { aberto: false, curto: 'Fechado', longo: 'Fechado.' };
  }

  function atualizarStatus() {
    var s = situacao();
    $$('[data-status]').forEach(function (el) {
      el.classList.toggle('aberto', s.aberto);
      var texto = $('[data-status-texto]', el);
      if (texto) texto.textContent = el.classList.contains('status--grande') ? s.longo : s.curto;
    });
  }

  function montarHorario() {
    var h = CASA.horario;
    var corpo = $('[data-horario-tabela]');
    var hoje = agoraEmSaoPaulo().dia;
    if (corpo) {
      var ordem = [1, 2, 3, 4, 5, 6, 0];
      corpo.innerHTML = '';
      ordem.forEach(function (d) {
        var tr = document.createElement('tr');
        var abre = h.dias.indexOf(d) !== -1;
        if (!abre) tr.className = 'fechado';
        if (d === hoje) tr.classList.add('hoje');
        var th = document.createElement('th');
        th.scope = 'row';
        th.textContent = DIAS[d];
        var td = document.createElement('td');
        td.textContent = abre ? hora(h.abre) + ' às ' + hora(h.fecha) : 'Fechado';
        tr.appendChild(th);
        tr.appendChild(td);
        corpo.appendChild(tr);
      });
    }
    $$('[data-horario-resumo]').forEach(function (el) { el.textContent = h.resumo; });
    atualizarStatus();
    setInterval(atualizarStatus, 60000);
  }

  /* ---------- Preços (lidos de js/config.js) ---------- */

  function montarPrecos() {
    var moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    $$('[data-preco]').forEach(function (el) {
      var valor = CASA.precos[el.getAttribute('data-preco')];
      if (typeof valor === 'number') {
        el.textContent = moeda.format(valor);
        el.classList.remove('preco--consulte');
      } else {
        el.textContent = 'consulte';
        el.classList.add('preco--consulte');
      }
    });
  }

  /* ---------- Fotos (lidas de js/fotos.js) ---------- */

  function montarFotos() {
    var creditos = [];
    $$('[data-foto]').forEach(function (fig) {
      var f = FOTOS[fig.getAttribute('data-foto')];
      if (!f) return;
      var img = new Image();
      img.src = f.src;
      img.alt = f.alt || '';
      img.loading = fig.hasAttribute('data-prioridade') ? 'eager' : 'lazy';
      img.decoding = 'async';
      if (f.largura) { img.width = f.largura; img.height = f.altura; }
      if (f.foco) img.style.objectPosition = f.foco;
      var vazio = $('.foto-vazia', fig);
      if (vazio) vazio.remove();
      fig.insertBefore(img, fig.firstChild);
      if (fig.closest('.galeria')) {
        fig.setAttribute('data-ampliar', '');
        fig.setAttribute('tabindex', '0');
        fig.setAttribute('role', 'button');
        fig.setAttribute('aria-label', 'Ampliar foto: ' + (f.alt || ''));
      }
      if (f.legenda) {
        var legenda = document.createElement('figcaption');
        legenda.textContent = f.legenda;
        fig.appendChild(legenda);
      }
      if (f.credito && creditos.indexOf(f.credito) === -1) creditos.push(f.credito);
    });
    var lista = $('[data-creditos]');
    if (lista && creditos.length) {
      lista.innerHTML = '';
      creditos.forEach(function (c) {
        var li = document.createElement('li');
        li.textContent = c;
        lista.appendChild(li);
      });
    }
  }

  function montarAmpliar() {
    var dialogo = $('.ampliar');
    if (!dialogo || typeof dialogo.showModal !== 'function') return;
    var img = $('img', dialogo);
    var legenda = $('.ampliar__legenda', dialogo);
    var origem = null;

    function abrir(fig) {
      var f = FOTOS[fig.getAttribute('data-foto')];
      if (!f) return;
      origem = fig;
      img.src = f.src;
      img.alt = f.alt || '';
      legenda.textContent = f.credito ? 'Foto: ' + f.credito : '';
      dialogo.showModal();
    }
    $$('[data-ampliar]').forEach(function (fig) {
      fig.addEventListener('click', function () { abrir(fig); });
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(fig); }
      });
    });
    $('.ampliar__fechar', dialogo).addEventListener('click', function () { dialogo.close(); });
    dialogo.addEventListener('click', function (e) { if (e.target === dialogo) dialogo.close(); });
    dialogo.addEventListener('close', function () { if (origem) origem.focus(); });
  }

  /* ---------- Menu e navegação ---------- */

  function montarMenu() {
    var botao = $('.barra__menu');
    var nav = $('#menu');
    function fechar() {
      nav.classList.remove('aberto');
      botao.setAttribute('aria-expanded', 'false');
      $('.sr', botao).textContent = 'Abrir menu';
    }
    botao.addEventListener('click', function () {
      var abrir = botao.getAttribute('aria-expanded') !== 'true';
      nav.classList.toggle('aberto', abrir);
      botao.setAttribute('aria-expanded', String(abrir));
      $('.sr', botao).textContent = abrir ? 'Fechar menu' : 'Abrir menu';
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', fechar); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('aberto')) { fechar(); botao.focus(); }
    });

    // Marca no menu a seção em que a pessoa está
    var links = {};
    $$('a', nav).forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    if (!('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(links).forEach(function (id) { links[id].removeAttribute('aria-current'); });
        var id = en.target.id === 'expressao' ? 'pizza' : en.target.id;
        if (links[id]) links[id].setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section').forEach(function (s) { obs.observe(s); });
  }

  /* ---------- Mapa, só quando pedido ---------- */

  function montarMapa() {
    var mapa = $('[data-mapa]');
    if (!mapa) return;
    $('.mapa__botao', mapa).addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = CASA.mapaEmbed;
      iframe.title = 'Mapa: Castelões, Rua Jairo Góis, 126, Brás, São Paulo';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.setAttribute('allowfullscreen', '');
      $('.mapa__capa', mapa).remove();
      mapa.appendChild(iframe);
    });
  }

  /* ---------- Abertura: arco de tijolos da boca do forno ---------- */

  function montarArco() {
    var alvo = $('.abertura__boca');
    if (!alvo) return;
    var cx = 500, mola = 470, r = 330, t = 74;
    var semente = 1924;
    function rand() { semente = (semente * 16807) % 2147483647; return semente / 2147483647; }
    function pt(raio, ang) { return (cx + Math.cos(ang) * raio).toFixed(1) + ' ' + (mola - Math.sin(ang) * raio).toFixed(1); }
    var tijolos = [];
    // Aduelas do arco
    var n = 21, folga = 0.012;
    for (var i = 0; i < n; i++) {
      var a0 = Math.PI - (i / n) * Math.PI - folga;
      var a1 = Math.PI - ((i + 1) / n) * Math.PI + folga;
      tijolos.push('M' + pt(r, a0) + 'L' + pt(r + t, a0) + 'L' + pt(r + t, a1) + 'L' + pt(r, a1) + 'Z');
    }
    // Ombreiras: fiadas de tijolo dos dois lados
    var altura = 38;
    for (var y = mola, f = 0; y < 900; y += altura, f++) {
      [cx - r - t, cx + r].forEach(function (x0) {
        if (f % 2) {
          tijolos.push('M' + (x0 + 2) + ' ' + (y + 2) + 'h' + (t / 2 - 3) + 'v' + (altura - 4) + 'h' + (3 - t / 2) + 'Z');
          tijolos.push('M' + (x0 + t / 2 + 1) + ' ' + (y + 2) + 'h' + (t / 2 - 3) + 'v' + (altura - 4) + 'h' + (3 - t / 2) + 'Z');
        } else {
          tijolos.push('M' + (x0 + 2) + ' ' + (y + 2) + 'h' + (t - 4) + 'v' + (altura - 4) + 'h' + (4 - t) + 'Z');
        }
      });
    }
    var base = tijolos.map(function (d) {
      return '<path d="' + d + '" fill="hsl(14 42% ' + (14 + Math.round(rand() * 10)) + '%)"/>';
    }).join('');
    var acesos = tijolos.map(function (d) { return '<path d="' + d + '"/>'; }).join('');
    var abertura = 'M' + (cx - r) + ' 900V' + mola + 'A' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + mola + 'V900Z';
    alvo.innerHTML =
      '<svg viewBox="0 0 1000 900" preserveAspectRatio="xMidYMax meet">' +
      '<defs>' +
      '<radialGradient id="arcoFogo" cx="500" cy="900" r="520" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" stop-color="#ffd9a0"/><stop offset=".22" stop-color="#ff9a45"/>' +
      '<stop offset=".55" stop-color="#b8461a" stop-opacity=".55"/><stop offset="1" stop-color="#2a0f06" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="arcoLuz" cx="500" cy="900" r="640" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" stop-color="#ffb469" stop-opacity=".9"/><stop offset=".5" stop-color="#f07a2a" stop-opacity=".4"/>' +
      '<stop offset="1" stop-color="#f07a2a" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<rect x="' + (cx - r - t - 6) + '" y="0" width="' + (2 * (r + t) + 12) + '" height="900" fill="none"/>' +
      '<path d="' + abertura + '" fill="#080402"/>' +
      '<g class="arco__fogo"><path class="arco__chama" d="' + abertura + '" fill="url(#arcoFogo)"/></g>' +
      '<g>' + base + '</g>' +
      '<g class="arco__aceso" fill="url(#arcoLuz)" style="mix-blend-mode:screen">' + acesos + '</g>' +
      '</svg>';
  }

  /* ---------- Abertura: brasas subindo ---------- */

  function brasas(canvas) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w, h, particulas = [], ativo = true, quadro;
    var total = telaCompacta.matches ? 18 : 46;

    function medir() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function nova(inicio) {
      return {
        x: w * (0.5 + (Math.random() - 0.5) * 0.5),
        y: inicio ? h * (0.4 + Math.random() * 0.6) : h + 10,
        vy: 0.35 + Math.random() * 0.9,
        vx: (Math.random() - 0.5) * 0.3,
        r: 0.6 + Math.random() * 1.8,
        vida: 0,
        max: 280 + Math.random() * 380,
        fase: Math.random() * 6.28,
      };
    }
    medir();
    for (var i = 0; i < total; i++) particulas.push(nova(true));

    function passo() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < particulas.length; i++) {
        var p = particulas[i];
        p.vida++;
        p.y -= p.vy;
        p.x += p.vx + Math.sin(p.vida * 0.02 + p.fase) * 0.35;
        var t = p.vida / p.max;
        if (t >= 1 || p.y < -10) { particulas[i] = nova(false); continue; }
        var a = Math.sin(Math.PI * t) * 0.9;
        ctx.fillStyle = 'rgba(255,' + Math.round(150 + 60 * (1 - t)) + ',70,' + a + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 - t * 0.5), 0, 6.283);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (ativo) quadro = requestAnimationFrame(passo);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        ativo = en[0].isIntersecting;
        cancelAnimationFrame(quadro);
        if (ativo) quadro = requestAnimationFrame(passo);
      }).observe(canvas);
    } else {
      quadro = requestAnimationFrame(passo);
    }
    window.addEventListener('resize', medir);
  }

  /* ---------- Cenas com GSAP ---------- */

  function cenas() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    var abertura = $('.abertura');
    var pizzaSecao = $('.pizza');

    if (!gsap || !ST || movimentoReduzido.matches) {
      abertura.style.setProperty('--calor', 1);
      $('.linha').style.setProperty('--progresso', 1);
      $$('.linha__item').forEach(function (li) { li.classList.add('aceso'); });
      montarPizzaSimples(pizzaSecao);
      return;
    }

    gsap.registerPlugin(ST);

    // 1. A brasa acende sozinha um pouco ao abrir e termina de acender com o scroll
    var calor = { ignicao: 0, rolagem: 0 };
    function aplicarCalor() {
      abertura.style.setProperty('--calor', Math.min(1, calor.ignicao * (modoSimples ? 0.7 : 0.5) + calor.rolagem * (modoSimples ? 0.3 : 0.5)).toFixed(3));
    }
    gsap.to(calor, { ignicao: 1, duration: 1.8, ease: 'power2.out', delay: 0.15, onUpdate: aplicarCalor });
    gsap.to(calor, {
      rolagem: 1,
      ease: 'none',
      onUpdate: aplicarCalor,
      scrollTrigger: modoSimples
        ? { trigger: abertura, start: 'top top', end: '60% top', scrub: true }
        : { trigger: abertura, start: 'top top', end: '+=70%', scrub: 0.5, pin: '.abertura__palco' },
    });
    if (!modoSimples) {
      gsap.to('.abertura__titulo', {
        yPercent: -8,
        ease: 'none',
        scrollTrigger: { trigger: abertura, start: 'top top', end: '+=70%', scrub: 0.5 },
      });
    }
    brasas($('.abertura__brasas'));

    // 2. Linha do tempo acende conforme avança
    var linha = $('.linha');
    gsap.to(linha, {
      '--progresso': 1,
      ease: 'none',
      scrollTrigger: { trigger: linha, start: 'top 72%', end: 'bottom 72%', scrub: 0.4 },
    });
    $$('.linha__item').forEach(function (li) {
      ST.create({ trigger: li, start: 'top 72%', end: 'max', onToggle: function (st) { li.classList.toggle('aceso', st.isActive); } });
    });

    // 3. Pizza
    if (modoSimples) montarPizzaSimples(pizzaSecao);
    else montarPizzaScroll(pizzaSecao, gsap);

    // 4. "Acabar em pizza": as linhas se preenchem como tinta
    $$('.expressao__linha').forEach(function (linhaFrase, i) {
      linhaFrase.style.setProperty('--preenche', 0);
      gsap.to(linhaFrase, {
        '--preenche': 1,
        ease: 'none',
        scrollTrigger: { trigger: linhaFrase, start: 'top ' + (88 - i * 6) + '%', end: 'top ' + (48 - i * 6) + '%', scrub: 0.3 },
      });
    });

    // 6. Salão: leve paralaxe nas fotos menores
    if (!modoSimples) {
      [['.galeria__b', -10], ['.galeria__c', 8]].forEach(function (par) {
        gsap.fromTo(par[0], { yPercent: -par[1] / 2 }, {
          yPercent: par[1] / 2,
          ease: 'none',
          scrollTrigger: { trigger: '.galeria', start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
    }

    // As fontes mudam a altura dos textos: recalcula as cenas fixadas quando chegarem
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
    window.addEventListener('load', function () { ST.refresh(); });
  }

  function montarPizzaScroll(secao, gsap) {
    var canvas = $('.pizza__canvas', secao);
    var pizza = window.PizzaCasteloes.criar(canvas);
    var passos = $$('.passo', secao);
    var estado = { p: 0 };
    var tremendo = false, quadro;
    var forno = window.PizzaCasteloes.ETAPAS.forno;

    pizza.preparar();
    pizza.desenhar(0, 0);

    function intensidadeForno(p) {
      var t = Math.max(0, Math.min(1, (p - forno[0]) / (forno[1] - forno[0])));
      return Math.sin(Math.PI * Math.min(1, t * 1.15));
    }

    function render() {
      var p = estado.p;
      pizza.desenhar(p, performance.now() / 1000);
      var ativo = window.PizzaCasteloes.etapaAtiva(p);
      passos.forEach(function (el, i) { el.classList.toggle('ativo', i === ativo); });
      secao.style.setProperty('--assar', intensidadeForno(p).toFixed(3));
      secao.style.setProperty('--progresso', p.toFixed(4));
      $('.pizza__barra span', secao).style.setProperty('--progresso', p.toFixed(4));

      // A brasa só tremula enquanto a pizza está no forno
      var noForno = p > forno[0];
      if (noForno && !tremendo) { tremendo = true; tremer(); }
      if (!noForno) { tremendo = false; cancelAnimationFrame(quadro); }
    }
    function tremer() {
      if (!tremendo) return;
      pizza.desenhar(estado.p, performance.now() / 1000);
      quadro = requestAnimationFrame(tremer);
    }

    gsap.to(estado, {
      p: 1,
      ease: 'none',
      onUpdate: render,
      scrollTrigger: {
        trigger: secao,
        start: 'top top',
        end: '+=420%',
        pin: '.pizza__palco',
        scrub: 0.6,
        onLeave: function () { tremendo = false; },
        onLeaveBack: function () { tremendo = false; },
      },
    });
    render();

    var largura = window.innerWidth;
    window.addEventListener('resize', function () {
      if (Math.abs(window.innerWidth - largura) < 40) return;
      largura = window.innerWidth;
      pizza.preparar();
      pizza.desenhar(estado.p, 0);
    });
  }

  // Celular e movimento reduzido: cada etapa em um quadro, num carrossel
  function montarPizzaSimples(secao) {
    secao.classList.add('pizza--simples');
    var passos = $$('.passo', secao);
    var lista = $('.passos', secao);
    var dica = document.createElement('p');
    dica.className = 'passos__dica';
    dica.textContent = 'Deslize para ver as cinco etapas.';
    lista.parentNode.insertBefore(dica, lista.nextSibling);
    // A lista rola para o lado no celular: precisa receber foco pelo teclado
    lista.setAttribute('tabindex', '0');
    lista.setAttribute('aria-label', 'As cinco etapas da Pizza Castelões');

    var estados = [0.16, 0.385, 0.595, 0.79, 1];
    var telas = passos.map(function (passo) {
      var c = document.createElement('canvas');
      c.className = 'passo__canvas';
      c.setAttribute('aria-hidden', 'true');
      passo.insertBefore(c, passo.firstChild);
      return c;
    });

    var desenhado = false;
    function desenharTudo() {
      if (desenhado) return;
      desenhado = true;
      var largura = telas[0].getBoundingClientRect().width || 320;
      var fonte = document.createElement('canvas');
      var pizza = window.PizzaCasteloes.criar(fonte, { tamanho: largura, dprMax: 2 });
      pizza.preparar();
      telas.forEach(function (c, i) {
        pizza.desenhar(estados[i], 0);
        c.width = fonte.width;
        c.height = fonte.height;
        c.getContext('2d').drawImage(fonte, 0, 0);
      });
    }
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { desenharTudo(); obs.disconnect(); }
      }, { rootMargin: '400px 0px' });
      obs.observe(secao);
    } else {
      desenharTudo();
    }
  }

  /* ---------- Início ---------- */

  montarHorario();
  montarPrecos();
  montarFotos();
  montarAmpliar();
  montarMenu();
  montarMapa();
  montarArco();
  cenas();
})();
