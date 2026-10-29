# Castelões — proposta de site

Proposta de site da APX Web para a Castelões Cantina e Pizzaria (Brás, São Paulo, desde 1924).
Conceito, sem vínculo oficial com a Castelões.

Publicado em: https://apxweb.github.io/casteloes-proposta/

## Estrutura

Site estático, sem etapa de build. Basta servir a pasta.

```
index.html          página única com as sete cenas
css/estilo.css      tokens, layout e versões para celular e movimento reduzido
js/config.js        HORÁRIO e PREÇOS: o único lugar para editar esses dados
js/fotos.js         lista de fotos por espaço do site (caminho, descrição, crédito)
                    (a cena da pizza usa fotos reais da casa em img/etapa-*.webp e img/pizza-etapa-*.webp)
js/main.js          barra fixa, status aberto/fechado, cenas com GSAP, mapa sob demanda
vendor/             GSAP 3.13 + ScrollTrigger (cópia local)
img/                fotos e ícone
og-image.jpg        imagem de compartilhamento (1200×630)
```

## Como editar

- **Horário:** `js/config.js` → `horario` (dias, abre, fecha). A barra do topo, o status "aberto agora", a tabela da seção Visita e o resumo do rodapé são gerados a partir daí.
- **Telefone e endereço:** direto no `index.html` (barra, Visita, doca do celular e rodapé).
- **Preços:** `js/config.js` → `precos`. Use números (ex.: `98` ou `104.5`). Enquanto o valor for `null`, o item aparece sem preço e o aviso do cabeçalho do cardápio pede para confirmar com a casa.
- **Fotos:** coloque o arquivo em `img/` e edite a entrada em `js/fotos.js`. Espaços sem foto mostram um quadro reservado com a descrição do que falta. O crédito aparece no rodapé automaticamente.

## Ver localmente

```
python -m http.server 5173
```

Depois abra http://127.0.0.1:5173/.

## Publicação

O repositório é publicado pelo GitHub Pages a partir da branch `main`, na raiz. O arquivo `.nojekyll` evita o processamento do Jekyll. A proteção contra indexação é o `<meta name="robots" content="noindex, nofollow">` da página. O `robots.txt` daqui só vale se o site for servido na raiz de um domínio; em apxweb.github.io/casteloes-proposta/ quem manda é o meta.
