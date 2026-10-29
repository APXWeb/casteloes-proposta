(function () {
  'use strict';

  var CASA = window.CASA;
  var FOTOS = window.FOTOS || {};
  var raiz = document.documentElement;

  var movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  var telaCompacta = window.matchMedia('(max-width: 1023px)');
  var modoSimples = movimentoReduzido.matches || telaCompacta.matches;

  // As cenas são montadas de um jeito no desktop e de outro no celular:
  // ao cruzar o limite (girar o tablet, mudar a janela), recarrega no modo certo.
  function aoTrocarModo() {
    if ((movimentoReduzido.matches || telaCompacta.matches) === modoSimples) return;
    try {
      var atual = null;
      Array.prototype.forEach.call(document.querySelectorAll('main > section'), function (sec) {
        if (sec.getBoundingClientRect().top <= window.innerHeight * 0.4) atual = sec.id;
      });
      if (atual) sessionStorage.setItem('casteloes-secao', atual);
    } catch (e) {}
    window.location.reload();
  }
  function voltarParaSecao() {
    var id = null;
    try { id = sessionStorage.getItem('casteloes-secao'); sessionStorage.removeItem('casteloes-secao'); } catch (e) {}
    var alvo = id && document.getElementById(id);
    if (alvo) alvo.scrollIntoView({ behavior: 'auto' });
  }
  [movimentoReduzido, telaCompacta].forEach(function (mq) {
    if (mq.addEventListener) mq.addEventListener('change', aoTrocarModo);
    else if (mq.addListener) mq.addListener(aoTrocarModo);
  });

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Horário (lido de js/config.js) ---------- */

  var DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  var DIAS_MINUSC = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  function hora(texto) {
    var p = texto.split(':');
    var h = parseInt(p[0], 10);
    if (h === 0 && p[1] === '00') return 'meia-noite';
    return p[1] === '00' ? h + 'h' : h + 'h' + p[1];
  }
  // "às 23h" ou "à meia-noite"
  function asHora(texto) {
    var x = hora(texto);
    return x === 'meia-noite' ? 'à meia-noite' : 'às ' + x;
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
    var cruza = fecha <= abre; // ex.: abre 18:00 e fecha 00:30
    var funcionaHoje = h.dias.indexOf(agora.dia) !== -1;
    var funcionaOntem = h.dias.indexOf((agora.dia + 6) % 7) !== -1;
    var aberto = cruza
      ? (funcionaHoje && agora.min >= abre) || (funcionaOntem && agora.min < fecha)
      : funcionaHoje && agora.min >= abre && agora.min < fecha;

    if (aberto) {
      return { aberto: true, curto: 'Aberto até ' + (hora(h.fecha) === 'meia-noite' ? 'meia-noite' : hora(h.fecha)), longo: 'Aberto agora, até ' + (hora(h.fecha) === 'meia-noite' ? 'a meia-noite' : 'as ' + hora(h.fecha)) + '.' };
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
          curto: 'Abre ' + quando + ' às ' + hora(h.abre),
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
    var agora = agoraEmSaoPaulo(), hc = CASA.horario;
    var hoje = agora.dia;
    if (minutos(hc.fecha) <= minutos(hc.abre) && agora.min < minutos(hc.fecha) && hc.dias.indexOf((agora.dia + 6) % 7) !== -1) {
      hoje = (agora.dia + 6) % 7;
    }
    $$('[data-horario-tabela] tr').forEach(function (tr) {
      tr.classList.toggle('hoje', Number(tr.getAttribute('data-dia')) === hoje);
    });
  }

  // Ex.: "Terça a domingo, das 18h às 23h", montado a partir de config.js.
  // Dias que não são seguidos viram faixas: "Terça, quinta a domingo, …"
  function resumoHorario(h) {
    var semana = [1, 2, 3, 4, 5, 6, 0];
    var faixas = [], atual = null;
    semana.forEach(function (d) {
      if (h.dias.indexOf(d) === -1) { atual = null; return; }
      if (atual) atual.fim = d; else faixas.push(atual = { ini: d, fim: d });
    });
    if (!h.dias.length) return 'Fechado';
    // a faixa que termina no domingo continua na que começa na segunda
    if (faixas.length > 1 && faixas[0].ini === 1 && faixas[faixas.length - 1].fim === 0) {
      faixas[faixas.length - 1].fim = faixas[0].fim;
      faixas.shift();
    }
    var seguinte = function (d) { return (d + 1) % 7; };
    var dias = h.dias.length === 7 ? 'Todos os dias' : faixas.map(function (f, i) {
      var nome = i === 0 ? DIAS[f.ini] : DIAS_MINUSC[f.ini];
      if (f.ini === f.fim) return nome;
      return nome + (seguinte(f.ini) === f.fim ? ' e ' : ' a ') + DIAS_MINUSC[f.fim];
    }).join(', ');
    return dias + ', das ' + hora(h.abre) + ' ' + asHora(h.fecha);
  }

  function montarHorario() {
    var h = CASA.horario;
    var corpo = $('[data-horario-tabela]');
    if (corpo) {
      var ordem = [1, 2, 3, 4, 5, 6, 0];
      corpo.innerHTML = '';
      ordem.forEach(function (d) {
        var tr = document.createElement('tr');
        var abre = h.dias.indexOf(d) !== -1;
        if (!abre) tr.className = 'fechado';
        tr.setAttribute('data-dia', d);
        var th = document.createElement('th');
        th.scope = 'row';
        th.textContent = DIAS[d];
        var td = document.createElement('td');
        td.textContent = abre ? hora(h.abre) + ' ' + asHora(h.fecha) : 'Fechado';
        tr.appendChild(th);
        tr.appendChild(td);
        corpo.appendChild(tr);
      });
    }
    $$('[data-horario-resumo]').forEach(function (el) { el.textContent = resumoHorario(h); });
    atualizarStatus();
    setInterval(atualizarStatus, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) atualizarStatus(); });
  }

  /* ---------- Preços (lidos de js/config.js) ---------- */

  function montarPrecos() {
    var moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    $$('[data-preco]').forEach(function (el) {
      var valor = CASA.precos[el.getAttribute('data-preco')];
      if (typeof valor === 'number') {
        el.textContent = moeda.format(valor);
      } else {
        // Sem preço definido: some o valor e a linha pontilhada; o aviso do cabeçalho cobre
        el.textContent = '';
        var item = el.closest('.item, .carro-chefe');
        if (item) item.classList.add('sem-preco');
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
    var yAoAbrir = 0;
    function aberto() { return nav.classList.contains('aberto'); }
    function fechar() {
      nav.classList.remove('aberto');
      botao.setAttribute('aria-expanded', 'false');
      $('.sr', botao).textContent = 'Abrir menu';
    }
    botao.addEventListener('click', function () {
      var abrir = !aberto();
      nav.classList.toggle('aberto', abrir);
      botao.setAttribute('aria-expanded', String(abrir));
      $('.sr', botao).textContent = abrir ? 'Fechar menu' : 'Abrir menu';
      if (abrir) { yAoAbrir = window.scrollY; $('a', nav).focus(); }
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', fechar); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && aberto()) { fechar(); botao.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (aberto() && !e.target.closest('.barra')) fechar();
    });
    // a área escurecida pertence ao próprio menu: tocar nela só fecha
    nav.addEventListener('click', function (e) { if (e.target === nav) fechar(); });
    window.addEventListener('scroll', function () {
      if (aberto() && Math.abs(window.scrollY - yAoAbrir) > 60) fechar();
    }, { passive: true });
    $('.barra').addEventListener('focusout', function (e) {
      if (aberto() && e.relatedTarget && !e.relatedTarget.closest('.barra')) fechar();
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
      iframe.setAttribute('tabindex', '-1');
      iframe.focus({ preventScroll: true });
    });
  }

  /* ---------- Cenas com GSAP ---------- */

  function cenas() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    var pizzaSecao = $('.pizza');

    if (!gsap || !ST || movimentoReduzido.matches) {
      raiz.classList.add('pronto');
      $('.linha').style.setProperty('--progresso', 1);
      $$('.linha__item').forEach(function (li) { li.classList.add('aceso'); });
      montarPizzaSimples(pizzaSecao);
      window.addEventListener('load', voltarParaSecao);
      return;
    }

    gsap.registerPlugin(ST);
    var saida = 'power3.out';

    // 1. Abertura: uma única entrada, curta. O nome sobe da máscara e a foto abre de baixo para cima.
    var foto = $('.abertura__foto');
    var entrada = gsap.timeline({ defaults: { ease: saida } });
    entrada
      .from('.abertura__local', { opacity: 0, y: 12, duration: 0.7 }, 0.1)
      .from('.abertura__nome', { yPercent: 105, duration: 1.1 }, 0.15)
      .from('.abertura__lema', { yPercent: 105, duration: 1 }, 0.3)
      .from(['.abertura__sub', '.abertura__acoes'], { opacity: 0, y: 16, duration: 0.8, stagger: 0.08 }, 0.55)
      .from(foto, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.3, ease: 'power3.inOut' }, 0)
      .from($('img', foto) || foto, { scale: 1.12, duration: 1.8 }, 0);
    raiz.classList.add('pronto');

    // Ao sair da abertura, a foto desce devagar: profundidade, sem roubar a cena
    if (!modoSimples) {
      gsap.to(foto, {
        y: 70,
        ease: 'none',
        scrollTrigger: { trigger: '.abertura', start: 'top top', end: 'bottom top', scrub: true },
      });
    }

    // 2. Títulos de seção: sobem uma vez, quando chegam
    $$('[data-revela]').forEach(function (el) {
      gsap.from(el, { opacity: 0, y: 28, duration: 0.9, ease: saida, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    // Fotos principais: abrem de baixo para cima, com um leve recuo
    $$('.carro-chefe__foto, .galeria__a, .galeria__b').forEach(function (fig) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 85%', once: true } });
      tl.from(fig, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut' });
      var img = $('img', fig);
      if (img) tl.from(img, { scale: 1.1, duration: 1.4, ease: saida }, 0);
    });

    // 3. Linha do tempo acende conforme avança
    var linha = $('.linha');
    gsap.to(linha, {
      '--progresso': 1,
      ease: 'none',
      scrollTrigger: { trigger: linha, start: 'top 72%', end: 'bottom 72%', scrub: 0.4 },
    });
    $$('.linha__item').forEach(function (li) {
      ST.create({ trigger: li, start: 'top 72%', end: 'max', onToggle: function (st) { li.classList.toggle('aceso', st.isActive); } });
    });

    // 4. Pizza
    if (modoSimples) montarPizzaSimples(pizzaSecao);
    else montarPizzaScroll(pizzaSecao, gsap);

    // 5. "Acabar em pizza": as duas linhas sobem em sequência, depois o texto
    var frase = gsap.timeline({ scrollTrigger: { trigger: '.expressao', start: 'top 70%', once: true } });
    frase
      .from('[data-frase]', { yPercent: 105, duration: 1, stagger: 0.14, ease: saida })
      .from('.expressao__texto', { opacity: 0, y: 16, duration: 0.8, ease: saida }, 0.45);

    // 6. Salão: a foto larga se move um pouco dentro do quadro
    if (!modoSimples) {
      var largo = $('.galeria__c img');
      if (largo) {
        gsap.fromTo(largo, { yPercent: 0 }, {
          yPercent: -13,
          ease: 'none',
          scrollTrigger: { trigger: '.galeria__c', start: 'top bottom', end: 'bottom top', scrub: true },
        });
      }
    }

    // As fontes mudam a altura dos textos: recalcula as cenas fixadas quando chegarem
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
    window.addEventListener('load', function () { ST.refresh(); voltarParaSecao(); });
  }

  // Desktop: câmera sobre fotos reais da montagem, guiada pelo scroll e reversível
  function montarPizzaScroll(secao, gsap) {
    var quadro = $('.pizza__quadro', secao);
    var camada = {};
    $$('[data-camada]', quadro).forEach(function (el) { camada[el.getAttribute('data-camada')] = el; });
    var nota = { queijo: $('[data-nota="queijo"]', quadro), molho: $('[data-nota="molho"]', quadro) };
    var passos = $$('.passo', secao);
    var barra = $('.pizza__barra span', secao);

    // Enquadramentos na foto da montagem (frações da foto) e o que cada nota aponta
    var PLANO = {
      queijo: { fx: 0.83, fy: 0.38, s: 1.8 },
      molho: { fx: 0.3, fy: 0.68, s: 1.55 },
      todo: { fx: 0.5, fy: 0.5, s: 1 },
    };
    var ALVO = { queijo: { x: 0.93, y: 0.33 }, molho: { x: 0.17, y: 0.75 } };
    var LIMITES = [0.17, 0.38, 0.58, 0.8];

    function camera(p) {
      var W = quadro.clientWidth, H = quadro.clientHeight, s = p.s;
      var x = W / 2 - s * p.fx * H, y = H / 2 - s * p.fy * H;
      x = Math.min(0, Math.max(W - s * H, x));
      y = Math.min(0, Math.max(H - s * H, y));
      return { x: x, y: y, scale: s };
    }
    function pontoNota(nome) {
      var k = camera(PLANO[nome]), H = quadro.clientHeight;
      return { left: k.x + k.scale * ALVO[nome].x * H, top: k.y + k.scale * ALVO[nome].y * H };
    }
    function plano(nome, extra) {
      var o = {
        x: function () { return camera(PLANO[nome]).x; },
        y: function () { return camera(PLANO[nome]).y; },
        scale: PLANO[nome].s,
      };
      for (var k in extra) o[k] = extra[k];
      return o;
    }
    function lugarNota(nome) {
      return {
        left: function () { return pontoNota(nome).left; },
        top: function () { return pontoNota(nome).top; },
      };
    }

    function atualizar(p) {
      var ativo = 0;
      while (ativo < LIMITES.length && p >= LIMITES[ativo]) ativo++;
      passos.forEach(function (el, i) { el.classList.toggle('ativo', i === ativo); });
      var forno = Math.max(0, Math.min(1, (p - 0.8) / 0.12));
      secao.style.setProperty('--assar', (forno * forno * (3 - 2 * forno)).toFixed(3));
      barra.style.setProperty('--progresso', p.toFixed(4));
    }

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: secao,
        start: 'top top',
        end: '+=340%',
        pin: '.pizza__palco',
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: function (st) { atualizar(st.progress); },
      },
    });
    tl.fromTo(camada.massa, { opacity: 1, scale: 1.12 }, { scale: 1, duration: 0.19 }, 0)
      // 2. a câmera chega perto das fatias de muçarela, sob o molho
      .fromTo(camada.montagem, plano('queijo', { opacity: 0 }), { opacity: 1, duration: 0.05 }, 0.16)
      .to(camada.massa, { opacity: 0, duration: 0.05 }, 0.17)
      .fromTo(nota.queijo, Object.assign({ opacity: 0 }, lugarNota('queijo')), { opacity: 1, duration: 0.03 }, 0.23)
      .to(nota.queijo, { opacity: 0, duration: 0.03 }, 0.35)
      // 3. recua até o molho por cima do queijo
      .to(camada.montagem, plano('molho', { duration: 0.08, ease: 'power1.inOut' }), 0.38)
      .fromTo(nota.molho, Object.assign({ opacity: 0 }, lugarNota('molho')), { opacity: 1, duration: 0.03 }, 0.47)
      .to(nota.molho, { opacity: 0, duration: 0.03 }, 0.55)
      // 4. abre o plano: a mão espalhando a calabresa
      .to(camada.montagem, plano('todo', { duration: 0.1, ease: 'power1.inOut' }), 0.58)
      // 5. o forno aceso e a pizza saindo
      .fromTo(camada.fogo, { opacity: 0, scale: 1.12 }, { opacity: 1, duration: 0.05 }, 0.8)
      .to(camada.fogo, { scale: 1, duration: 0.14 }, 0.8)
      .fromTo(camada.saindo, { opacity: 0, scale: 1.08 }, { opacity: 1, duration: 0.04 }, 0.92)
      .to(camada.saindo, { scale: 1, duration: 0.08 }, 0.92);
    atualizar(0);
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

    var descricoes = [
      'Bolas de massa descansando na bancada enfarinhada.',
      'Fatias de muçarela sobre a massa, com o molho por cima.',
      'O molho de tomate espalhado sobre o queijo.',
      'A mão do pizzaiolo espalhando rodelas de calabresa.',
      'A pizza assada saindo do forno a lenha.',
    ];
    passos.forEach(function (passo, i) {
      var img = new Image();
      img.className = 'passo__img';
      img.src = 'img/pizza-etapa-' + (i + 1) + '.webp';
      img.alt = descricoes[i];
      img.width = 720;
      img.height = 720;
      img.loading = 'lazy';
      img.decoding = 'async';
      passo.insertBefore(img, passo.firstChild);
    });
  }

  /* ---------- Início ---------- */

  montarHorario();
  montarPrecos();
  montarFotos();
  montarAmpliar();
  montarMenu();
  montarMapa();
  cenas();
})();
