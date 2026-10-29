/*
 * Fotos do site. Cada chave corresponde a um espaço marcado com
 * data-foto="..." no index.html. Para trocar ou adicionar uma foto,
 * coloque o arquivo em img/ e edite a entrada correspondente.
 * Espaços sem entrada aqui mostram um quadro reservado.
 *
 *   src      caminho da imagem
 *   alt      descrição para leitores de tela
 *   credito  como aparece no rodapé
 *   foco     ponto focal (object-position), opcional
 *   legenda  texto visível sob a foto, opcional
 */
window.FOTOS = {
  'origem': {
    src: 'img/origem-acervo.webp', largura: 645, altura: 425,
    alt: 'Fotografia antiga em sépia: um garçom de paletó branco serve uma mesa comprida de homens de camisa e gravata.',
    credito: '@cantina_casteloes no Instagram',
    legenda: 'Foto antiga publicada pela casa no Instagram.',
  },
  'forno': {
    src: 'img/forno-lenha.webp', largura: 720, altura: 900,
    alt: 'O forno a lenha aceso: toras queimando sob a abóbada de tijolos.',
    credito: '@cantina_casteloes no Instagram',
    foco: '50% 45%',
  },
  'fabio': {
    src: 'img/fabio-donato.webp', largura: 770, altura: 513,
    alt: 'Fábio Donato, de dólmã branco, sorri no salão mostrando uma pizza de calabresa.',
    credito: 'Ralph Schmidt, via Google Maps',
    foco: '56% 35%',
  },
  'pizza-casteloes': {
    src: 'img/pizza-casteloes.webp', largura: 1100, altura: 1467,
    alt: 'Pizza Castelões na forma de alumínio, coberta de rodelas de calabresa, sobre toalha xadrez verde.',
    credito: '@cantina_casteloes no Instagram',
    foco: '50% 72%',
  },
  'salao-1': {
    src: 'img/salao-neon.webp', largura: 1200, altura: 1600,
    alt: 'Parede do salão com o letreiro em neon, em arco, Cantina Pizzaria Castelões sobre o retrato antigo e as vitrines.',
    credito: 'Vinícius Mello, via Google Maps',
    foco: '50% 30%',
  },
  'salao-2': {
    src: 'img/salao-balcao.webp', largura: 1400, altura: 1050,
    alt: 'Balcão de mármore com caixa registradora antiga, prateleiras de vinhos e embutidos pendurados.',
    credito: 'Geraldo Tarallo, via Google Maps',
  },
  'salao-3': {
    src: 'img/salao-mesas.webp', largura: 720, altura: 960,
    alt: 'Salão antes da abertura: mesas postas com toalhas xadrez vermelha e verde sob os letreiros em neon.',
    credito: '@cantina_casteloes no Instagram',
  },
  'salao-4': {
    src: 'img/salao-bar.webp', largura: 1400, altura: 1050,
    alt: 'Garçom de gravata borboleta atrás do balcão, diante de paredes cobertas de garrafas, relógios e placas antigas.',
    credito: 'Giovani Teixeira Massaro, via Google Maps',
    foco: '55% 40%',
  },
  'fachada': {
    src: 'img/fachada.webp', largura: 1400, altura: 956,
    alt: 'A entrada da Castelões à noite, com a placa de azulejo Cantina Castelões 1924 Pizzaria.',
    credito: 'Castelões, perfil da casa no Google',
    foco: '62% 40%',
  },
};
