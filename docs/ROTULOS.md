# Produtos fictícios e versos ilustrativos

BROWTH SUPPLEMENTS é um projeto fictício. As 17 fichas em `public/product-labels.json` e as 17 imagens em `public/assets/backs/` foram **inventadas para a demonstração**. Não representam alimentos fabricados, laudos, composição comercial validada, registro sanitário ou recomendação de consumo.

## Como os dados funcionam

- Cada ID do catálogo possui sua própria ficha: ingredientes, alergênicos declarados, possíveis traços, restrições, valores ilustrativos por porção, preferências alimentares e atributos simulados `free_from`.
- Um único script, `tools/generate-packaging.mjs`, gera o JSON e os versos em SVG a partir das fórmulas fictícias por categoria. Para editar, altere o script e execute `node tools/generate-packaging.mjs`; confira visualmente os SVGs e rode `node tests/profile-filter.mjs`.
- Os tamanhos da mesma linha compartilham fórmula e porção simulada; as três versões de vitaminas têm aroma fictício correspondente ao sabor.
- `demo_complete: true` indica que a ficha simulada está completa para a demonstração. Não significa aprovação, análise de laboratório nem segurança para consumo.
- O filtro só combina restrições com fichas completas e `free_from.<ingrediente> === true`. Um campo desconhecido nunca é interpretado como ausência de alergênico.
- Produtos adicionais no banco sem ficha correspondente exibem “não cadastrado” e não entram nos resultados por restrição alimentar.

A ficha e os versos trazem um aviso visível de que são fictícios. O questionário só organiza categorias e não calcula necessidades, doses ou recomendações médicas. Caso este projeto se torne uma loja real, substitua **todas** as fichas e imagens por informações oficiais verificadas para cada produto e revise composição, restrições e rotulagem com um profissional responsável antes da publicação comercial.

Referências de estrutura de rótulo: [Anvisa — leitura do rótulo](https://www.gov.br/anvisa/pt-br/assuntos/alimentos/suplementos-alimentares/lembre-se-de-ler-o-rotulo-com-atencao) e [Anvisa — perguntas frequentes](https://www.gov.br/anvisa/pt-br/assuntos/alimentos/suplementos-alimentares/perguntas-frequentes/).

