/*
 * Dados da casa que podem mudar.
 * Este é o ÚNICO lugar do site com horário e preços: tudo o que aparece
 * na barra fixa, na seção Visita, no rodapé e no cardápio é lido daqui.
 * Telefone e endereço estão direto no index.html.
 */
window.CASA = {
  mapaEmbed: 'https://www.google.com/maps?q=Castel%C3%B5es%2C+Rua+Jairo+G%C3%B3is%2C+126%2C+Br%C3%A1s%2C+S%C3%A3o+Paulo&output=embed',

  /*
   * HORÁRIO — confirmar com a casa (as fontes públicas divergem).
   * dias: 0 = domingo, 1 = segunda ... 6 = sábado.
   */
  horario: {
    dias: [2, 3, 4, 5, 6, 0],
    abre: '18:00',
    fecha: '23:00',
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
