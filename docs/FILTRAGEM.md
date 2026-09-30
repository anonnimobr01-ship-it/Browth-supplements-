# Filtragem do catálogo

## Ativação no Supabase

Execute `database/004_catalog_filters.sql` no SQL Editor do projeto já utilizado pela loja. O script é transacional e pode ser repetido. Cria apenas `products.catalog_attributes` (JSONB), preenche objetos vazios para os 17 IDs existentes e preserva dados já cadastrados. Não cria produtos, altera preço/estoque, RLS, credenciais ou dados pessoais.

As fichas anteriores foram transferidas como dados de referência deste catálogo, sem validação de fabricante. Açúcar, avaliações, vendas e datas de lançamento desconhecidas não são inventados. O script só declara ausência de açúcar na composição de creatina pura. Produtos novos devem receber atributos explícitos no Table Editor. A API funciona antes da migração, mas produtos sem atributos não atendem a restrições específicas.

## Atributos reutilizados

`composition`, `allergens.contains`, `allergens.may_contain`, `free_from.lactose`, `free_from.gluten`, `diet.vegan`, `diet.vegetarian`, `nutrition`, `restrictions`, `back_image` reutilizam as fichas existentes. Acrescentam-se `brand`, `format`, `flavors`, `flavor_names`, `contains_caffeine`, `contains_sugar`, `objectives` e `sports`. Campos opcionais: `rating` (0–5), `sales` (inteiro), `launched_at` (ISO), `list_price_cents` (preço anterior). Ausência de campo significa desconhecido.

Preço vigente e checkout usam sempre `products.price_cents`. Para mostrar promoção, cadastre o preço anterior em `catalog_attributes.list_price_cents` e o preço vigente em `price_cents`. Nunca mantenha um preço promocional só no navegador.

## Regras

Oito perguntas, uma por tela: objetivo, esporte, categoria, restrições, ingredientes, formato, sabor, preço. Restrições e ingredientes são cumulativos. Nenhuma/Nenhum desmarca as demais escolhas. Fatos não declarados não atendem a um filtro rígido. Possíveis traços de glúten/lactose também excluem o produto. Produtos inativos são removidos; esgotados podem ser vistos, mas não adicionados ao carrinho.

Categoria +3, objetivo +2, esporte +2, formato +1 e sabor +1 organizam os resultados. Categoria, objetivo, esporte, formato e sabor são preferências; não superam restrições ou preço. A categoria ausente gera mensagem clara sobre outras categorias. As associações são editoriais e não são alegações de benefício esportivo ou recomendação de consumo. Não há perguntas sobre idade, doenças, diagnóstico, dose, emagrecimento ou alteração corporal. A mesma navegação pelas características do catálogo está disponível a qualquer usuário.

A página Catálogo tem filtros manuais rígidos de categoria, preço, marca, sabor, formato, restrições, disponibilidade e avaliação, além de busca e seis ordenações. Sem vendas, avaliações ou lançamentos cadastrados, a ordenação avisa e usa nome; não fabrica métricas.

A API PHP consulta o Supabase com categoria/preço/atividade e percorre páginas de 500 produtos. Os atributos públicos são retornados para restrições e ordenação em JavaScript. Chaves Supabase permanecem no backend. Nenhum serviço de IA é usado. `?demo=1` usa apenas o fixture local; produção nunca troca o banco pelo fixture.

## Verificação

`node --check public/js/app.js`

`node tests/profile-filter.mjs`

Após aplicar SQL, teste sem lactose + vegano + sem cafeína + R$50–100: o catálogo inicial possui 4 versões. Sem açúcar só retorna dados com ausência explicitamente cadastrada.
