/*
 * Dados da casa que podem mudar.
 * Este é o ÚNICO lugar do site com horário e preços: tudo o que aparece
 * na barra fixa, na seção Visita e no cardápio é lido daqui.
 */
window.CASA = {
  telefone: '(11) 3229-0542',
  telefoneLink: 'tel:+551132290542',
  endereco: 'Rua Jairo Góis, 126',
  bairro: 'Brás, São Paulo, SP',
  cep: '03004-010',
  rota: 'https://www.google.com/maps/dir/?api=1&destination=Castel%C3%B5es%2C+Rua+Jairo+G%C3%B3is%2C+126%2C+Br%C3%A1s%2C+S%C3%A3o+Paulo+-+SP%2C+03004-010',
  mapaEmbed: 'https://www.google.com/maps?q=Castel%C3%B5es%2C+Rua+Jairo+G%C3%B3is%2C+126%2C+Br%C3%A1s%2C+S%C3%A3o+Paulo&output=embed',

  /*
   * HORÁRIO — confirmar com a casa (as fontes públicas divergem).
   * dias: 0 = domingo, 1 = segunda ... 6 = sábado.
   */
  horario: {
    dias: [2, 3, 4, 5, 6, 0],
    abre: '18:00',
    fecha: '23:00',
    resumo: 'Terça a domingo, das 18h às 23h',
    curto: 'Ter. a dom., 18h às 23h',
  },

  /*
   * PREÇOS — preencha com o valor em reais (ex.: 98 ou 104.5).
   * Enquanto estiver null, o cardápio mostra "consulte".
   */
  precos: {
    'pizza-casteloes': null,
    'margherita': null,
    'napolitana': null,
    'escarola': null,
    'aliche': null,
    'espaguete-casteloes': null,
  },
};
