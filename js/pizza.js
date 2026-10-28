/*
 * Pizza Castelões em canvas, vista de cima.
 * Cada camada (tábua, piso do forno, brasas, massa, muçarela, molho,
 * calabresa e as versões assadas) é desenhada uma vez fora da tela;
 * a cada quadro só compomos as camadas de acordo com o progresso p (0 a 1).
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  // Etapas da montagem, em frações do progresso total.
  var ETAPAS = {
    massa: [0.0, 0.15],
    queijo: [0.18, 0.37],
    molho: [0.40, 0.58],
    calabresa: [0.61, 0.78],
    forno: [0.81, 1.0],
  };

  function aleatorio(semente) {
    return function () {
      semente |= 0;
      semente = (semente + 0x6d2b79f5) | 0;
      var t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function limitar(v, a, b) { return v < a ? a : v > b ? b : v; }
  function faixa(p, intervalo) { return limitar((p - intervalo[0]) / (intervalo[1] - intervalo[0]), 0, 1); }
  function suave(t) { return t * t * (3 - 2 * t); }
  function saida(t) { return 1 - Math.pow(1 - t, 3); }

  // Ruído periódico para contornos irregulares (soma de senoides).
  function ruido(rand, amplitude, harmonicos) {
    harmonicos = harmonicos || [2, 3, 5, 7, 11, 13];
    var fases = harmonicos.map(function () { return rand() * TAU; });
    var amps = harmonicos.map(function (h) { return (0.4 + rand() * 0.6) / Math.pow(h, 0.7); });
    var soma = amps.reduce(function (a, b) { return a + b; }, 0);
    return function (a) {
      var v = 0;
      for (var i = 0; i < harmonicos.length; i++) v += amps[i] * Math.sin(harmonicos[i] * a + fases[i]);
      return (v / soma) * amplitude;
    };
  }

  function tracarContorno(ctx, cx, cy, r, borda, passos, inverso) {
    passos = passos || 120;
    for (var i = 0; i <= passos; i++) {
      var k = inverso ? passos - i : i;
      var a = (k / passos) * TAU;
      var rr = r * (1 + borda(a));
      var x = cx + Math.cos(a) * rr;
      var y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function caminhoIrregular(ctx, cx, cy, r, borda, passos) {
    ctx.beginPath();
    tracarContorno(ctx, cx, cy, r, borda, passos);
  }

  function novaTela(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h || w));
    return c;
  }

  function pontoNoDisco(rand, raio) {
    var a = rand() * TAU;
    var r = Math.sqrt(rand()) * raio;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, a: a, r: r };
  }

  function mancha(ctx, x, y, raio, cor, alpha) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, raio);
    g.addColorStop(0, 'rgba(' + cor + ',' + alpha + ')');
    g.addColorStop(1, 'rgba(' + cor + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);
  }

  // Luz vinda do alto à esquerda, aplicada só sobre o que já está na camada.
  function iluminar(ctx, S, forca) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    var g = ctx.createLinearGradient(S * 0.15, S * 0.1, S * 0.85, S * 0.9);
    g.addColorStop(0, 'rgba(255, 244, 220,' + 0.14 * forca + ')');
    g.addColorStop(0.5, 'rgba(255, 244, 220, 0)');
    g.addColorStop(1, 'rgba(30, 10, 0,' + 0.22 * forca + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.restore();
  }

  function Pizza(canvas, opcoes) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opcoes = opcoes || {};
    this.S = 0;
  }

  Pizza.prototype.preparar = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, this.opcoes.dprMax || 2);
    var css = this.opcoes.tamanho || this.canvas.getBoundingClientRect().width || 600;
    var S = Math.min(Math.round(css * dpr), 1400);
    if (S === this.S) return;
    this.S = S;
    this.canvas.width = S;
    this.canvas.height = S;
    this.R = S * 0.37; // raio externo da pizza
    this.c = S / 2;
    this.construir();
  };

  Pizza.prototype.construir = function () {
    var S = this.S, R = this.R, c = this.c;
    var self = this;
    this.bordaMassa = ruido(aleatorio(1924), 0.02);
    this.bordaInterna = ruido(aleatorio(1001), 0.045, [3, 4, 6, 9, 13]);

    this.tabua = this.desenharTabua(aleatorio(31));
    this.piso = this.desenharPiso(aleatorio(41));
    this.brasas = this.desenharBrasas(aleatorio(43));
    this.massaCrua = this.desenharMassa(aleatorio(11), false);
    this.massaAssada = this.desenharMassa(aleatorio(11), true);

    // Muçarela em fatias: cada fatia vira um pequeno sprite.
    var r2 = aleatorio(7);
    this.fatias = [];
    var passo = R * 0.27;
    var linha = 0;
    for (var gy = -R; gy <= R; gy += passo * 0.78, linha++) {
      for (var gx = -R; gx <= R; gx += passo * 0.9) {
        var x = gx + (r2() - 0.5) * passo * 0.45 + (linha % 2 ? passo * 0.45 : 0);
        var y = gy + (r2() - 0.5) * passo * 0.35;
        if (Math.hypot(x, y) > R * 0.66) continue;
        this.fatias.push(this.desenharFatiaQueijo(r2, x, y));
      }
    }
    this.fatias.sort(function (a, b) { return a.ordem - b.ordem; });
    this.queijoMontado = novaTela(S);
    var qc = this.queijoMontado.getContext('2d');
    this.fatias.forEach(function (f) { qc.drawImage(f.tela, c + f.x - f.meio, c + f.y - f.meio); });
    this.queijoDerretido = this.desenharQueijoDerretido(aleatorio(5));

    // Molho em espiral, por cima do queijo.
    this.espiral = { r0: R * 0.03, r1: R * 0.69, voltas: 4.1 };
    this.desvio = ruido(aleatorio(77), 1, [1, 2, 3, 5]);
    this.molhoCru = this.desenharMolho(aleatorio(3), false);
    this.molhoAssado = this.desenharMolho(aleatorio(3), true);
    this.mascara = novaTela(S);

    // Calabresa artesanal em rodelas finas, cobrindo a pizza inteira (como nas fotos da casa).
    var r3 = aleatorio(19);
    this.rodelas = [];
    var minimo = R * 0.105, tentativas = 0;
    while (this.rodelas.length < 46 && tentativas < 4000) {
      tentativas++;
      var pr = pontoNoDisco(r3, R * 0.68);
      var livre = this.rodelas.every(function (o) { return Math.hypot(o.x - pr.x, o.y - pr.y) > minimo; });
      if (livre) this.rodelas.push({ x: pr.x, y: pr.y, ordem: r3() });
    }
    this.rodelas.sort(function (a, b) { return a.ordem - b.ordem; });
    this.rodelas.forEach(function (rd, i) {
      rd.crua = self.desenharRodela(aleatorio(100 + i), false);
      rd.assada = self.desenharRodela(aleatorio(100 + i), true);
      rd.giro = aleatorio(500 + i)() * TAU;
    });
  };

  // Bancada de mármore enfarinhada onde a pizza é montada.
  Pizza.prototype.desenharTabua = function (rand) {
    var S = this.S, c = this.c;
    var t = novaTela(S), ctx = t.getContext('2d');
    var g = ctx.createRadialGradient(c * 0.8, c * 0.7, 0, c, c, S * 0.62);
    g.addColorStop(0, '#d8d2c6');
    g.addColorStop(1, '#a9a297');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    // Veios
    for (var i = 0; i < 9; i++) {
      var x0 = rand() * S, y0 = rand() * S, ang = rand() * TAU;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      var x = x0, y = y0;
      for (var k = 0; k < 40; k++) {
        ang += (rand() - 0.5) * 0.5;
        x += Math.cos(ang) * S * 0.03;
        y += Math.sin(ang) * S * 0.03;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(110,104,96,' + (0.12 + rand() * 0.2) + ')';
      ctx.lineWidth = 0.6 + rand() * 2.4;
      ctx.filter = 'blur(' + (rand() * 1.5).toFixed(1) + 'px)';
      ctx.stroke();
    }
    ctx.filter = 'none';
    // Farinha espalhada, mais densa onde a massa foi aberta
    for (var f = 0; f < 70; f++) {
      var pf = pontoNoDisco(rand, S * 0.42);
      mancha(ctx, c + pf.x, c + pf.y, S * (0.03 + rand() * 0.07), '250,248,242', 0.12 + rand() * 0.2);
    }
    for (var d = 0; d < 2600; d++) {
      var pd = pontoNoDisco(rand, S * 0.48);
      ctx.fillStyle = 'rgba(255,255,252,' + (0.15 + rand() * 0.4) + ')';
      ctx.fillRect(c + pd.x, c + pd.y, 0.8 + rand() * 1.6, 0.8 + rand() * 1.6);
    }
    // A luz quente do salão cai sobre a bancada e escurece nas bordas
    ctx.globalCompositeOperation = 'multiply';
    var luz = ctx.createRadialGradient(c, c, S * 0.2, c, c, S * 0.55);
    luz.addColorStop(0, 'rgb(255,236,210)');
    luz.addColorStop(1, 'rgb(120,96,76)');
    ctx.fillStyle = luz;
    ctx.fillRect(0, 0, S, S);
    ctx.globalCompositeOperation = 'source-over';
    return t;
  };

  // Piso de tijolo refratário do forno, com cinza e fuligem.
  Pizza.prototype.desenharPiso = function (rand) {
    var S = this.S, c = this.c;
    var t = novaTela(S), ctx = t.getContext('2d');
    var lado = S * 0.2;
    var junta = Math.max(1, S * 0.003);
    ctx.fillStyle = '#140b07';
    ctx.fillRect(0, 0, S, S);
    for (var y = -lado * 0.3; y < S + lado; y += lado) {
      for (var x = -lado * 0.6; x < S + lado; x += lado) {
        var tom = 26 + rand() * 18;
        ctx.fillStyle = 'rgb(' + Math.round(tom * 2.0) + ',' + Math.round(tom * 1.1) + ',' + Math.round(tom * 0.75) + ')';
        ctx.fillRect(x + junta, y + junta, lado - junta * 2, lado - junta * 2);
      }
    }
    // Cinza e fuligem
    for (var i = 0; i < 90; i++) {
      var px = rand() * S, py = rand() * S;
      mancha(ctx, px, py, S * (0.02 + rand() * 0.08), rand() > 0.6 ? '200,190,175' : '10,5,2', 0.12 + rand() * 0.2);
    }
    // Esmaece nas bordas para fundir com a página
    ctx.globalCompositeOperation = 'destination-in';
    var g = ctx.createRadialGradient(c, c, S * 0.2, c, c, S * 0.5);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return t;
  };

  // A brasa fica fora do quadro: só a luz dela entra pela esquerda, com fagulhas.
  Pizza.prototype.desenharBrasas = function (rand) {
    var S = this.S, R = this.R, c = this.c;
    this.focoBrasa = { x: c - R * 1.05, y: c - R * 0.8 };
    this.fagulhas = [];
    for (var i = 0; i < 26; i++) {
      this.fagulhas.push({ x: rand(), y: rand(), v: 0.04 + rand() * 0.08, r: 0.6 + rand() * 1.6, f: rand() * TAU });
    }
    return null;
  };

  Pizza.prototype.desenharMassa = function (rand, assada) {
    var S = this.S, R = this.R, c = this.c;
    var t = novaTela(S), ctx = t.getContext('2d');
    var borda = this.bordaMassa, interna = this.bordaInterna;
    var RI = R * 0.8;

    // Sombra de contato
    ctx.save();
    ctx.shadowColor = 'rgba(20,8,0,0.55)';
    ctx.shadowBlur = R * 0.07;
    ctx.shadowOffsetY = R * 0.025;
    caminhoIrregular(ctx, c, c, R, borda);
    ctx.fillStyle = assada ? '#c88a45' : '#e4d3ae';
    ctx.fill();
    ctx.restore();

    ctx.save();
    caminhoIrregular(ctx, c, c, R, borda);
    ctx.clip();

    // Base
    ctx.fillStyle = assada ? '#d9ae6c' : '#eadcbc';
    ctx.fillRect(0, 0, S, S);
    for (var i = 0; i < 60; i++) {
      var p = pontoNoDisco(rand, R);
      var claro = rand() > 0.5;
      mancha(ctx, c + p.x, c + p.y, R * (0.05 + rand() * 0.14),
        assada ? (claro ? '255,210,140' : '140,70,25') : (claro ? '255,250,235' : '175,145,100'), 0.07 + rand() * 0.08);
    }

    // Borda volumosa (cornicione): anel entre o contorno externo e um interno irregular
    ctx.beginPath();
    tracarContorno(ctx, c, c, R, borda, 140);
    tracarContorno(ctx, c, c, RI, interna, 140, true);
    var g = ctx.createRadialGradient(c, c, R * 0.74, c, c, R * 1.02);
    if (assada) {
      g.addColorStop(0, '#c88a43');
      g.addColorStop(0.35, '#e9b565');
      g.addColorStop(0.62, '#d79a4a');
      g.addColorStop(0.88, '#a8632a');
      g.addColorStop(1, '#6e3a14');
    } else {
      g.addColorStop(0, '#dcc7a0');
      g.addColorStop(0.35, '#f6eedb');
      g.addColorStop(0.65, '#ecdcbb');
      g.addColorStop(0.9, '#d4bb92');
      g.addColorStop(1, '#bea07a');
    }
    ctx.fillStyle = g;
    ctx.filter = 'blur(' + Math.max(1, R * 0.014) + 'px)';
    ctx.fill();
    ctx.filter = 'none';

    // Volumes irregulares ao longo da borda
    for (var b = 0; b < 70; b++) {
      var a = rand() * TAU;
      var rb = R * (0.83 + rand() * 0.11);
      var bx = c + Math.cos(a) * rb, by = c + Math.sin(a) * rb;
      if (assada) {
        mancha(ctx, bx, by, R * (0.03 + rand() * 0.07), rand() > 0.45 ? '255,205,130' : '150,80,25', 0.25 + rand() * 0.3);
      } else {
        mancha(ctx, bx, by, R * (0.03 + rand() * 0.06), rand() > 0.4 ? '255,252,242' : '190,160,115', 0.2 + rand() * 0.3);
      }
    }

    if (assada) {
      // Pintas do forno a lenha: pequenas, irregulares, concentradas nos pontos altos
      for (var s = 0; s < 110; s++) {
        var aa = rand() * TAU;
        var rs = R * (0.84 + rand() * 0.14);
        var sx = c + Math.cos(aa) * rs, sy = c + Math.sin(aa) * rs;
        var ts = R * (0.005 + Math.pow(rand(), 2.5) * 0.026);
        ctx.fillStyle = 'rgba(' + (40 + Math.round(rand() * 30)) + ',18,6,' + (0.55 + rand() * 0.4) + ')';
        ctx.beginPath();
        ctx.ellipse(sx, sy, ts * (1 + rand()), ts, rand() * TAU, 0, TAU);
        ctx.fill();
        if (rand() > 0.6) mancha(ctx, sx, sy, ts * 3, '90,40,10', 0.25);
      }
    } else {
      for (var f = 0; f < 1800; f++) {
        var pf = pontoNoDisco(rand, R);
        ctx.fillStyle = 'rgba(255,255,250,' + (0.12 + rand() * 0.3) + ')';
        var tf = 0.6 + rand() * 1.6;
        ctx.fillRect(c + pf.x, c + pf.y, tf, tf);
      }
    }

    // Sombra onde a borda sobe
    ctx.beginPath();
    tracarContorno(ctx, c, c, RI * 0.985, interna, 140);
    ctx.strokeStyle = assada ? 'rgba(100,45,12,0.4)' : 'rgba(130,100,60,0.22)';
    ctx.lineWidth = R * 0.03;
    ctx.filter = 'blur(' + Math.max(1, R * 0.015) + 'px)';
    ctx.stroke();
    ctx.filter = 'none';
    ctx.restore();

    iluminar(ctx, S, 1.2);
    return t;
  };

  Pizza.prototype.desenharFatiaQueijo = function (rand, x, y) {
    var R = this.R;
    var w = R * (0.25 + rand() * 0.07), h = R * (0.18 + rand() * 0.05);
    var tam = Math.ceil(Math.hypot(w, h) * 1.3);
    var t = novaTela(tam), ctx = t.getContext('2d');
    var m = tam / 2;
    var borda = ruido(rand, 0.07, [2, 3, 5, 7]);

    ctx.translate(m, m);
    ctx.rotate(rand() * TAU);
    ctx.shadowColor = 'rgba(70,50,20,0.25)';
    ctx.shadowBlur = R * 0.012;
    ctx.shadowOffsetY = R * 0.006;
    ctx.beginPath();
    for (var i = 0; i <= 44; i++) {
      var a = (i / 44) * TAU;
      var ca = Math.cos(a), sa = Math.sin(a);
      var px = Math.sign(ca) * Math.pow(Math.abs(ca), 0.6) * w * 0.5;
      var py = Math.sign(sa) * Math.pow(Math.abs(sa), 0.6) * h * 0.5;
      var k = 1 + borda(a);
      if (i === 0) ctx.moveTo(px * k, py * k); else ctx.lineTo(px * k, py * k);
    }
    ctx.closePath();
    var g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, 'rgba(252,247,232,0.97)');
    g.addColorStop(1, 'rgba(236,226,198,0.95)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(190,165,115,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    for (var f = 0; f < 7; f++) {
      ctx.fillStyle = 'rgba(205,185,140,0.3)';
      ctx.beginPath();
      ctx.arc((rand() - 0.5) * w * 0.7, (rand() - 0.5) * h * 0.7, R * (0.003 + rand() * 0.006), 0, TAU);
      ctx.fill();
    }
    return { tela: t, x: x, y: y, meio: m, ordem: rand() };
  };

  Pizza.prototype.desenharQueijoDerretido = function (rand) {
    var S = this.S, R = this.R, c = this.c;
    var t = novaTela(S), ctx = t.getContext('2d');
    ctx.save();
    caminhoIrregular(ctx, c, c, R * 0.8, this.bordaInterna);
    var g = ctx.createRadialGradient(c, c, 0, c, c, R * 0.8);
    g.addColorStop(0, '#f6dc96');
    g.addColorStop(0.85, '#efc878');
    g.addColorStop(1, '#d59c4c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    for (var i = 0; i < 60; i++) {
      var p = pontoNoDisco(rand, R * 0.78);
      mancha(ctx, c + p.x, c + p.y, R * (0.015 + Math.pow(rand(), 2) * 0.06), '176,104,38', 0.3 + rand() * 0.4);
    }
    for (var k = 0; k < 60; k++) {
      var q = pontoNoDisco(rand, R * 0.76);
      ctx.fillStyle = 'rgba(255,248,215,' + (0.25 + rand() * 0.4) + ')';
      ctx.beginPath();
      ctx.ellipse(c + q.x, c + q.y, R * (0.004 + rand() * 0.012), R * (0.003 + rand() * 0.007), rand() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    iluminar(ctx, S, 1);
    return t;
  };

  // Ponto da espiral do molho, com um desvio suave para não parecer desenhado a compasso.
  Pizza.prototype.pontoEspiral = function (th) {
    var e = this.espiral, R = this.R;
    var max = e.voltas * TAU;
    var r = e.r0 + (e.r1 - e.r0) * (th / max);
    r += R * 0.03 * this.desvio(th * 0.45) * Math.min(1, th / 3);
    var ex = 1 + 0.05 * Math.sin(th * 0.2);
    return { r: r, x: Math.cos(th) * r * ex, y: Math.sin(th) * r };
  };

  Pizza.prototype.desenharMolho = function (rand, assado) {
    var S = this.S, R = this.R, c = this.c;
    var t = novaTela(S), ctx = t.getContext('2d');
    var max = this.espiral.voltas * TAU;
    var largura = ruido(rand, 0.4, [2, 3, 7, 11]);

    ctx.save();
    ctx.shadowColor = assado ? 'rgba(60,10,0,0.5)' : 'rgba(80,10,0,0.4)';
    ctx.shadowBlur = R * 0.02;
    ctx.strokeStyle = assado ? '#8f2317' : '#ae2a1c';
    ctx.fillStyle = ctx.strokeStyle;
    // Cada colherada deixa uma poça irregular; entre elas o queijo aparece
    var th = 0.2;
    while (th < max) {
      var pe = this.pontoEspiral(th);
      var raio = R * (0.05 + 0.03 * (1 + largura(th * 0.6)) * 0.5 + rand() * 0.02);
      var desvio = (rand() - 0.5) * R * 0.05;
      var x = c + pe.x + Math.cos(th) * desvio, y = c + pe.y + Math.sin(th) * desvio;
      var borda = ruido(rand, 0.18, [2, 3, 5]);
      caminhoIrregular(ctx, x, y, raio, borda, 28);
      ctx.fill();
      th += (R * (0.07 + rand() * 0.04)) / Math.max(pe.r, R * 0.12);
    }
    // Respingos da concha ao longo do caminho
    for (var k = 0; k < 26; k++) {
      var thk = (0.15 + rand() * 0.85) * max;
      var pk = this.pontoEspiral(thk);
      var off = (rand() - 0.5) * R * 0.12;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.ellipse(c + pk.x + Math.cos(thk) * off, c + pk.y + Math.sin(thk) * off, R * (0.025 + rand() * 0.04), R * (0.02 + rand() * 0.03), rand() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Textura: pedaços de tomate, variação de tom e brilho úmido
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    for (var j = 0; j < 90; j++) {
      var pm = pontoNoDisco(rand, R * 0.78);
      mancha(ctx, c + pm.x, c + pm.y, R * (0.03 + rand() * 0.07), rand() > 0.5 ? '200,60,35' : '90,10,5', 0.18 + rand() * 0.2);
    }
    for (var i2 = 0; i2 < 170; i2++) {
      var p = pontoNoDisco(rand, R * 0.76);
      ctx.fillStyle = rand() > 0.5
        ? (assado ? 'rgba(70,12,6,0.5)' : 'rgba(110,18,10,0.5)')
        : (assado ? 'rgba(190,80,40,0.3)' : 'rgba(225,85,55,0.35)');
      ctx.beginPath();
      ctx.ellipse(c + p.x, c + p.y, R * (0.006 + rand() * 0.014), R * (0.004 + rand() * 0.008), rand() * TAU, 0, TAU);
      ctx.fill();
    }
    for (var k2 = 0; k2 < (assado ? 40 : 120); k2++) {
      var q = pontoNoDisco(rand, R * 0.76);
      ctx.fillStyle = 'rgba(255,235,220,' + (assado ? 0.16 : 0.32) * rand() + ')';
      ctx.beginPath();
      ctx.ellipse(c + q.x, c + q.y, R * (0.004 + rand() * 0.01), R * (0.002 + rand() * 0.004), rand() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    if (assado) {
      // No forno, o queijo de baixo borbulha e atravessa o molho
      for (var b = 0; b < 22; b++) {
        var pb = pontoNoDisco(rand, R * 0.7);
        var rb = R * (0.012 + Math.pow(rand(), 2.2) * 0.06);
        var gb = ctx.createRadialGradient(c + pb.x - rb * 0.3, c + pb.y - rb * 0.3, 0, c + pb.x, c + pb.y, rb);
        gb.addColorStop(0, 'rgba(250,224,150,0.95)');
        gb.addColorStop(0.65, 'rgba(232,180,95,0.85)');
        gb.addColorStop(1, 'rgba(160,80,30,0)');
        ctx.fillStyle = gb;
        ctx.beginPath();
        ctx.ellipse(c + pb.x, c + pb.y, rb, rb * (0.7 + rand() * 0.3), rand() * TAU, 0, TAU);
        ctx.fill();
      }
    }
    iluminar(ctx, S, 1);
    return t;
  };

  Pizza.prototype.desenharRodela = function (rand, assada) {
    var R = this.R;
    var r = R * (0.074 + rand() * 0.01);
    var achata = 0.86 + rand() * 0.1; // corte levemente na diagonal
    var tam = Math.ceil(r * 2.6);
    var t = novaTela(tam), ctx = t.getContext('2d');
    var m = tam / 2;
    var borda = ruido(rand, 0.03, [3, 5, 7]);

    ctx.translate(m, m);
    ctx.scale(1, achata);
    ctx.translate(-m, -m);

    ctx.save();
    ctx.shadowColor = 'rgba(40,5,0,0.5)';
    ctx.shadowBlur = r * 0.22;
    ctx.shadowOffsetX = r * 0.05;
    ctx.shadowOffsetY = r * 0.12;
    caminhoIrregular(ctx, m, m, r, borda, 60);
    ctx.fillStyle = assada ? '#6a2416' : '#93402f';
    ctx.fill();
    ctx.restore();

    ctx.save();
    caminhoIrregular(ctx, m, m, r * 0.95, borda, 60);
    ctx.clip();
    var g = ctx.createRadialGradient(m - r * 0.2, m - r * 0.25, 0, m, m, r);
    if (assada) {
      g.addColorStop(0, '#bd5a40');
      g.addColorStop(0.75, '#a3482f');
      g.addColorStop(1, '#7a3020');
    } else {
      g.addColorStop(0, '#d98a78');
      g.addColorStop(0.75, '#c87160');
      g.addColorStop(1, '#ad5646');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tam, tam);
    // Carne moída grossa
    for (var i = 0; i < 26; i++) {
      var p = pontoNoDisco(rand, r * 0.85);
      ctx.fillStyle = rand() > 0.5 ? 'rgba(150,50,35,0.35)' : 'rgba(235,140,120,0.3)';
      ctx.beginPath();
      ctx.ellipse(m + p.x, m + p.y, r * (0.05 + rand() * 0.08), r * (0.04 + rand() * 0.05), rand() * TAU, 0, TAU);
      ctx.fill();
    }
    // Gordura marmorizada, irregular
    for (var k = 0; k < 8; k++) {
      var q = pontoNoDisco(rand, r * 0.72);
      var fr = r * (0.07 + rand() * 0.09);
      ctx.fillStyle = assada ? 'rgba(236,170,128,0.55)' : 'rgba(244,212,198,0.6)';
      ctx.beginPath();
      ctx.moveTo(m + q.x + fr, m + q.y);
      for (var v = 1; v <= 6; v++) {
        var av = (v / 6) * TAU;
        var rv = fr * (0.6 + rand() * 0.6);
        ctx.lineTo(m + q.x + Math.cos(av) * rv, m + q.y + Math.sin(av) * rv);
      }
      ctx.closePath();
      ctx.fill();
    }
    // Pimenta
    for (var pi = 0; pi < 10; pi++) {
      var pp = pontoNoDisco(rand, r * 0.8);
      ctx.fillStyle = 'rgba(70,8,4,0.7)';
      ctx.fillRect(m + pp.x, m + pp.y, Math.max(1, r * 0.03), Math.max(1, r * 0.03));
    }
    if (assada) {
      var gb = ctx.createRadialGradient(m, m, r * 0.5, m, m, r * 0.94);
      gb.addColorStop(0, 'rgba(40,8,2,0)');
      gb.addColorStop(1, 'rgba(60,14,4,0.55)');
      ctx.fillStyle = gb;
      ctx.fillRect(0, 0, tam, tam);
    }
    var gl = ctx.createRadialGradient(m - r * 0.35, m - r * 0.4, 0, m - r * 0.35, m - r * 0.4, r * 0.75);
    gl.addColorStop(0, 'rgba(255,240,225,' + (assada ? 0.3 : 0.18) + ')');
    gl.addColorStop(1, 'rgba(255,240,225,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, tam, tam);
    ctx.restore();
    return { tela: t, meio: m };
  };

  // ---------- Composição de cada quadro ----------

  Pizza.prototype.desenhar = function (p, tempo) {
    if (!this.S) this.preparar();
    var ctx = this.ctx, S = this.S, R = this.R, c = this.c;
    tempo = tempo || 0;

    var tMassa = saida(faixa(p, ETAPAS.massa));
    var tQueijo = faixa(p, ETAPAS.queijo);
    var tMolho = faixa(p, ETAPAS.molho);
    var tCalab = faixa(p, ETAPAS.calabresa);
    var tForno = faixa(p, ETAPAS.forno);
    var dentro = suave(limitar(tForno / 0.3, 0, 1));      // entrada no forno
    var assado = suave(limitar((tForno - 0.25) / 0.6, 0, 1));
    var tremor = 0.8 + 0.2 * Math.sin(tempo * 6.1) * Math.sin(tempo * 2.3 + 1.7);

    ctx.clearRect(0, 0, S, S);

    // Fundo: a tábua dá lugar ao piso do forno
    if (dentro < 1) { ctx.globalAlpha = 1 - dentro; ctx.drawImage(this.tabua, 0, 0); }
    if (dentro > 0) {
      ctx.globalAlpha = dentro;
      ctx.drawImage(this.piso, 0, 0);
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(-0.35 + p * 0.35);
    var escala = (0.42 + 0.58 * tMassa) * (1 - dentro * 0.06);
    ctx.scale(escala, escala);
    ctx.translate(-c, -c);

    // Massa
    if (assado < 1) ctx.drawImage(this.massaCrua, 0, 0);
    if (assado > 0) { ctx.globalAlpha = assado; ctx.drawImage(this.massaAssada, 0, 0); ctx.globalAlpha = 1; }

    // Muçarela: as fatias caem uma a uma
    if (tQueijo > 0) {
      if (tQueijo < 1) {
        var n = this.fatias.length;
        for (var i = 0; i < n; i++) {
          var f = this.fatias[i];
          var lt = limitar((tQueijo - (i / n) * 0.7) / 0.3, 0, 1);
          if (lt <= 0) continue;
          var e = saida(lt);
          ctx.globalAlpha = Math.min(1, lt * 2.5);
          var s = 1 + (1 - e) * 0.3;
          var w = f.tela.width * s;
          ctx.drawImage(f.tela, c + f.x - w / 2, c + f.y - w / 2 - (1 - e) * R * 0.22, w, w);
        }
        ctx.globalAlpha = 1;
      } else {
        if (assado < 1) ctx.drawImage(this.queijoMontado, 0, 0);
        if (assado > 0) { ctx.globalAlpha = assado; ctx.drawImage(this.queijoDerretido, 0, 0); ctx.globalAlpha = 1; }
      }
    }

    // Molho por cima do queijo, em espiral a partir do centro
    if (tMolho > 0) {
      if (tMolho < 1) {
        var mc = this.mascara.getContext('2d');
        mc.globalCompositeOperation = 'source-over';
        mc.clearRect(0, 0, S, S);
        mc.drawImage(this.molhoCru, 0, 0);
        mc.globalCompositeOperation = 'destination-in';
        mc.lineCap = 'round';
        mc.lineJoin = 'round';
        mc.lineWidth = R * 0.32;
        mc.beginPath();
        var limite = saida(tMolho) * this.espiral.voltas * TAU;
        for (var th = 0; th <= limite; th += 0.05) {
          var pe = this.pontoEspiral(th);
          if (th === 0) mc.moveTo(c + pe.x, c + pe.y); else mc.lineTo(c + pe.x, c + pe.y);
        }
        mc.stroke();
        mc.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.mascara, 0, 0);
      } else {
        if (assado < 1) ctx.drawImage(this.molhoCru, 0, 0);
        if (assado > 0) { ctx.globalAlpha = assado; ctx.drawImage(this.molhoAssado, 0, 0); ctx.globalAlpha = 1; }
      }
    }

    // Calabresa em rodelas
    if (tCalab > 0) {
      var total = this.rodelas.length;
      for (var j = 0; j < total; j++) {
        var rd = this.rodelas[j];
        var lr = limitar((tCalab - (j / total) * 0.8) / 0.2, 0, 1);
        if (lr <= 0) continue;
        var er = saida(lr);
        var sr = 1 + (1 - er) * 0.45;
        ctx.save();
        ctx.translate(c + rd.x, c + rd.y - (1 - er) * R * 0.16);
        ctx.rotate(rd.giro);
        ctx.scale(sr, sr);
        ctx.globalAlpha = Math.min(1, lr * 3);
        if (assado < 1) ctx.drawImage(rd.crua.tela, -rd.crua.meio, -rd.crua.meio);
        if (assado > 0) { ctx.globalAlpha = assado; ctx.drawImage(rd.assada.tela, -rd.assada.meio, -rd.assada.meio); }
        ctx.restore();
      }
    }
    ctx.restore();

    // Luz da brasa sobre a pizza
    if (dentro > 0) {
      var fx = this.focoBrasa.x, fy = this.focoBrasa.y;
      var fg = ctx.createRadialGradient(fx, fy, R * 0.1, fx, fy, R * 2.3);
      fg.addColorStop(0, 'rgba(255,150,60,' + 0.55 * dentro * tremor + ')');
      fg.addColorStop(0.5, 'rgba(240,100,30,' + 0.2 * dentro * tremor + ')');
      fg.addColorStop(1, 'rgba(240,100,30,0)');
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, S, S);
      ctx.globalCompositeOperation = 'lighter';
      var fl = ctx.createRadialGradient(fx, fy, 0, fx, fy, R * 0.75);
      fl.addColorStop(0, 'rgba(255,170,80,' + 0.35 * dentro * tremor + ')');
      fl.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = fl;
      ctx.fillRect(0, 0, S, S);
      // fagulhas subindo
      for (var k = 0; k < this.fagulhas.length; k++) {
        var fa = this.fagulhas[k];
        var yy = ((fa.y - tempo * fa.v) % 1 + 1) % 1;
        var xx = fa.x + Math.sin(tempo * 1.3 + fa.f) * 0.02;
        var vida = Math.sin(Math.PI * yy);
        ctx.fillStyle = 'rgba(255,' + Math.round(150 + 80 * yy) + ',70,' + (0.8 * vida * dentro) + ')';
        ctx.beginPath();
        ctx.arc(xx * S, yy * S, fa.r * S / 700, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // Bordas do quadro sempre esmaecidas, para a cena se fundir com a página
    ctx.globalCompositeOperation = 'destination-in';
    var borda = ctx.createRadialGradient(c, c, S * 0.43, c, c, S * 0.5);
    borda.addColorStop(0, 'rgba(0,0,0,1)');
    borda.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = borda;
    ctx.fillRect(0, 0, S, S);
    ctx.globalCompositeOperation = 'source-over';
  };

  window.PizzaCasteloes = {
    ETAPAS: ETAPAS,
    criar: function (canvas, opcoes) { return new Pizza(canvas, opcoes); },
    etapaAtiva: function (p) {
      if (p < 0.165) return 0;
      if (p < 0.385) return 1;
      if (p < 0.595) return 2;
      if (p < 0.795) return 3;
      return 4;
    },
  };
})();
